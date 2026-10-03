import "server-only";
import { maskEmail, type SignupSource } from "@/lib/signup";

export interface SignupRecord {
  readonly email: string;
  readonly source: SignupSource;
}

export type SaveSignupResult = { readonly ok: true } | { readonly ok: false; readonly reason: "not-configured" };

/**
 * Enregistre une inscription.
 *
 * La base Postgres arrive à l'étape 3 : d'ici là, rien n'est stocké. En
 * développement, l'inscription est simulée et signalée dans le terminal (adresse
 * masquée). En production, on répond honnêtement que l'inscription n'est pas
 * encore ouverte plutôt que de prétendre l'avoir gardée.
 */
export async function saveSignup(record: SignupRecord): Promise<SaveSignupResult> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[inscription simulée] ${maskEmail(record.email)} (source : ${record.source}) : rien n'est enregistré avant l'étape 3.`,
    );
    return { ok: true };
  }
  return { ok: false, reason: "not-configured" };
}
