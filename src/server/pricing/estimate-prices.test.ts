import { describe, expect, it, vi } from "vitest";
import { createFakeAnthropic, errorResponse, messageResponse, toolUseBlock } from "@/test/fake-anthropic";
import { ESTIMATE_TOOL_NAME, estimatePrices, type EstimateRequestLine } from "./estimate-prices";

const lines: EstimateRequestLine[] = [
  { index: 0, label: "Chauffe-eau électrique 200 L, fourniture et pose", unit: "unite", quantity: 1 },
  { index: 2, label: "Main d'œuvre plombier", unit: "heure", quantity: 3 },
];

function estimate(client: ReturnType<typeof createFakeAnthropic>["client"]) {
  return estimatePrices({
    client,
    model: "claude-sonnet-5-5",
    category: "plomberie",
    regionName: "Auvergne-Rhône-Alpes",
    lines,
    now: new Date("2026-10-13T10:00:00Z"),
  });
}

describe("estimatePrices", () => {
  it("rend une fourchette par ligne estimée, sans jamais montrer les prix du devis", async () => {
    const fake = createFakeAnthropic([
      () =>
        messageResponse([
          toolUseBlock(ESTIMATE_TOOL_NAME, {
            estimates: [
              { line: 1, low: 600, high: 950 },
              { line: 2, low: 45, high: 70 },
            ],
          }),
        ]),
    ]);
    const outcome = await estimate(fake.client);

    expect(outcome.ok).toBe(true);
    expect(outcome.ranges.get(0)).toEqual({ low: 600, high: 950 });
    expect(outcome.ranges.get(2)).toEqual({ low: 45, high: 70 });
    expect(outcome.usage).toMatchObject({ inputTokens: 400, outputTokens: 200 });
    expect(outcome.costUsd).toBeCloseTo(0.0028, 6);

    const body = fake.requests[0]?.body;
    expect(body).toMatchObject({
      model: "claude-sonnet-5-5",
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      output_config: { effort: "low" },
    });
    expect(body).not.toHaveProperty("stream");
    const request = JSON.stringify(body?.messages);
    expect(request).toContain("Auvergne-Rhône-Alpes");
    expect(request).toContain("2026");
    expect(request).toContain("1. Chauffe-eau électrique 200 L");
    expect(request).toContain("unité : h — quantité : 3");
    expect(request).not.toMatch(/€|prix unitaire du devis/);
  });

  it("écarte une fourchette absurde ou un numéro de ligne inconnu", async () => {
    const fake = createFakeAnthropic([
      () =>
        messageResponse([
          toolUseBlock(ESTIMATE_TOOL_NAME, {
            estimates: [
              { line: 1, low: 900, high: 600 },
              { line: 2, low: 1, high: 500 },
              { line: 7, low: 10, high: 20 },
            ],
          }),
        ]),
    ]);
    const outcome = await estimate(fake.client);
    expect(outcome.ok).toBe(true);
    expect(outcome.ranges.size).toBe(0);
  });

  it("relance une fois avec l'erreur quand la réponse est mal formée", async () => {
    const fake = createFakeAnthropic([
      () => messageResponse([toolUseBlock(ESTIMATE_TOOL_NAME, { estimates: [{ line: "un", low: 1 }] })]),
      () => messageResponse([toolUseBlock(ESTIMATE_TOOL_NAME, { estimates: [{ line: 1, low: 600, high: 950 }] }, "toolu_2")]),
    ]);
    const outcome = await estimate(fake.client);
    expect(outcome.ok).toBe(true);
    expect(outcome.ranges.get(0)).toEqual({ low: 600, high: 950 });
    expect(outcome.usage.inputTokens).toBe(800);

    const retry = fake.requests[1]?.body.messages as { role: string; content: unknown }[];
    expect(retry).toHaveLength(3);
    expect(JSON.stringify(retry[2])).toContain('"is_error":true');
    expect(JSON.stringify(retry[2])).toContain("toolu_test_1");
  });

  it("rappelle l'outil quand le modèle répond en texte", async () => {
    const fake = createFakeAnthropic([
      () => messageResponse([{ type: "text", text: "Voici mes estimations." }]),
      () => messageResponse([toolUseBlock(ESTIMATE_TOOL_NAME, { estimates: [] })]),
    ]);
    const outcome = await estimate(fake.client);
    expect(outcome).toMatchObject({ ok: true });
    expect(JSON.stringify(fake.requests[1]?.body.messages)).toContain("Tu n'as pas appelé l'outil");
  });

  it("abandonne après deux réponses inutilisables", async () => {
    const fake = createFakeAnthropic([
      () => messageResponse([{ type: "text", text: "Hum." }]),
      () => messageResponse([{ type: "text", text: "Hum." }]),
    ]);
    const outcome = await estimate(fake.client);
    expect(outcome.ok).toBe(false);
    expect(outcome.ranges.size).toBe(0);
  });

  it("ne relance ni un refus ni une réponse tronquée", async () => {
    for (const stopReason of ["refusal", "max_tokens"]) {
      const fake = createFakeAnthropic([() => messageResponse([], { stopReason })]);
      const outcome = await estimate(fake.client);
      expect(outcome.ok).toBe(false);
      expect(fake.requests).toHaveLength(1);
    }
  });

  it("laisse les lignes sans avis quand l'API est indisponible", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fake = createFakeAnthropic([() => errorResponse(529, "overloaded_error", "Surcharge")]);
    const outcome = await estimate(fake.client);
    expect(outcome).toMatchObject({ ok: false, usage: { inputTokens: 0 } });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("n'appelle pas le modèle sans ligne à estimer", async () => {
    const fake = createFakeAnthropic([]);
    const outcome = await estimatePrices({ client: fake.client, model: "claude-sonnet-5-5", category: "auto", lines: [] });
    expect(outcome).toMatchObject({ ok: true, costUsd: 0 });
    expect(fake.requests).toHaveLength(0);
  });
});
