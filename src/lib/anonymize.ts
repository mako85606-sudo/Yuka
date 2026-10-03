/**
 * Dernier filet avant tout affichage ou stockage d'un texte lu sur un devis
 * (libellé de ligne, objet). Le modèle a pour consigne de ne recopier aucune
 * donnée personnelle ; ce filtre retire en plus ce qui a une forme
 * reconnaissable : e-mails, téléphones, immatriculations, numéros longs
 * (SIRET, références client), adresses postales, civilités suivies d'un nom.
 *
 * Il ne prétend pas tout attraper (un nom seul ne se reconnaît pas à sa
 * forme) : c'est une ceinture, la consigne donnée au modèle reste les
 * bretelles.
 */

export const REDACTED = "[…]";

const CIVILITY =
  "(?:M\\.|Mme|MME|Mlle|MLLE|Mr|MR|Monsieur|MONSIEUR|Madame|MADAME|Mademoiselle|MADEMOISELLE)";
const NAME_WORD = "[A-ZÀ-Ý][\\p{L}'’-]*";

const PATTERNS: readonly RegExp[] = [
  // E-mails
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu,
  // Téléphones français : 06 12 34 56 78, 06.12.34.56.78, +33 6 12 34 56 78
  /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g,
  // Immatriculations : AB-123-CD, AB 123 CD, et l'ancien format 1234 AB 56
  /\b[A-Z]{2}[\s-]?\d{3}[\s-]?[A-Z]{2}\b/g,
  /\b\d{1,4}[\s-][A-Z]{2,3}[\s-](?:\d{2}|2[AB]|97\d)\b/g,
  // Adresses : « 12 bis, rue des Lilas », « 3 avenue Foch »
  /\b\d{1,4}\s?(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|chemin|allée|impasse|place|route|quai|cours|square|lotissement|résidence)\b[^,;()\n]*/giu,
  // Code postal suivi d'une ville : « 69003 Lyon », « 42000 SAINT-ETIENNE »
  /\b\d{5}\s+[A-ZÀ-Ý][\p{L}'’-]{2,}(?:[\s-]+[A-ZÀ-Ý][\p{L}'’-]*)*/gu,
  // Civilité suivie d'un nom : « M. Dupont », « Mme Camille Martin »
  new RegExp(`\\b${CIVILITY}\\s+${NAME_WORD}(?:\\s+${NAME_WORD})?`, "gu"),
  // Suites de 7 chiffres ou plus, espacées ou non (SIRET, numéros de série ou de client)
  /\b\d(?:[\s.]?\d){6,}\b/g,
];

/** Retire les données personnelles reconnaissables d'un texte court. */
export function anonymizeText(text: string): string {
  let result = text;
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result
    .replace(/(?:\[…\][\s,;:-]*){2,}/g, `${REDACTED} `)
    .replace(/\s+/g, " ")
    // Pas d'espace avant une virgule, un point ou une parenthèse fermante ; celui
    // qui précède « : » ou « ; » reste (typographie française).
    .replace(/\s+([,.)])/g, "$1")
    .trim();
}

/** Vrai si le texte contient encore une donnée personnelle reconnaissable. */
export function containsPersonalData(text: string): boolean {
  return PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    const found = pattern.test(text);
    pattern.lastIndex = 0;
    return found;
  });
}
