/**
 * La politique de sécurité du contenu (en-tête `Content-Security-Policy`),
 * d'après le guide « Content Security Policy » de la doc Next.js
 * (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 *
 * Deux versions, selon la façon dont la page est rendue :
 *
 * - Pages rendues à chaque visite (`/analyse/[id]`, `/v/[shareId]`, `/admin`) :
 *   un nonce neuf par requête, posé par `src/proxy.ts`. Next.js le lit dans
 *   l'en-tête de la requête et l'attache lui-même à ses scripts. Un script
 *   injecté, sans nonce, ne s'exécute pas ; `'strict-dynamic'` laisse passer
 *   les seuls scripts chargés par un script de confiance (les morceaux de
 *   Next.js). Ce sont les pages qui affichent des données enregistrées (un
 *   devis lu, un partage public) ou un accès réservé.
 * - Pages statiques (accueil, dépôt, pages légales…) : générées au build, sans
 *   requête, donc sans nonce possible. Next.js y écrit des scripts en ligne
 *   (`self.__next_f.push(…)`, différents à chaque build) : `'unsafe-inline'`
 *   reste nécessaire. Ces pages n'affichent aucune donnée enregistrée ; sur
 *   `/analyse`, le résultat en direct est celui du devis que le visiteur vient
 *   d'envoyer, rendu par React (texte échappé, aucun HTML brut sur le site).
 *   Un nonce partout rendrait toutes les pages dynamiques (plus de cache CDN,
 *   un rendu serveur à chaque visite), et l'option SRI expérimentale ne couvre
 *   que les scripts externes, pas ces scripts en ligne.
 *
 * Communes aux deux : tout vient du site lui-même, aucun script, style, police
 * ou appel tiers (la mesure part du serveur). `style-src 'unsafe-inline'`
 * reste : Motion et Next.js écrivent des attributs `style`, qu'un nonce ne
 * couvre pas (et un nonce dans `style-src` ferait ignorer `'unsafe-inline'`).
 * `blob:` : aperçus des photos déposées ; `data:` : images en ligne, comme dans
 * l'exemple de la doc. `'unsafe-eval'` seulement en développement : React s'en
 * sert pour ses traces d'erreur, ni React ni Next.js en production.
 *
 * Module pur, sans alias ni dépendance : `next.config.ts` le charge hors de
 * Next.js, `src/proxy.ts` à chaque requête.
 */

/** Octets aléatoires d'un nonce : 128 bits, comme les identifiants d'analyse. */
const NONCE_BYTES = 16;

/**
 * Forme d'un nonce que Next.js sait relire dans l'en-tête de la requête
 * (`get-script-nonce-from-header.js`) : sinon il l'ignore sans rien dire, et la
 * politique stricte bloque ses propres scripts. Garde aussi l'en-tête de toute
 * injection (pas de `;`, pas d'espace, pas de guillemet).
 */
export const NONCE_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/;

/** Un nonce neuf (base64), imprévisible : un par requête, jamais réutilisé. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  return btoa(String.fromCharCode(...bytes));
}

export type PolicyOptions = {
  /** `next dev` : `'unsafe-eval'` en plus (rechargement à chaud, traces d'erreur de React). */
  readonly dev: boolean;
  /** Le nonce de la requête (page rendue à chaque visite) ; sans lui, la politique des pages statiques. */
  readonly nonce?: string;
};

/** La valeur de l'en-tête `Content-Security-Policy`. */
export function contentSecurityPolicy({ dev, nonce }: PolicyOptions): string {
  if (nonce !== undefined && !NONCE_PATTERN.test(nonce)) {
    throw new Error("Nonce de la politique de contenu mal formé.");
  }
  const scripts = nonce ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"] : ["'self'", "'unsafe-inline'"];
  if (dev) scripts.push("'unsafe-eval'");
  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
