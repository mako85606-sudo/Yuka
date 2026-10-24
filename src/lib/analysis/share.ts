import { REGIONS, type RegionCode } from "@/config/regions";
import { CATEGORY_LABELS, isTaxonomyId, taxonomyItem } from "@/config/taxonomy";
import { headerFromExtraction, type AnalysisData } from "@/lib/analysis/live-state";
import type { Finding, PriceOpinion, VerdictResult } from "@/lib/analysis/result";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";

/**
 * Ce qu'une page de partage public montre d'une analyse : la feuille corrigée
 * et son verdict, sans rien qui permette de retrouver le client ou l'artisan.
 *
 * - Le lieu se réduit à la région (jamais le département).
 * - Pas de date de devis, de validité ni de délai : avec le lieu, elles
 *   pourraient désigner un chantier.
 * - Pas de rappel personnel (délai de rétractation, signature à domicile).
 * - Pas de lien vers l'analyse privée ni de message de négociation.
 * - Pas d'heure de correction.
 * - Aucun texte libre lu sur le devis : chaque libellé devient le nom de la
 *   prestation dans la nomenclature de Loupe (« Ligne 3 » sinon), l'objet
 *   devient la catégorie. Un libellé pourrait nommer une entreprise ou
 *   contenir une adresse web, et la page porte la marque de Loupe.
 *
 * Le nom de l'entreprise, son adresse et ses numéros ne sont pas recopiés par
 * la lecture : l'extraction n'en garde que des booléens de présence.
 */

export interface ShareSource {
  readonly shareId: string;
  readonly region: string | null;
  readonly createdAt: Date;
  readonly extraction: Extraction;
  readonly findings: readonly Finding[];
  readonly prices: readonly PriceOpinion[];
  readonly pricesComplete: boolean;
  readonly verdict: VerdictResult;
}

export interface SharedView {
  readonly data: AnalysisData;
  /** Région lisible, ou `null` si elle n'est pas connue. */
  readonly place: string | null;
}

function regionName(code: string | null): string | null {
  return code !== null && code in REGIONS ? REGIONS[code as RegionCode] : null;
}

/** Nom public d'une ligne : la prestation de la nomenclature, ou son numéro. */
export function publicLineLabel(line: ExtractedLine, index: number): string {
  const id = line.canonicalItem;
  return id !== undefined && isTaxonomyId(id) ? taxonomyItem(id).label : `Ligne ${index + 1}`;
}

export function shareableAnalysis(source: ShareSource): SharedView {
  // On garde seulement l'acompte (il explique un constat) ; le reste de `meta` situe le chantier.
  const { depositPercent, depositAmount } = source.extraction.meta;
  const meta: Extraction["meta"] = { isDoorToDoorSale: false };
  if (depositPercent !== undefined) meta.depositPercent = depositPercent;
  if (depositAmount !== undefined) meta.depositAmount = depositAmount;

  // Chaque libellé lu cède la place à son nom public, partout où il est cité.
  const renames = source.extraction.lines
    .map((line, index) => [line.label, publicLineLabel(line, index)] as const)
    .filter(([raw, safe]) => raw.trim() !== "" && raw !== safe)
    .sort((a, b) => b[0].length - a[0].length);
  const scrub = (text: string) => renames.reduce((current, [raw, safe]) => current.split(raw).join(safe), text);

  const extraction: Extraction = {
    ...source.extraction,
    subject: CATEGORY_LABELS[source.extraction.category],
    meta,
    lines: source.extraction.lines.map((line, index) => ({ ...line, label: publicLineLabel(line, index) })),
  };
  const reminders = source.findings.filter((finding) => finding.kind === "reminder");
  const findings = source.findings
    .filter((finding) => finding.kind !== "reminder")
    .map((finding) => ({ ...finding, note: scrub(finding.note), detail: scrub(finding.detail) }));
  const privatePoints = new Set(reminders.map((finding) => finding.detail));
  const verdict: VerdictResult = {
    ...source.verdict,
    keyPoints: source.verdict.keyPoints.filter((point) => !privatePoints.has(point)).map(scrub),
  };

  return {
    place: regionName(source.region),
    data: {
      header: headerFromExtraction(extraction),
      lines: extraction.lines.map((line, index) => ({ index, line })),
      extraction,
      findings,
      prices: source.prices,
      pricesComplete: source.pricesComplete,
      verdict,
      // Jamais l'identifiant de l'analyse privée sur une page publique.
      analysisId: null,
      expiresAt: null,
      // Pas d'heure de correction sur une page publique (elle reste dans la source de la page).
      correctedAt: null,
      remaining: null,
    },
  };
}

/** Résumé d'une correction partagée, pour la page et son image : « 2 erreurs vérifiées · 1 point d'attention ». */
export function shareCounts(findings: readonly Finding[]): { readonly errors: number; readonly warnings: number } {
  const sure = findings.filter((finding) => finding.confirmed);
  return {
    errors: sure.filter((finding) => finding.kind === "error").length,
    warnings: sure.filter((finding) => finding.kind === "warning").length,
  };
}
