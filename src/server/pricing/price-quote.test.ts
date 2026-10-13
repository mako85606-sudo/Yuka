import { afterAll, describe, expect, it, vi } from "vitest";
import type { Extraction } from "@/lib/extraction/schema";
import { EMPTY_USAGE } from "@/lib/llm-cost";
import { quoteFingerprint, saveAnalysis } from "@/server/analysis/store";
import { cleanExtraction, extractionWith, withLine } from "@/test/extraction";
import { createFakeAnthropic, errorResponse, messageResponse, toolUseBlock, type Responder } from "@/test/fake-anthropic";
import { createTestDb } from "@/test/test-db";
import { ESTIMATE_TOOL_NAME } from "./estimate-prices";
import { priceQuote } from "./price-quote";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

const NOW = new Date("2026-10-13T10:00:00Z");
let seeded = 0;

/** Enregistre un devis comparable : même chauffe-eau, au prix donné. */
async function seed(unitPrice: number, { department = "69", createdAt = NOW } = {}) {
  seeded += 1;
  const extraction = extractionWith({
    meta: { department, quoteDate: `2026-01-${String(seeded).padStart(2, "0")}` },
    lines: [{ ...cleanExtraction.lines[0]!, unitPriceHT: unitPrice, totalHT: unitPrice }],
  });
  await saveAnalysis(db, {
    extraction,
    fingerprint: quoteFingerprint(extraction),
    findings: [],
    prices: [],
    pricesComplete: true,
    verdict: { verdict: "ok", savings: null, keyPoints: [], overcharge: 0 },
    usage: EMPTY_USAGE,
    costUsd: 0,
    now: createdAt,
  });
}

function estimates(...ranges: { line: number; low: number; high: number }[]): Responder {
  return () => messageResponse([toolUseBlock(ESTIMATE_TOOL_NAME, { estimates: ranges })]);
}

function price(extraction: Extraction, responders: Responder[], overrides: { db?: typeof db | null; estimateTimeoutMs?: number } = {}) {
  const fake = createFakeAnthropic(responders);
  const outcome = priceQuote({
    extraction,
    fingerprint: quoteFingerprint(extraction),
    db: overrides.db === undefined ? db : overrides.db,
    client: fake.client,
    model: "claude-sonnet-5-5",
    estimateTimeoutMs: overrides.estimateTimeoutMs,
    now: NOW,
  });
  return { outcome, requests: fake.requests };
}

// Base Loupe : cinq chauffe-eau en Auvergne-Rhône-Alpes, un à Paris, un trop ancien.
for (const unitPrice of [500, 520, 540, 560, 580]) await seed(unitPrice);
await seed(900, { department: "75" });
await seed(100, { createdAt: new Date("2024-09-01T10:00:00Z") });

