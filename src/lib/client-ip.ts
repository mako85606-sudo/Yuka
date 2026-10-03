/**
 * Adresse du visiteur, pour la limite quotidienne uniquement (elle n'est
 * jamais stockée en clair). Derrière Vercel, `x-real-ip` et
 * `x-forwarded-for` sont posés par la plateforme. En local, sans en-tête,
 * tout le monde partage la même clé.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return normalizeIp(real || forwarded || "local");
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
