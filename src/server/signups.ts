import "server-only";
import { maskEmail, type SignupSource } from "@/lib/signup";
import { lt } from "drizzle-orm";
import { limits } from "@/config/limits";
import { getDb, type Database } from "@/server/db/client";
import { signups } from "@/server/db/schema";
import { developmentFallbacksAllowed } from "@/server/env";
import { errorSummary } from "@/server/log";

export interface SignupRecord {
  readonly email: string;
  readonly source: SignupSource;
}

export type SaveSignupResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "not-configured" | "error" };

/**
 * Enregistre une inscription : l'adresse, sa source et la date, rien d'autre.
 * Une adresse déjà inscrite n'est pas dupliquée.
 *
 * Sans base (`DATABASE_URL` absente), l'inscription est simulée en
 * développement et signalée dans le terminal, adresse masquée. Ailleurs, on
 * répond honnêtement qu'elle n'est pas encore ouverte plutôt que de prétendre
 * l'avoir gardée.
 */
export async function saveSignup(
  record: SignupRecord,
  db: Database | null = getDb(),
): Promise<SaveSignupResult> {
  if (db) {
    try {
      await db
        .insert(signups)
        .values({ email: record.email, source: record.source })
        .onConflictDoNothing({ target: signups.email });
      return { ok: true };
    } catch (error) {
      console.error(`[inscription] échec pour ${maskEmail(record.email)} : ${errorSummary(error)}`);
      return { ok: false, reason: "error" };
    }
  }
  if (developmentFallbacksAllowed()) {
    console.info(
      `[inscription simulée] ${maskEmail(record.email)} (source : ${record.source}) : aucune base configurée (DATABASE_URL), rien n'est enregistré.`,
    );
    return { ok: true };
  }
  return { ok: false, reason: "not-configured" };
}

/**
 * Efface les inscriptions de plus de `limits.signupRetentionYears` ans (CNIL :
 * trois ans au plus après le dernier contact venant de la personne).
 */
export async function purgeOldSignups(db: Database, now: Date = new Date()): Promise<void> {
  const limit = new Date(now);
  limit.setUTCFullYear(limit.getUTCFullYear() - limits.signupRetentionYears);
  await db.delete(signups).where(lt(signups.createdAt, limit));
}
