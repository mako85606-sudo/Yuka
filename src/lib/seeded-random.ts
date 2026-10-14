/**
 * Hasard déterministe : même graine, même suite de nombres.
 *
 * Les tracés « à la main » (cercle rouge, surligneur, tampon) en dépendent pour
 * garder exactement le même coup de crayon d'un rendu à l'autre : rendu
 * serveur, hydratation, rechargement de la page.
 */

export type Random = () => number;

/** Hash 32 bits non signé d'une chaîne (variante de cyrb53). */
export function hashString(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/**
 * Générateur pseudo-aléatoire mulberry32 : rapide, 32 bits, largement
 * suffisant pour du dessin. Renvoie des nombres dans [0, 1).
 */
export function createRandom(seed: string | number): Random {
  let state = typeof seed === "number" ? seed >>> 0 : hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nombre uniforme dans [min, max). */
export function between(random: Random, min: number, max: number): number {
  return min + (max - min) * random();
}

/** Renvoie -1 ou 1 avec la même probabilité. */
export function randomSign(random: Random): -1 | 1 {
  return random() < 0.5 ? -1 : 1;
}
