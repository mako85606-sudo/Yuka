/**
 * Typographie française : une espace insécable avant « ? ! : ; », « % » et
 * « € », à l'intérieur des guillemets, et entre un nombre et son unité
 * (« 200 L », « 16 A »), pour qu'un signe ou une unité ne parte jamais seul à
 * la ligne. On utilise l'espace insécable classique (U+00A0), présente dans
 * toutes les polices du site.
 */

const NBSP = "\u00a0";

const UNITS = "(?:L|kW|W|kVA|mA|A|V|mm²|m²|m³|mm|cm|ml|m|kg|g|h|min|km|°C|Ko|Mo)";
const NUMBER_UNIT = new RegExp(`(\\d) (${UNITS})(?=$|[\\s,.;:!?)/])`, "g");

export function fr(text: string): string {
  return text
    .replace(/ ([?!:;%€»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(NUMBER_UNIT, `$1${NBSP}$2`);
}
