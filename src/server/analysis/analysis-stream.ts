import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { limits } from "@/config/limits";
import { encodeEvent, type AnalyzeEvent } from "@/lib/analysis/events";
import { REFUSAL_MESSAGES, failureMessage } from "@/lib/analysis/messages";
import type { Finding, VerdictResult } from "@/lib/analysis/result";
import { computeOvercharge, runChecks } from "@/lib/checks";
import type { Extraction } from "@/lib/extraction/schema";
import { EMPTY_USAGE, addUsage, spendCostUsd, type LlmUsage } from "@/lib/llm-cost";
import { decideVerdict } from "@/lib/verdict";
import { quoteFingerprint, saveAnalysis, type SavedAnalysis } from "@/server/analysis/store";
import type { Database } from "@/server/db/client";
import { extractQuote, type ExtractionOutcome } from "@/server/extraction/extract-quote";
import type { QuoteDocument } from "@/server/extraction/prompt";
import { priceQuote, type PriceQuoteOutcome } from "@/server/pricing/price-quote";
import { errorSummary } from "@/server/log";

/**
 * Le flux d'une analyse : chaque événement part dès que le serveur atteint
 * l'étape correspondante, jamais sur un minuteur. Réception, lecture
 * (lignes au fil de l'eau), vérifications, prix, verdict.
 */

export interface AnalysisStreamOptions {
  readonly client: Anthropic;
  readonly model: string;
  readonly documents: readonly QuoteDocument[];
  /** Base où enregistrer l'analyse et chercher les prix comparables ; `null` sans base. */
  readonly db: Database | null;
  /** Analyses encore possibles aujourd'hui, celle-ci comprise. */
  readonly remaining: number;
  /** Rend l'analyse au visiteur ; renvoie vrai si c'est fait. */
  readonly refund: () => Promise<boolean>;
  /**
   * Solde la réservation de budget du jour une fois l'analyse finie : coût réel
   * mesuré et si les appels se sont terminés normalement (`trusted`). Appelé
   * une seule fois, à la fin du flux, s'il y a une base.
   */
  readonly settleSpend?: (actualUsd: number, trusted: boolean) => Promise<void>;
  readonly attemptTimeoutMs?: number;
  /** Temps total accordé à l'analyse ; l'estimation des prix prend ce qui reste après la lecture. */
  readonly budgetMs?: number;
}

function formatCost(costUsd: number | null): string {
  return costUsd === null ? "coût inconnu" : `${costUsd.toFixed(4)} $`;
}

function formatTokens(usage: LlmUsage): string {
  return (
    `${usage.inputTokens}+${usage.cacheWriteTokens}+${usage.cacheReadTokens} tokens en entrée, ` +
    `${usage.outputTokens} en sortie`
  );
}

/**
 * Détail d'un échec de lecture, sans ce qu'il pourrait citer du devis : les
 * passages entre guillemets (valeurs, extraits du JSON du modèle) sont masqués.
 */
export function safeDetail(detail: string): string {
  return detail
    .replace(/"(?:[^"\\]|\\.)*"/g, '"…"')
    .replace(/'[^']*'/g, "'…'")
    .slice(0, 160);
}

/** Journal d'une lecture : tokens, durée et coût, jamais de contenu du devis. */
export function logOutcome(outcome: ExtractionOutcome): void {
  const { run } = outcome;
  const result =
    outcome.kind === "extracted"
      ? `lu (${outcome.extraction.category}, ${outcome.extraction.lines.length} lignes)`
      : outcome.kind === "stopped"
        ? `arrêté (${outcome.reason})`
        : `échec (${outcome.reason}${outcome.detail ? ` : ${safeDetail(outcome.detail)}` : ""})`;
  console.info(
    `[analyse] ${result} · ${run.model} · ${run.attempts} tentative(s) · ${run.durationMs} ms · ` +
      `${formatTokens(run.usage)} · ${formatCost(run.costUsd)}`,
  );
}

interface Conclusion {
  readonly findings: readonly Finding[];
  readonly pricing: PriceQuoteOutcome;
  readonly verdict: VerdictResult;
  readonly saved: SavedAnalysis | null;
  readonly usage: LlmUsage;
  readonly costUsd: number | null;
  readonly durationMs: number;
}

/** Journal de la fin d'une analyse : verdict, nombre d'avis, coût total. Rien du devis. */
function logConclusion(conclusion: Conclusion): void {
  const { findings, pricing, verdict, saved } = conclusion;
  const loupe = pricing.opinions.filter((opinion) => opinion.source.kind === "loupe").length;
  const ai = pricing.opinions.length - loupe;
  console.info(
    `[analyse] verdict ${verdict.verdict} · ${findings.length} constat(s) · ` +
      `${pricing.opinions.length} avis de prix (${loupe} base, ${ai} IA${pricing.complete ? "" : ", incomplet"}) · ` +
      `${saved ? (saved.counted ? "enregistrée" : "enregistrée, déjà comptée") : "non enregistrée"} · ` +
      `${conclusion.durationMs} ms · total ${formatTokens(conclusion.usage)} · ${formatCost(conclusion.costUsd)}`,
  );
}

