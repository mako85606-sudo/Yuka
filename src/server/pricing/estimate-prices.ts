import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODEL_PRICING, llmConfig } from "@/config/llm";
import { pricingConfig } from "@/config/pricing";
import { CATEGORY_LABELS, UNIT_SYMBOLS, type Category, type QuoteUnit } from "@/config/taxonomy";
import { describeValidationError, prepareRawExtraction } from "@/lib/extraction/schema";
import { toStrictToolSchema } from "@/lib/extraction/tool-schema";
import { EMPTY_USAGE, addUsage, costUsd, usageFromApi, type LlmUsage } from "@/lib/llm-cost";

/**
 * Fourchettes de prix demandées au modèle, quand la base Loupe n'a pas assez
 * de devis comparables. Le modèle ne voit jamais le prix du devis (pour ne
 * pas s'y ancrer) ; ses fourchettes sont présentées « estimation IA,
 * confiance faible », jamais comme un prix de marché. Médianes et écarts
 * restent calculés en TypeScript.
 */

export const ESTIMATE_TOOL_NAME = "estimer_prix";

export const priceEstimateSchema = z.object({
  estimates: z
    .array(
      z.object({
        line: z.number().int().describe("Numéro de la ligne, tel qu'il t'est donné."),
        low: z.number().describe("Bas de la fourchette : prix unitaire HT, en euros."),
        high: z.number().describe("Haut de la fourchette : prix unitaire HT, en euros."),
      }),
    )
    .describe("Une entrée par ligne que tu sais estimer ; les autres sont omises."),
});

export interface EstimateRequestLine {
  /** Position de la ligne dans le devis. */
  readonly index: number;
  readonly label: string;
  readonly unit: QuoteUnit;
  readonly quantity: number;
}

export interface PriceRange {
  readonly low: number;
  readonly high: number;
}

export interface EstimateOutcome {
  /** Fourchette par position de ligne. */
  readonly ranges: ReadonlyMap<number, PriceRange>;
  /** Faux si l'estimation a échoué : les lignes restent sans avis. */
  readonly ok: boolean;
  readonly usage: LlmUsage;
  readonly costUsd: number | null;
}

const SYSTEM_PROMPT = `Tu estimes des prix d'artisans et de garages en France pour Loupe, un service qui aide les particuliers à comprendre un devis. On te donne des lignes de devis anonymes, sans leur prix.

Pour chaque ligne que tu sais estimer, donne une fourchette large et prudente du prix unitaire HT habituellement facturé, dans la région indiquée, pour l'unité indiquée (fourniture et pose si le libellé le dit). Une fourchette honnête vaut mieux qu'une fourchette étroite.

Si une ligne est trop vague ou trop particulière pour être estimée, ne la mets pas : une absence vaut mieux qu'un chiffre au hasard.

Appelle l'outil ${ESTIMATE_TOOL_NAME} une seule fois avec tes fourchettes.`;

function buildTool(): Anthropic.Tool {
  return {
    name: ESTIMATE_TOOL_NAME,
    description: "Enregistre les fourchettes de prix estimées. Appelle cet outil une seule fois.",
    input_schema: toStrictToolSchema(priceEstimateSchema),
    ...(llmConfig.strictTool ? { strict: true } : {}),
  };
}

function buildRequest(category: Category, regionName: string | undefined, lines: readonly EstimateRequestLine[], year: number): string {
  const listed = lines
    .map(
      (line, position) =>
        `${position + 1}. ${line.label} — unité : ${UNIT_SYMBOLS[line.unit]} — quantité : ${line.quantity}`,
    )
    .join("\n");
  return `Corps de métier : ${CATEGORY_LABELS[category]}. Région : ${regionName ?? "France"}. Année : ${year}.

Lignes :
${listed}

Appelle ${ESTIMATE_TOOL_NAME} avec une fourchette par ligne que tu sais estimer.`;
}

/** Une fourchette n'est gardée que si elle a du sens. */
function plausible(range: PriceRange): boolean {
  return range.low > 0 && range.high >= range.low && range.high <= range.low * 20;
}

export interface EstimateOptions {
  readonly client: Anthropic;
  readonly model: string;
  readonly category: Category;
  readonly regionName?: string;
  readonly lines: readonly EstimateRequestLine[];
  readonly signal?: AbortSignal;
  /** Délai de l'appel ; par défaut `pricingConfig.estimateTimeoutMs`. */
  readonly timeoutMs?: number;
  readonly now?: Date;
}

export async function estimatePrices(options: EstimateOptions): Promise<EstimateOutcome> {
  const empty = (usage: LlmUsage, ok: boolean): EstimateOutcome => ({
    ranges: new Map(),
    ok,
    usage,
    costUsd: costUsd(usage, MODEL_PRICING[options.model]),
  });
  if (options.lines.length === 0) return empty(EMPTY_USAGE, true);

  const year = (options.now ?? new Date()).getFullYear();
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildRequest(options.category, options.regionName, options.lines, year) },
  ];
  let usage = EMPTY_USAGE;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let message: Anthropic.Message;
    try {
      message = await options.client.messages.create(
        {
          model: options.model,
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          tools: [buildTool()],
          tool_choice: { type: "auto", disable_parallel_tool_use: true },
          output_config: { effort: llmConfig.effort },
          messages,
        },
        { timeout: options.timeoutMs ?? pricingConfig.estimateTimeoutMs, signal: options.signal },
      );
    } catch (error) {
      if (!(error instanceof Anthropic.APIError)) throw error;
      console.warn(`[prix] estimation impossible : ${error.name} ${error.status ?? ""}`.trim());
      return empty(usage, false);
    }
    usage = addUsage(usage, usageFromApi(message.usage));
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return empty(usage, false);

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === ESTIMATE_TOOL_NAME,
    );
    const parsed = toolUse ? priceEstimateSchema.safeParse(prepareRawExtraction(toolUse.input)) : null;
    if (parsed?.success) {
      const ranges = new Map<number, PriceRange>();
      for (const estimate of parsed.data.estimates) {
        const line = options.lines[estimate.line - 1];
        const range = { low: estimate.low, high: estimate.high };
        if (line && plausible(range) && !ranges.has(line.index)) ranges.set(line.index, range);
      }
      return { ranges, ok: true, usage, costUsd: costUsd(usage, MODEL_PRICING[options.model]) };
    }
    if (attempt === 2) return empty(usage, false);
    // Une seule relance, avec l'erreur.
    messages = [
      ...messages,
      { role: "assistant", content: message.content },
      toolUse && parsed && !parsed.success
        ? {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                is_error: true,
                content: `Format invalide :\n${describeValidationError(parsed.error)}\nRappelle ${ESTIMATE_TOOL_NAME} avec des fourchettes corrigées.`,
              },
            ],
          }
        : {
            role: "user",
            content: `Tu n'as pas appelé l'outil ${ESTIMATE_TOOL_NAME}. Appelle-le maintenant, une seule fois.`,
          },
    ];
  }
  return empty(usage, false);
}
