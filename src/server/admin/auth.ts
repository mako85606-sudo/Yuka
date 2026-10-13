import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { limits } from "@/config/limits";
import { serverEnv } from "@/server/env";

/**
 * Accès à `/admin` : un mot de passe (`ADMIN_PASSWORD`, 16 caractères au
 * moins), puis un cookie de session signé (HMAC du mot de passe), valable
 * quelques heures. Changer le mot de passe ferme toutes les sessions. Sans
 * mot de passe configuré, `/admin` reste fermé.
 */

export const ADMIN_COOKIE = "loupe_admin";
export const ADMIN_PATH = "/admin";

export function adminPassword(): string | null {
  return serverEnv().ADMIN_PASSWORD ?? null;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Comparaison à temps constant : la durée ne trahit pas les bons caractères. */
export function passwordMatches(candidate: string, password: string): boolean {
  return timingSafeEqual(digest(candidate), digest(password));
}

function signature(password: string, expiresAt: number): string {
  return createHmac("sha256", password).update(`loupe-admin:${expiresAt}`).digest("base64url");
}

export function createSessionToken(password: string, now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + limits.adminSessionHours * 60 * 60 * 1000;
  return { token: `${expiresAt}.${signature(password, expiresAt)}`, expiresAt };
}

export function verifySessionToken(token: string | undefined, password: string, now = Date.now()): boolean {
  if (!token) return false;
  const [rawExpiry, mac] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!mac || !Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  const expected = Buffer.from(signature(password, expiresAt));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Vrai si la requête porte une session `/admin` valide. */
export async function isAdmin(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  return verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value, password);
}
