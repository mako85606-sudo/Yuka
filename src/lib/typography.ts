/**
 * Typographie française : une espace insécable avant « ? ! : ; », « % » et
 * « € », et à l'intérieur des guillemets, pour qu'un signe ne parte jamais seul
 * à la ligne. On utilise l'espace insécable classique (U+00A0), présente dans
 * toutes les polices du site.
 */

const NBSP = " ";

export function fr(text: string): string {
  return text
    .replace(/ ([?!:;%€»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`);
}
