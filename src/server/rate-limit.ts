import "server-only";
import { createHmac } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { limits } from "@/config/limits";
import { getDb, type Database } from "@/server/db/client";
import { rateLimits } from "@/server/db/schema";
import { isProductionDeployment, serverEnv } from "@/server/env";

/**
 * Limite d'analyses par jour et par adresse IP, comptée dans Postgres.
 *
 * L'adresse n'est jamais stockée : seulement un HMAC du jour et de l'adresse,
 * avec un secret serveur. Impossible de retrouver l'IP, ni de relier deux
 * jours entre eux. Une analyse qui échoue de notre fait est rendue.
 *
 * Sans base (développement, préversion), un compteur en mémoire prend le
 * relais. En production, jamais : sans base ni secret, l'analyse est fermée
 * plutôt qu'ouverte sans limite.
 */

export interface QuotaTicket {
  readonly key: string;
  readonly day: string;
}

export type QuotaCheck =
  | { readonly kind: "allowed"; readonly remaining: number; readonly ticket: QuotaTicket }
  | { readonly kind: "limited" }
  | { readonly kind: "unavailable"; readonly reason: "no-database" | "no-secret" };

export interface QuotaStore {
  /** Compte une analyse ; renvoie le nouveau total, ou `null` si la limite est atteinte. */
  consume(key: string, day: string, limit: number): Promise<number | null>;
  refund(key: string, day: string): Promise<void>;
  purgeBefore(day: string): Promise<void>;
}

export function createDatabaseQuotaStore(db: Database): QuotaStore {
  return {
    async consume(key, day, limit) {
      // Une seule requête atomique : deux envois simultanés ne passent pas tous les deux.
      const rows = await db
        .insert(rateLimits)
        .values({ key, day, count: 1 })
        .onConflictDoUpdate({
          target: [rateLimits.key, rateLimits.day],
          set: { count: sql`${rateLimits.count} + 1` },
          setWhere: sql`${rateLimits.count} < ${limit}`,
        })
        .returning({ count: rateLimits.count });
      return rows[0]?.count ?? null;
    },
    async refund(key, day) {
      await db
        .update(rateLimits)
        .set({ count: sql`greatest(${rateLimits.count} - 1, 0)` })
        .where(and(eq(rateLimits.key, key), eq(rateLimits.day, day)));
    },
    async purgeBefore(day) {
      await db.delete(rateLimits).where(lt(rateLimits.day, day));
    },
  };
}

export function createMemoryQuotaStore(): QuotaStore {
  const counts = new Map<string, { readonly day: string; count: number }>();
  const id = (key: string, day: string) => `${day}|${key}`;
  return {
    async consume(key, day, limit) {
      const entry = counts.get(id(key, day)) ?? { day, count: 0 };
      if (entry.count >= limit) return null;
      entry.count += 1;
      counts.set(id(key, day), entry);
      return entry.count;
    },
    async refund(key, day) {
      const entry = counts.get(id(key, day));
      if (entry && entry.count > 0) entry.count -= 1;
    },
    async purgeBefore(day) {
      for (const [entryId, entry] of counts) {
        if (entry.day < day) counts.delete(entryId);
      }
    },
  };
}

/** Jour calendaire à Paris, « 2026-10-03 » : le compteur repart à minuit, heure française. */
export function parisDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function quotaKey(ip: string, day: string, secret: string): string {
  return createHmac("sha256", secret).update(`${day}|${ip}`).digest("base64url").slice(0, 32);
}

/** Secret de développement : ne protège rien, il évite seulement d'exiger une variable en local. */
const DEVELOPMENT_SECRET = "loupe-developpement-secret-non-confidentiel";

const holder = globalThis as typeof globalThis & { __loupeMemoryQuota?: QuotaStore };

function resolveStore(): QuotaStore | null {
  const db = getDb();
  if (db) return createDatabaseQuotaStore(db);
  if (isProductionDeployment()) return null;
  holder.__loupeMemoryQuota ??= createMemoryQuotaStore();
  return holder.__loupeMemoryQuota;
}

function resolveSecret(): string | null {
  const secret = serverEnv().IP_HASH_SECRET;
  if (secret) return secret;
  return isProductionDeployment() ? null : DEVELOPMENT_SECRET;
}

export async function consumeAnalysisQuota(
  ip: string,
  now: Date = new Date(),
  store: QuotaStore | null = resolveStore(),
): Promise<QuotaCheck> {
  if (!store) return { kind: "unavailable", reason: "no-database" };
  const secret = resolveSecret();
  if (!secret) return { kind: "unavailable", reason: "no-secret" };
  const day = parisDay(now);
  const key = quotaKey(ip, day, secret);
  const count = await store.consume(key, day, limits.analysesPerDay);
  if (count === null) return { kind: "limited" };
  return { kind: "allowed", remaining: limits.analysesPerDay - count, ticket: { key, day } };
}

/** Rend une analyse qui a échoué de notre fait. */
export async function refundAnalysisQuota(
  ticket: QuotaTicket,
  store: QuotaStore | null = resolveStore(),
): Promise<void> {
  await store?.refund(ticket.key, ticket.day);
}

/** Efface les compteurs d'avant-hier et plus anciens. */
export async function purgeExpiredQuotas(
  now: Date = new Date(),
  store: QuotaStore | null = resolveStore(),
): Promise<void> {
  const yesterday = parisDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  await store?.purgeBefore(yesterday);
}