/** Vrai si l'appel a été facturé : au moins un token lu ou écrit. */
export function billed(usage: LlmUsage): boolean {
  return usage.inputTokens + usage.cacheWriteTokens + usage.cacheReadTokens + usage.outputTokens > 0;
}

function sumCosts(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : Math.round((a + b) * 1_000_000) / 1_000_000;
}

export function createAnalysisStream(options: AnalysisStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const budgetMs = options.budgetMs ?? limits.analysisBudgetMs;
  let open = true;

  // Tokens de tous les appels au modèle de cette analyse, pour solder la
  // réservation de budget à la fin, et si les appels se sont terminés
  // normalement (sinon le SDK sous-compte les tokens de sortie).
  let totalUsage = EMPTY_USAGE;
  let readingComplete = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const started = Date.now();
      const send = (event: AnalyzeEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          open = false;
        }
      };

      /** Vérifications, prix, verdict et enregistrement, après une lecture réussie. */
      const conclude = async (extraction: Extraction, reading: ExtractionOutcome["run"]) => {
        send({ type: "step", step: "checking" });
        const findings = runChecks(extraction);
        send({ type: "checks", findings });

        send({ type: "step", step: "pricing" });
        const fingerprint = quoteFingerprint(extraction);
        const pricing = await priceQuote({
          extraction,
          fingerprint,
          db: options.db,
          client: options.client,
          model: options.model,
          signal: abort.signal,
          estimateTimeoutMs: budgetMs - (Date.now() - started),
        });
        totalUsage = addUsage(totalUsage, pricing.usage);
        // Le visiteur est parti : rien à conclure, rien à garder.
        if (abort.signal.aborted) return;
        send({ type: "prices", prices: pricing.opinions, complete: pricing.complete });

        send({ type: "step", step: "verdict" });
        const verdict = decideVerdict({
          extraction,
          findings,
          prices: pricing.opinions,
          overcharge: computeOvercharge(extraction),
        });
        const usage = addUsage(reading.usage, pricing.usage);
        const costUsd = sumCosts(reading.costUsd, pricing.costUsd);

        let saved: SavedAnalysis | null = null;
        if (options.db) {
          try {
            saved = await saveAnalysis(options.db, {
              extraction,
              fingerprint,
              findings,
              prices: pricing.opinions,
              pricesComplete: pricing.complete,
              verdict,
              usage,
              costUsd,
            });
          } catch (error) {
            // Le résultat reste affiché ; seul son lien manquera.
            console.error(`[analyse] enregistrement impossible : ${errorSummary(error)}`);
          }
        }

        logConclusion({ findings, pricing, verdict, saved, usage, costUsd, durationMs: Date.now() - started });
        send({
          type: "verdict",
          result: verdict,
          analysisId: saved?.id ?? null,
          expiresAt: saved?.expiresAt.toISOString() ?? null,
          correctedAt: (saved?.createdAt ?? new Date()).toISOString(),
        });
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
        // Payée, réussie ou non : chaque lecture compte dans la dépense du jour.
        totalUsage = addUsage(totalUsage, outcome.run.usage);
        // Lecture terminée normalement : les tokens sont comptés en entier. Un
        // flux interrompu (délai, panne, départ) les sous-compte.
        readingComplete =
          outcome.kind === "extracted" ||
          outcome.kind === "stopped" ||
          (outcome.kind === "failed" && (outcome.reason === "refusal" || outcome.reason === "truncated"));

        if (outcome.kind === "extracted") {
          send({ type: "extracted", extraction: outcome.extraction, remaining: options.remaining });
          await conclude(outcome.extraction, outcome.run);
        } else if (outcome.kind === "stopped") {
          send({ type: "refused", reason: outcome.reason, message: REFUSAL_MESSAGES[outcome.reason] });
        } else if (outcome.reason !== "aborted") {
          // Le visiteur parti ne reçoit rien. Sinon, l'analyse n'est rendue que si
          // l'échec vient de nous ou d'Anthropic (panne, surcharge, coupure, délai)
          // sans rien facturer. Un envoi que le client sait mauvais (image que le
          // modèle refuse de décoder, erreur 4xx) ne doit pas se rejouer sans fin
          // à nos frais : il est décompté.
          const ourFault = outcome.reason === "unavailable" || outcome.reason === "timeout";
          const refunded = ourFault && !billed(outcome.run.usage) ? await options.refund() : false;
          send({
            type: "error",
            code: "reading-failed",
            message: failureMessage("reading-failed", refunded),
            refunded,
          });
        }
      } catch (error) {
        console.error(`[analyse] erreur inattendue : ${errorSummary(error)}`);
        // On ne sait pas ce qui a été facturé : l'analyse reste décomptée.
        const refunded = false;
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
        // Solde la réservation : on ne descend pas sous elle si un appel s'est
        // interrompu (tokens de sortie sous-comptés) ou si le visiteur est parti.
        const trusted = readingComplete && !abort.signal.aborted;
        await options.settleSpend?.(spendCostUsd(totalUsage, options.model), trusted);
      }
    },
    cancel() {
      // Le navigateur a fermé la connexion : inutile de continuer à payer la lecture.
      open = false;
      abort.abort();
    },
  });
}