describe("priceQuote", () => {
  it("compare à la base Loupe dès cinq devis de la région, et estime le reste", async () => {
    // Isère : même région que les devis enregistrés dans le Rhône.
    const extraction = extractionWith({ meta: { department: "38" } });
    const { outcome, requests } = price(extraction, [estimates({ line: 1, low: 45, high: 65 }, { line: 2, low: 25, high: 45 })]);
    const result = await outcome;

    expect(result.complete).toBe(true);
    expect(result.opinions.map((opinion) => [opinion.lineIndex, opinion.source.kind])).toEqual([
      [0, "loupe"],
      [1, "ai"],
      [2, "ai"],
    ]);
    expect(result.opinions[0]).toMatchObject({
      source: { kind: "loupe", comparables: 5 },
      reference: { kind: "loupe", median: 540, p25: 520, p75: 560, comparables: 5 },
      delta: 149,
    });
    expect(result.opinions[1]).toMatchObject({ reference: { kind: "ai", low: 45, high: 65 }, delta: 0 });

    // Le modèle ne voit que les lignes sans comparables, sans leurs prix, avec la région.
    expect(requests).toHaveLength(1);
    const asked = JSON.stringify(requests[0]?.body.messages);
    expect(asked).toContain("Auvergne-Rhône-Alpes");
    expect(asked).not.toContain("Chauffe-eau");
    expect(asked).toContain("1. Main-d'œuvre");
    expect(asked).not.toMatch(/58|174/);
    expect(result.usage.inputTokens).toBe(400);
  });

  it("ne compare pas à une autre région ni à des devis de plus de 24 mois", async () => {
    const paris = extractionWith({ meta: { department: "92" } });
    const { outcome, requests } = price(paris, [estimates({ line: 1, low: 600, high: 900 })]);
    const result = await outcome;
    expect(result.opinions[0]).toMatchObject({ source: { kind: "ai" }, reference: { low: 600, high: 900 } });
    expect(JSON.stringify(requests[0]?.body.messages)).toContain("Île-de-France");
  });

  it("ne compte pas un devis parmi ses propres comparables", async () => {
    const extraction = extractionWith({
      meta: { quoteDate: "2026-01-01" },
      lines: [{ ...cleanExtraction.lines[0]!, unitPriceHT: 500, totalHT: 500 }],
    });
    // Ce devis est le premier enregistré : il ne reste que quatre comparables.
    const { outcome } = price(extraction, [estimates()]);
    expect((await outcome).opinions).toEqual([]);
  });

  it("ne donne pas d'avis sur une ligne mal lue, vague ou trop petite", async () => {
    const extraction = extractionWith({
      meta: { department: "13" },
      lines: [
        { ...cleanExtraction.lines[0]!, confidence: "low" },
        { label: "Fournitures diverses", confidence: "high", quantity: 1, unit: "forfait", unitPriceHT: 120, totalHT: 120 },
        { label: "Joint", confidence: "high", quantity: 1, unit: "unite", unitPriceHT: 4, totalHT: 4 },
        { label: "Remise commerciale", confidence: "high", quantity: 1, totalHT: -50, canonicalItem: "divers.remise" },
      ],
    });
    const { outcome, requests } = price(extraction, []);
    const result = await outcome;
    expect(result).toMatchObject({ opinions: [], complete: true });
    expect(requests).toHaveLength(0);
  });

  it("estime seulement les lignes les plus chères quand il y en a beaucoup", async () => {
    const many = extractionWith({
      meta: { department: "13" },
      lines: Array.from({ length: 15 }, (_, index) => ({
        label: `Prestation technique ${index + 1}`,
        confidence: "high" as const,
        quantity: 1,
        unit: "unite" as const,
        unitPriceHT: 100 + index,
        totalHT: 100 + index,
      })),
    });
    const { outcome, requests } = price(many, [estimates()]);
    await outcome;
    const asked = JSON.stringify(requests[0]?.body.messages);
    expect(asked).toContain("Prestation technique 15");
    expect(asked).not.toContain("Prestation technique 3 ");
    expect(asked.match(/Prestation technique/g)).toHaveLength(12);
  });

  it("garde les avis de la base quand l'estimation échoue, et le signale", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { outcome } = price(cleanExtraction, [() => errorResponse(500, "api_error", "Panne")]);
    const result = await outcome;
    expect(result.complete).toBe(false);
    expect(result.opinions.map((opinion) => opinion.source.kind)).toEqual(["loupe"]);
    warn.mockRestore();
  });

  it("se passe de la base quand elle n'est pas configurée", async () => {
    const { outcome } = price(cleanExtraction, [estimates({ line: 1, low: 500, high: 800 })], { db: null });
    const result = await outcome;
    expect(result.complete).toBe(true);
    expect(result.opinions.map((opinion) => opinion.source.kind)).toEqual(["ai"]);
  });

  it("n'estime rien quand le temps de la requête est presque écoulé", async () => {
    const { outcome, requests } = price(withLine(0, { canonicalItem: undefined }), [], { estimateTimeoutMs: 2_000 });
    const result = await outcome;
    expect(result).toMatchObject({ opinions: [], complete: false });
    expect(requests).toHaveLength(0);
  });
});
