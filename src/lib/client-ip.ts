/**
 * Qui pose les en-têtes d'adresse, et donc lequel croire :
 * - `platform` : Vercel, qui écrase `x-real-ip` et `x-forwarded-for` (et le
 *   développement) ; la première adresse est celle du visiteur ;
 * - `proxy` : un relais déclaré par `TRUSTED_PROXY=true`, qui ajoute à la fin
 *   de `x-forwarded-for` l'adresse qui l'a contacté. Ce qui précède vient du
 *   visiteur et peut être inventé : seule la dernière adresse compte ;
 * - `null` : aucun relais de confiance. N'importe quel client pourrait
 *   inventer ces en-têtes pour contourner la limite quotidienne.
 */
export type ProxyKind = "platform" | "proxy";

export function trustedProxy(env: NodeJS.ProcessEnv = process.env): ProxyKind | null {
  if (env.VERCEL === "1" || env.NODE_ENV === "development" || env.NODE_ENV === "test") return "platform";
  if (env.TRUSTED_PROXY === "true") return "proxy";
  return null;
}

/** Vrai si un relais de confiance pose les en-têtes d'adresse. */
export function proxyHeadersTrusted(env: NodeJS.ProcessEnv = process.env): boolean {
  return trustedProxy(env) !== null;
}

/** Clé commune quand l'adresse n'est pas fiable : tout le monde partage la même limite. */
export const UNKNOWN_CLIENT = "inconnu";

/**
 * Adresse du visiteur, pour les limites quotidiennes uniquement (elle n'est
 * jamais stockée en clair). En local, sans en-tête, tout le monde partage la
 * même clé.
 */
export function clientIp(headers: Headers, proxy: ProxyKind | null = trustedProxy()): string {
  if (proxy === null) return UNKNOWN_CLIENT;
  const forwarded = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (proxy === "proxy") return normalizeIp(forwarded.at(-1) || headers.get("x-real-ip")?.trim() || "local");
  return normalizeIp(headers.get("x-real-ip")?.trim() || forwarded[0] || "local");
}

/** Développe une adresse IPv6 abrégée (« 2001:db8::1 ») en huit groupes. */
function expandIpv6(address: string): string[] | null {
  const [head = "", tail, extra] = address.split("::");
  if (extra !== undefined) return null;
  const left = head === "" ? [] : head.split(":");
  const right = tail === undefined || tail === "" ? [] : tail.split(":");
  const missing = 8 - left.length - right.length;
  if (tail === undefined ? missing !== 0 : missing < 1) return null;
  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  return groups.every((group) => /^[0-9a-f]{1,4}$/i.test(group)) ? groups : null;
}

/**
 * IPv4 telle quelle ; IPv6 ramenée à son préfixe /64 (un abonné dispose en
 * général de tout un /64, il ne doit pas multiplier ses analyses en changeant
 * d'adresse) ; IPv4 encapsulée dans IPv6 rendue en IPv4.
 */
export function normalizeIp(raw: string): string {
  const ip = raw.trim().replace(/^\[|\]$/g, "").split("%")[0] ?? "";
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  if (!ip.includes(":")) return ip;
  const groups = expandIpv6(ip);
  if (!groups) return ip.toLowerCase();
  return `${groups
    .slice(0, 4)
    .map((group) => group.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
