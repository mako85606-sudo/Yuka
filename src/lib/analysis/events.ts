import type { ExtractionHeader } from "@/lib/extraction/progress";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";
import { SERVER_STEPS, type ServerStep } from "@/lib/phases";

/**
 * Protocole de `POST /api/analyze`.
 *
 * Avant le flux, une erreur répond en JSON avec un statut HTTP (requête
 * invalide, limite atteinte…). Ensuite, la réponse est un flux NDJSON : un
 * événement JSON par ligne, dans l'ordre réel du traitement côté serveur.
 */

export type RefusalReason = "health" | "not-a-quote" | "unreadable";

export type AnalysisErrorCode =
  | "invalid-request"
  | "consent-required"
  | "no-file"
  | "too-many-files"
  | "unsupported-file"
  | "too-large"
  | "forbidden-origin"
  | "rate-limited"
  | "not-configured"
  | "reading-failed"
  | "server-error"
  // Côté navigateur : la connexion a lâché, ou le flux s'est arrêté avant la fin.
  | "network"
  | "interrupted";

export type AnalyzeEvent =
  /** Le serveur vient d'atteindre cette étape. */
  | { readonly type: "step"; readonly step: ServerStep }
  /** En-tête du devis : catégorie, objet, date, département. */
  | { readonly type: "header"; readonly header: ExtractionHeader }
  /** Une ligne vient d'être lue. */
  | { readonly type: "line"; readonly index: number; readonly line: ExtractedLine }
  /** La lecture recommence : les lignes reçues sont à oublier. */
  | { readonly type: "restart" }
  /** Lecture terminée et validée. `remaining` : analyses encore possibles aujourd'hui. */
  | { readonly type: "extracted"; readonly extraction: Extraction; readonly remaining: number }
  /** Document refusé, sans analyse ni stockage. */
  | { readonly type: "refused"; readonly reason: RefusalReason; readonly message: string }
  /** Échec. `refunded` : l'analyse n'a pas été décomptée. */
  | {
      readonly type: "error";
      readonly code: AnalysisErrorCode;
      readonly message: string;
      readonly refunded: boolean;
    };

export interface AnalyzeErrorBody {
  readonly error: { readonly code: AnalysisErrorCode; readonly message: string };
}

export const NDJSON_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

export function encodeEvent(event: AnalyzeEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Lit une ligne du flux. Les données viennent de notre propre serveur : on
 * vérifie la forme générale de chaque événement, sans revalider l'extraction
 * (le serveur l'a déjà fait avec Zod).
 */
export function parseEventLine(line: string): AnalyzeEvent | null {
  if (line.trim() === "") return null;
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  switch (value.type) {
    case "step":
      return (SERVER_STEPS as readonly unknown[]).includes(value.step) ? (value as AnalyzeEvent) : null;
    case "header":
      return isRecord(value.header) ? (value as AnalyzeEvent) : null;
    case "line":
      return typeof value.index === "number" && isRecord(value.line) ? (value as AnalyzeEvent) : null;
    case "restart":
      return value as AnalyzeEvent;
    case "extracted":
      return isRecord(value.extraction) && typeof value.remaining === "number"
        ? (value as AnalyzeEvent)
        : null;
    case "refused":
      return typeof value.reason === "string" && typeof value.message === "string"
        ? (value as AnalyzeEvent)
        : null;
    case "error":
      return typeof value.code === "string" && typeof value.message === "string"
        ? (value as AnalyzeEvent)
        : null;
    default:
      return null;
  }
}

/** Découpe un flux NDJSON en événements, au fil de l'arrivée des octets. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AnalyzeEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const event = parseEventLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (event) yield event;
        newline = buffer.indexOf("\n");
      }
      if (done) break;
    }
    const last = parseEventLine(buffer);
    if (last) yield last;
  } finally {
    reader.releaseLock();
  }
}
