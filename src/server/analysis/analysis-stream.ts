import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { encodeEvent, type AnalyzeEvent } from "@/lib/analysis/events";
import { REFUSAL_MESSAGES, failureMessage } from "@/lib/analysis/messages";
import { extractQuote, type ExtractionOutcome } from "@/server/extraction/extract-quote";
import type { QuoteDocument } from "@/server/extraction/prompt";

/**
 * Le flux d'une analyse : chaque événement part dès que le serveur atteint
 * l'étape correspondante, jamais sur un minuteur. Étape 3 : réception et
 * lecture ; vérifications, prix et verdict s'ajouteront à la suite.
 */

export interface AnalysisStreamOptions {
  readonly client: Anthropic;
  readonly model: string;
  readonly documents: readonly QuoteDocument[];
  /** Analyses encore possibles aujourd'hui, celle-ci comprise. */
  readonly remaining: number;
  /** Rend l'analyse au visiteur ; renvoie vrai si c'est fait. */
  readonly refund: () => Promise<boolean>;
  readonly attemptTimeoutMs?: number;
}

/** Journal d'une lecture : tokens, durée et coût, jamais de contenu du devis. */
export function logOutcome(outcome: ExtractionOutcome): void {
  const { run } = outcome;
  const result =
    outcome.kind === "extracted"
      ? `lu (${outcome.extraction.category}, ${outcome.extraction.lines.length} lignes)`
      : outcome.kind === "stopped"
        ? `arrêté (${outcome.reason})`
        : `échec (${outcome.reason}${outcome.detail ? ` : ${outcome.detail.slice(0, 200)}` : ""})`;
  const cost = run.costUsd === null ? "coût inconnu" : `${run.costUsd.toFixed(4)} $`;
  console.info(
    `[analyse] ${result} · ${run.model} · ${run.attempts} tentative(s) · ${run.durationMs} ms · ` +
      `${run.usage.inputTokens}+${run.usage.cacheWriteTokens}+${run.usage.cacheReadTokens} tokens en entrée, ` +
      `${run.usage.outputTokens} en sortie · ${cost}`,
  );
}

export function createAnalysisStream(options: AnalysisStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  let open = true;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalyzeEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          open = false;
        }
      };

      try {
        send({ type: "step", step: "received" });
        send({ type: "step", step: "reading" });
        const outcome = await extractQuote({
          client: options.client,
          model: options.model,
          documents: options.documents,
          signal: abort.signal,
          attemptTimeoutMs: options.attemptTimeoutMs,
          onProgress: send,
        });
        logOutcome(outcome);

        if (outcome.kind === "extracted") {
          send({ type: "extracted", extraction: outcome.extraction, remaining: options.remaining });
        } else if (outcome.kind === "stopped") {
          send({ type: "refused", reason: outcome.reason, message: REFUSAL_MESSAGES[outcome.reason] });
        } else if (outcome.reason !== "aborted") {
          // Le visiteur parti ne reçoit rien ; sinon, l'échec est le nôtre : on rend l'analyse.
          const refunded = await options.refund();
          send({
            type: "error",
            code: "reading-failed",
            message: failureMessage("reading-failed", refunded),
            refunded,
          });
        }
      } catch (error) {
        console.error("[analyse] erreur inattendue", error);
        const refunded = await options.refund();
        send({
          type: "error",
          code: "server-error",
          message: failureMessage("server-error", refunded),
          refunded,
        });
      } finally {
        if (open) {
          open = false;
          controller.close();
        }
      }
    },
    cancel() {
      // Le navigateur a fermé la connexion : inutile de continuer à payer la lecture.
      open = false;
      abort.abort();
    },
  });
}
