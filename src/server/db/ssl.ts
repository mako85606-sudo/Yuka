/**
 * Chiffrement des connexions à Postgres, partagé par le site
 * (`src/server/db/client.ts`) et le script de migrations
 * (`scripts/migrate.ts`). Ni `server-only` ni alias `@/` : le script le
 * charge hors de Next.js.
 */

/** Modes `sslmode` qui vérifient le certificat du serveur, pas seulement le chiffrement. */
const VERIFYING_MODES = new Set(["verify-full", "verify-ca"]);

function isLocal(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

/**
 * Chiffrement de la connexion, à passer à postgres.js. Vers une base locale
 * (développement) : aucun, elle n'a en général pas de certificat. Vers une
 * base distante : au moins `require` (chiffré). Si l'adresse demande déjà la
 * vérification du certificat (`sslmode=verify-full`, `sslrootcert=system`),
 * on ne passe aucune option : une option `ssl` explicite l'emporterait sur
 * l'adresse, et `require` n'en vérifie pas le certificat.
 */
export function sslOption(url: string): { readonly ssl?: "require" | false } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ssl: "require" };
  }
  if (isLocal(parsed.hostname)) return { ssl: false };
  const mode = parsed.searchParams.get("sslmode");
  if ((mode !== null && VERIFYING_MODES.has(mode)) || parsed.searchParams.get("sslrootcert") === "system") return {};
  return { ssl: "require" };
}
