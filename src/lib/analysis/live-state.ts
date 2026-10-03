import type { AnalysisErrorCode, AnalyzeEvent, RefusalReason } from "@/lib/analysis/events";
import type { ExtractionHeader } from "@/lib/extraction/progress";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";
import type { ScenePhase } from "@/lib/phases";

/**
 * État d'une analyse côté navigateur, reconstruit événement par événement.
 * Pur et sans effet : testable, et rejouable.
 */

export type LiveStatus = "idle" | "sending" | "streaming" | "extracted" | "refused" | "error";

export interface LiveLine {
  readonly index: number;
  readonly line: ExtractedLine;
}

export interface LiveState {
  readonly status: LiveStatus;
  /** Dernière étape atteinte par le serveur. */
  readonly step: ScenePhase;
  readonly header: ExtractionHeader | null;
  /** Lignes reçues, dans l'ordre du devis. */
  readonly lines: readonly LiveLine[];
  readonly extraction: Extraction | null;
  /** Analyses encore possibles aujourd'hui, connues à la fin. */
  readonly remaining: number | null;
  readonly refusal: { readonly reason: RefusalReason; readonly message: string } | null;
  readonly error: {
    readonly code: AnalysisErrorCode;
    readonly message: string;
    readonly refunded: boolean;
  } | null;
}

export const INITIAL_LIVE_STATE: LiveState = {
  status: "idle",
  step: "idle",
  header: null,
  lines: [],
  extraction: null,
  remaining: null,
  refusal: null,
  error: null,
};

export type LiveAction = AnalyzeEvent | { readonly type: "send" } | { readonly type: "reset" };

function headerFromExtraction(extraction: Extraction): ExtractionHeader {
  return {
    documentKind: extraction.documentKind,
    category: extraction.category,
    readability: extraction.readability,
    subject: extraction.subject,
    quoteDate: extraction.meta.quoteDate,
    validityDays: extraction.meta.validityDays,
    department: extraction.meta.department,
  };
}

export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case "reset":
      return INITIAL_LIVE_STATE;
    case "send":
      return { ...INITIAL_LIVE_STATE, status: "sending" };
    case "step":
      return { ...state, status: "streaming", step: action.step };
    case "header":
      return { ...state, header: action.header };
    case "line": {
      if (state.lines.some((entry) => entry.index === action.index)) return state;
      const lines = [...state.lines, { index: action.index, line: action.line }].sort(
        (a, b) => a.index - b.index,
      );
      return { ...state, lines };
    }
    case "restart":
      return { ...state, lines: [] };
    case "extracted":
      return {
        ...state,
        status: "extracted",
        header: headerFromExtraction(action.extraction),
        lines: action.extraction.lines.map((line, index) => ({ index, line })),
        extraction: action.extraction,
        remaining: action.remaining,
      };
    case "refused":
      return {
        ...state,
        status: "refused",
        header: null,
        lines: [],
        refusal: { reason: action.reason, message: action.message },
      };
    case "error":
      return {
        ...state,
        status: "error",
        error: { code: action.code, message: action.message, refunded: action.refunded },
      };
  }
}

/** Vrai tant que l'analyse tourne : envoi ou flux en cours. */
export function isRunning(state: LiveState): boolean {
  return state.status === "sending" || state.status === "streaming";
}
