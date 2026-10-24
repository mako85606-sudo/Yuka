/**
 * Dernier filet avant tout affichage ou stockage d'un texte lu sur un devis
 * (libellé de ligne, objet). Le modèle a pour consigne de ne recopier aucune
 * donnée personnelle ; ce filtre retire en plus ce qui a une forme
 * reconnaissable : e-mails, adresses web, téléphones, immatriculations,
 * numéros de série de véhicule, IBAN, numéros de TVA, références de client ou
 * de dossier, numéros longs (SIRET), adresses postales, civilités suivies
 * d'un nom.
 *
 * Il ne prétend pas tout attraper (un nom seul ne se reconnaît pas à sa
 * forme) : c'est une ceinture, la consigne donnée au modèle reste les
 * bretelles.
 */

export const REDACTED = "[…]";

const CIVILITY =
  "(?:M\\.?|Mme\\.?|MME|Mlle\\.?|MLLE|Mr\\.?|MR|Dr\\.?|Docteur|Me|Maître|Maitre|Monsieur|MONSIEUR|Madame|MADAME|Mademoiselle|MADEMOISELLE|Famille|FAMILLE|Chez)";
const NAME_WORD = "[A-ZÀ-Ý][\\p{L}'’-]*";
/** Un nom de une à quatre parties, particules comprises (« Jean-Pierre DE LA FONTAINE »). */
const FULL_NAME = `${NAME_WORD}(?:\\s+(?:(?:de|du|des|le|la|DE|DU|DES|LE|LA|d'|D')\\s*)?${NAME_WORD}){0,3}`;

const PATTERNS: readonly RegExp[] = [
  // E-mails (partie locale bornée : pas de recherche interminable sur un texte piégé)
  /[\p{L}\p{N}._%+-]{1,64}@[\p{L}\p{N}-]{1,63}(?:\.[\p{L}\p{N}-]{1,63})+/gu,
  // Adresses web et noms de domaine : « https://… », « www.… », « exemple.fr »
  /\b(?:https?:\/\/|www\.)[^\s,;()]+/giu,
  /\b[\p{L}\p{N}-]{2,63}\.(?:fr|com|net|org|eu|io|info|biz|be|ch|ly|co)\b(?:\/[^\s,;()]*)?/giu,
  // IBAN, compact ou par groupes de quatre, et numéro de TVA intracommunautaire
  /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,3})?\b/g,
  /\bFR\s?[0-9A-Z]{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/g,
  // Numéro de série d'un véhicule (VIN, 17 caractères, chiffres et lettres sans I, O, Q)
  /\b(?=[A-HJ-NPR-Z0-9]*\d)(?=[A-HJ-NPR-Z0-9]*[A-HJ-NPR-Z])[A-HJ-NPR-Z0-9]{17}\b/gi,
  // Références de client, de contrat, de dossier : « N° client 456789 », « Réf. client 12-345-678 »
  /\b(?:n°|no\.|num(?:éro)?\.?|réf\.?|référence)\s*(?:client|contrat|dossier|commande)?\s*:?\s*[A-Z0-9][A-Z0-9/.-]{3,}/giu,
  /\b(?:client|contrat|dossier)\s*(?:n°|no\.?)?\s*:?\s*\d[\d/.-]{3,}/giu,
  // Téléphones français : 06 12 34 56 78, 06.12.34.56.78, +33 6 12 34 56 78
  /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/g,
  // Immatriculations : AB-123-CD, AB 123 CD, ab-123-cd, et l'ancien format 1234 AB 56
  /\b[A-Z]{2}[\s-]?\d{3}[\s-]?[A-Z]{2}\b/g,
  /\b[a-z]{2}-\d{3}-[a-z]{2}\b/g,
  /\b\d{1,4}[\s-][A-Z]{2,3}[\s-](?:\d{2}|2[AB]|97\d)\b/g,
  // Adresses : « 12 bis, rue des Lilas », « 3 av. Foch », « 12 r. de la Paix », « 28 Grande Rue »
  /\b\d{1,4}\s?(?:bis|ter)?,?\s+(?:rue|r\.|avenue|av\.|boulevard|bd|chemin|allée|impasse|imp\.|place|pl\.|route|rte|quai|cours|square|lotissement|lot\.|résidence|grande rue|grand'rue)(?=[\s,]|$)[^,;()\n]*/giu,
  // Résidence nommée, appartement : « Résidence Les Tilleuls », « apt 12 »
  /\b(?:[Rr]ésidence|[Rr]és\.)\s+(?:(?:[Ll]es?|[Ll]a|[Ll]'|[Dd]es)\s*)?[A-ZÀ-Ý][\p{L}'’-]*(?:\s+[A-ZÀ-Ý][\p{L}'’-]*)*/gu,
  /\b(?:apt|appt)\.?\s*\d+\b/giu,
  // Code postal suivi d'une ville : « 69003 Lyon », « 42000 SAINT-ETIENNE », « 20000 Ajaccio »
  /\b(?:\d{5}|2[AB]\d{3})\s+[A-ZÀ-Ý][\p{L}'’-]{2,}(?:[\s-]+[A-ZÀ-Ý][\p{L}'’-]*)*/gu,
  // … ou d'une ville en minuscules, en fin de texte ou avant une ponctuation : « 75019 paris »
  /\b(?:\d{5}|2[AB]\d{3})\s+[a-zà-ÿ][\p{L}'’-]{3,}(?=\s*(?:$|[,;)]))/gu,
  // Couple : « M. et Mme Dupont »
  new RegExp(`\\b(?:M\\.?|Monsieur)\\s+(?:et|&)\\s+(?:Mme\\.?|Madame)\\s+${FULL_NAME}`, "gu"),
  // « Client : Jean Dupont »
  new RegExp(`\\b(?:Client|CLIENT)\\s*:\\s*${FULL_NAME}`, "gu"),
  // Civilité suivie d'un nom : « M. Dupont », « Mme Camille Martin », « Famille Dupont », « Chez Dupont »
  new RegExp(`\\b${CIVILITY}\\s+${FULL_NAME}`, "gu"),
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
