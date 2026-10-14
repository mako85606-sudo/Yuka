import { checksConfig } from "@/config/checks";
import { UNIT_SYMBOLS } from "@/config/taxonomy";
import { verdictConfig } from "@/config/verdict";
import type { Finding, PriceOpinion, RuleId } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { formatEuros, formatQuantity, formatRate, formatShortDate } from "@/lib/format";
import { roundCents } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";

/**
 * Message à envoyer à l'artisan, en version email et SMS.
 *
 * Il ne s'appuie que sur ce qui est vérifié : un calcul faux, une mention
 * absente, un acompte élevé, une ligne à détailler, et les prix comparés à la
 * base Loupe (des devis réels, jamais une estimation IA). Un constat sur des
 * chiffres mal lus n'y figure pas. Ton : poli, factuel, sans accusation ; on
 * pose des questions, on propose, on ne reproche rien. Vouvoiement : c'est un
 * message à un professionnel.
 */

export interface NegotiationInput {
  readonly extraction: Extraction;
  readonly findings: readonly Finding[];
  readonly prices: readonly PriceOpinion[];
}

export interface NegotiationMessage {
  readonly email: { readonly subject: string; readonly body: string };
  readonly sms: string;
}

interface Point {
  /** Phrase complète, pour l'email. */
  readonly long: string;
  /** Version courte, pour le SMS. */
  readonly short: string;
  /** Vrai si le point appelle un devis corrigé. */
  readonly needsCorrection: boolean;
}

/** Ce que le devis ne dit pas, comme on le demanderait à l'artisan. */
const MISSING: Partial<Record<RuleId, string>> = {
  "mention-company-name": "le nom de votre entreprise",
  "mention-address": "l'adresse de votre entreprise",
  "mention-siret": "votre numéro SIRET",
  "mention-date": "la date du devis",
  "mention-validity": "sa durée de validité",
  "mention-client": "mes coordonnées et l'adresse des travaux",
};

const SMS_MAX_POINTS = 3;
const SMS_LABEL_MAX = 38;

function quoted(label: string, max = Infinity): string {
  const text = label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label;
  return `« ${text} »`;
}

function euros(value: number): string {
  return formatEuros(value, Number.isInteger(value) ? 0 : 2);
}

