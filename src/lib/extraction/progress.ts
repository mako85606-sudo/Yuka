import { CATEGORIES, UNSUPPORTED_CATEGORIES, type Category } from "@/config/taxonomy";
import { normalizeDepartment } from "@/lib/department";
import {
  DOCUMENT_KINDS,
  READABILITY_LEVELS,
  extractedLineSchema,
  extractionSchema,
  prepareRawExtraction,
  type DocumentKind,
  type ExtractedLine,
  type Readability,
} from "@/lib/extraction/schema";

/**
 * Lecture progressive de l'entrée de l'outil pendant qu'elle se génère.
 *
 * Le SDK fournit à chaque fragment un instantané partiel, analysé avec
 * tolérance : une chaîne ou un nombre inachevés n'y figurent pas encore. Les
 * champs obligatoires sortent dans l'ordre du schéma (nature du document,
 * catégorie, lisibilité, objet, mentions, méta, lignes, totaux, confiance),
 * d'où trois règles :
 * - une valeur énumérée présente est complète ;
 * - l'en-tête est complet dès que la liste des lignes a commencé ;
 * - une ligne est complète dès que la suivante a commencé, ou que les totaux
 *   sont arrivés.
 */

export interface ExtractionHeader {
  readonly documentKind: DocumentKind;
  readonly category: Category;
  readonly readability: Readability;
  readonly subject: string;
  readonly quoteDate?: string;
  readonly validityDays?: number;
  readonly department?: string;
}

export interface CompletedLine {
  /** Position dans la liste des lignes du devis. */
  readonly index: number;
  readonly line: ExtractedLine;
}

export interface ExtractionProgress {
  readonly documentKind?: DocumentKind;
  readonly category?: Category;
  readonly readability?: Readability;
  readonly header?: ExtractionHeader;
  readonly lines: readonly CompletedLine[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pick<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (values as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function readProgress(snapshot: unknown): ExtractionProgress {
  const prepared = prepareRawExtraction(snapshot);
  if (!isRecord(prepared)) return { lines: [] };

  const documentKind = pick(DOCUMENT_KINDS, prepared.documentKind);
  const category = pick(CATEGORIES, prepared.category);
  const readability = pick(READABILITY_LEVELS, prepared.readability);
  const rawLines = Array.isArray(prepared.lines) ? prepared.lines : undefined;

  let header: ExtractionHeader | undefined;
  const meta = extractionSchema.shape.meta.safeParse(prepared.meta);
  if (
    rawLines &&
    documentKind &&
    category &&
    readability &&
    typeof prepared.subject === "string" &&
    meta.success
  ) {
    header = {
      documentKind,
      category,
      readability,
      subject: prepared.subject,
      quoteDate: meta.data.quoteDate,
      validityDays: meta.data.validityDays,
      department: normalizeDepartment(meta.data.department),
    };
  }

  const lines: CompletedLine[] = [];
  if (rawLines) {
    const linesDone = "totals" in prepared || "confidence" in prepared;
    const complete = linesDone ? rawLines.length : Math.max(0, rawLines.length - 1);
    for (let index = 0; index < complete; index += 1) {
      const parsed = extractedLineSchema.safeParse(rawLines[index]);
      if (parsed.success) lines.push({ index, line: parsed.data });
    }
  }

  return { documentKind, category, readability, header, lines };
}

export type EarlyStop = "health" | "not-a-quote" | "unreadable";

/**
 * Raison d'arrêter la lecture sans attendre la fin : un devis de santé (pas
 * pris en charge en V1, on n'en lit pas plus), un document qui n'est pas un
 * devis, ou une photo illisible.
 */
export function earlyStop(
  progress: Pick<ExtractionProgress, "documentKind" | "category" | "readability">,
): EarlyStop | undefined {
  if (progress.category && UNSUPPORTED_CATEGORIES.includes(progress.category)) return "health";
  if (progress.documentKind === "autre") return "not-a-quote";
  if (progress.readability === "poor") return "unreadable";
  return undefined;
}
