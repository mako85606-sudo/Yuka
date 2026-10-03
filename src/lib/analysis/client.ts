import {
  readEvents,
  type AnalysisErrorCode,
  type AnalyzeErrorBody,
  type AnalyzeEvent,
} from "@/lib/analysis/events";
import { CONSENT_FIELD, CONSENT_VALUE, FILES_FIELD } from "@/lib/analysis/form";
import { ERROR_MESSAGES } from "@/lib/analysis/messages";

/**
 * Côté navigateur : envoie le devis et rend les événements de l'analyse au fil
 * de l'eau. Toute erreur (refus avant analyse, réseau, flux coupé) devient un
 * événement `error` : l'appelant n'a qu'une boucle à écrire.
 */

const ENDPOINT = "/api/analyze";

function errorEvent(code: AnalysisErrorCode, message = ERROR_MESSAGES[code]): AnalyzeEvent {
  return { type: "error", code, message, refunded: false };
}

async function errorFromResponse(response: Response): Promise<AnalyzeEvent> {
  try {
    const body = (await response.json()) as Partial<AnalyzeErrorBody>;
    if (body.error && typeof body.error.code === "string" && typeof body.error.message === "string") {
      return errorEvent(body.error.code, body.error.message);
    }
  } catch {
    // Réponse qui ne vient pas de Loupe (hébergeur, proxy) : on la traduit d'après son statut.
  }
  if (response.status === 413) return errorEvent("too-large");
  if (response.status === 429) return errorEvent("rate-limited");
  return errorEvent("server-error");
}

const TERMINAL_EVENTS = new Set<AnalyzeEvent["type"]>(["extracted", "refused", "error"]);

export async function* streamAnalysis(
  files: readonly File[],
  signal?: AbortSignal,
  endpoint: string = ENDPOINT,
): AsyncGenerator<AnalyzeEvent> {
  const body = new FormData();
  body.set(CONSENT_FIELD, CONSENT_VALUE);
  for (const file of files) body.append(FILES_FIELD, file);

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body, signal });
  } catch {
    if (!signal?.aborted) yield errorEvent("network");
    return;
  }

  if (!response.ok || !response.body) {
    yield await errorFromResponse(response);
    return;
  }

  let finished = false;
  try {
    for await (const event of readEvents(response.body)) {
      if (TERMINAL_EVENTS.has(event.type)) finished = true;
      yield event;
    }
  } catch {
    if (signal?.aborted) return;
    if (!finished) yield errorEvent("network");
    return;
  }
  if (!finished && !signal?.aborted) yield errorEvent("interrupted");
}