/** « A, B et C ». */
function joinFrench(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

function calculationPoint(extraction: Extraction, finding: Finding): Point | null {
  const line = finding.lineIndex === undefined ? undefined : extraction.lines[finding.lineIndex];
  if (!line || line.quantity === undefined || line.unitPriceHT === undefined || line.totalHT === undefined) return null;
  const expected = roundCents(line.quantity * line.unitPriceHT);
  const operation = `${formatQuantity(line.quantity)} × ${euros(line.unitPriceHT)} font ${euros(expected)}, et non ${euros(line.totalHT)}`;
  return {
    long: `Ligne ${quoted(line.label)} : il me semble que ${operation}.`,
    short: `ligne ${quoted(line.label, SMS_LABEL_MAX)} : ${operation}`,
    needsCorrection: true,
  };
}

const TOTAL_NAMES: Partial<Record<RuleId, { readonly name: string; readonly short: string; readonly basis: string }>> = {
  "total-ht": { name: "Total HT", short: "total HT", basis: "la somme des lignes donne" },
  "total-vat": { name: "TVA", short: "TVA", basis: "le calcul sur le total HT donne" },
  "total-ttc": { name: "Total TTC", short: "total TTC", basis: "le total HT et la TVA donnent" },
};

function totalPoint(extraction: Extraction, finding: Finding): Point | null {
  const names = TOTAL_NAMES[finding.ruleId];
  const printed =
    finding.ruleId === "total-ht"
      ? extraction.totals.totalHT
      : finding.ruleId === "total-vat"
        ? extraction.totals.totalVAT
        : extraction.totals.totalTTC;
  if (!names || printed === undefined || finding.amount === undefined) return null;
  const expected = roundCents(printed - finding.amount);
  return {
    long: `${names.name} : ${names.basis} ${euros(expected)}, alors que le devis indique ${euros(printed)}.`,
    short: `${names.short} : ${euros(expected)} et non ${euros(printed)}`,
    needsCorrection: true,
  };
}

function pricePoint(extraction: Extraction, opinion: PriceOpinion): Point | null {
  const { reference } = opinion;
  if (reference.kind !== "loupe" || reference.median <= 0) return null;
  if ((opinion.unitPrice - reference.median) / reference.median < verdictConfig.negotiatePriceRatio) return null;
  const label = extraction.lines[opinion.lineIndex]?.label ?? `ligne ${opinion.lineIndex + 1}`;
  const unit = UNIT_SYMBOLS[opinion.unit];
  return {
    long:
      `Le poste ${quoted(label)} est facturé ${euros(opinion.unitPrice)} HT / ${unit} ; pour la même prestation, ` +
      `les devis comparables de ma région se situent plutôt autour de ${euros(reference.median)} HT. ` +
      `Pourriez-vous revoir ce prix ?`,
    short: `${quoted(label, SMS_LABEL_MAX)} : ${euros(opinion.unitPrice)} HT, plutôt ${euros(reference.median)} ailleurs dans ma région`,
    needsCorrection: false,
  };
}

function points(input: NegotiationInput): Point[] {
  const { extraction } = input;
  const sure = input.findings.filter((finding) => finding.confirmed && finding.kind !== "reminder");
  const result: Point[] = [];

  for (const finding of sure.filter((item) => item.ruleId === "line-calculation")) {
    const point = calculationPoint(extraction, finding);
    if (point) result.push(point);
  }
  for (const finding of sure.filter((item) => TOTAL_NAMES[item.ruleId])) {
    const point = totalPoint(extraction, finding);
    if (point) result.push(point);
  }
  for (const opinion of [...input.prices].sort((a, b) => b.delta - a.delta)) {
    const point = pricePoint(extraction, opinion);
    if (point) result.push(point);
  }

  const vague = sure
    .filter((item) => item.ruleId === "vague-line" && item.lineIndex !== undefined)
    .map((item) => extraction.lines[item.lineIndex!]?.label)
    .filter((label): label is string => label !== undefined);
  if (vague.length > 0) {
    result.push({
      long: `Pourriez-vous détailler ce que comprend ${vague.length > 1 ? "les lignes" : "la ligne"} ${joinFrench(vague.map((label) => quoted(label)))} ?`,
      short: `merci de détailler ${joinFrench(vague.map((label) => quoted(label, SMS_LABEL_MAX)))}`,
      needsCorrection: false,
    });
  }

  if (sure.some((item) => item.ruleId === "deposit-high")) {
    const limit = checksConfig.depositWarningPercent;
    result.push({
      long: `Serait-il possible de limiter l'acompte à ${limit} %, le solde étant réglé à la fin des travaux ?`,
      short: `je souhaiterais limiter l'acompte à ${limit} %`,
      needsCorrection: false,
    });
  }

  for (const finding of sure.filter((item) => item.ruleId === "vat-rate-unknown" || item.ruleId === "vat-rate-category")) {
    const rate = Number(finding.id.split("-").at(-1));
    if (!Number.isFinite(rate)) continue;
    result.push({
      long: `Pourriez-vous me confirmer le taux de TVA appliqué (${formatRate(rate / 100)}) ?`,
      short: `merci de confirmer le taux de TVA (${formatRate(rate / 100)})`,
      needsCorrection: false,
    });
  }

  const missing = sure.map((item) => MISSING[item.ruleId]).filter((text): text is string => text !== undefined);
  if (missing.length > 0) {
    result.push({
      long: `Pourriez-vous compléter le devis avec ${joinFrench(missing)} ?`,
      short: `merci de compléter le devis avec ${joinFrench(missing)}`,
      needsCorrection: true,
    });
  }
  if (sure.some((item) => item.ruleId === "mention-insurance")) {
    result.push({
      long: "Pourriez-vous aussi me transmettre votre attestation d'assurance professionnelle (décennale) ?",
      short: "merci de m'envoyer votre attestation d'assurance décennale",
      needsCorrection: false,
    });
  }
  return result;
}

/** Les espaces insécables passent mal dans certains SMS : des espaces simples. */
function plainSpaces(text: string): string {
  return text.replace(/[  ]/g, " ");
}

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** Le message, ou `null` s'il n'y a rien de vérifié à demander. */
export function buildNegotiation(input: NegotiationInput): NegotiationMessage | null {
  const list = points(input);
  if (list.length === 0) return null;
  const { extraction } = input;
  const date = extraction.meta.quoteDate ? formatShortDate(new Date(`${extraction.meta.quoteDate}T12:00:00Z`)) : null;
  const what = extraction.subject.trim();
  const reference = `votre devis${date ? ` du ${date}` : ""}${what ? ` (${what})` : ""}`;
  const correction = list.some((point) => point.needsCorrection);

  // Typographie française dans l'email (espaces insécables avant « : ? » et dans les guillemets).
  const body = fr([
    "Bonjour,",
    "",
    `Merci pour ${reference}. Avant de le signer, j'aimerais revoir quelques points avec vous :`,
    "",
    ...list.map((point) => `- ${point.long}`),
    "",
    correction
      ? "Pourriez-vous m'envoyer un devis corrigé ? Merci d'avance."
      : "Merci d'avance pour votre retour.",
    "",
    "Cordialement,",
  ].join("\n"));

  const shown = list.slice(0, SMS_MAX_POINTS).map((point) => point.short);
  const more = list.length > SMS_MAX_POINTS ? " J'ai quelques autres questions, je peux vous les envoyer par email." : "";
  const sms = plainSpaces(
    fr(`Bonjour, merci pour ${reference}. Avant de signer : ${shown.join(" ; ")}.${more} ` +
      `${correction ? "Pourriez-vous m'envoyer un devis corrigé ? " : ""}Merci !`),
  );

  return {
    email: { subject: fr(capitalize(`${reference} : quelques questions`)), body },
    sms,
  };
}
