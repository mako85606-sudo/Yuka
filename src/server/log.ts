import "server-only";

/**
 * Résumé d'une erreur pour les journaux : son nom et ses codes techniques
 * (« DrizzleQueryError · PostgresError · 57P01 »), en remontant ses causes.
 * Jamais son message ni ses paramètres : drizzle y recopie la requête et ses
 * valeurs (adresses email, identifiants privés, contenu d'un devis), et un
 * journal d'hébergeur n'est pas un endroit pour des données personnelles.
 */
export function errorSummary(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth += 1) {
    const { name, code, status } = current as { name?: unknown; code?: unknown; status?: unknown };
    if (typeof name === "string" && /^[A-Za-z]{1,60}$/.test(name)) parts.push(name);
    if (typeof code === "string" && /^[A-Z0-9_]{2,40}$/i.test(code)) parts.push(code);
    if (typeof status === "number") parts.push(String(status));
    current = (current as { cause?: unknown }).cause;
  }
  return parts.length > 0 ? [...new Set(parts)].join(" · ") : "erreur inconnue";
}
