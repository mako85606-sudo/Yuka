import { describe, expect, it } from "vitest";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import type { AnalyzeEvent } from "@/lib/analysis/events";
import { INITIAL_LIVE_STATE, isRunning, liveReducer, type LiveAction } from "@/lib/analysis/live-state";

const [first, second] = sampleExtraction.lines;
const header = {
  documentKind: "devis",
  category: "plomberie",
  readability: "good",
  subject: "Remplacement d'un chauffe-eau électrique",
  department: "69",
} as const;

function replay(actions: readonly LiveAction[]) {
  return actions.reduce(liveReducer, INITIAL_LIVE_STATE);
}

describe("liveReducer", () => {
  it("suit les étapes réelles, puis les lignes dans l'ordre du devis", () => {
    if (!first || !second) throw new Error("fixture incomplète");
    const state = replay([
      { type: "send" },
      { type: "step", step: "received" },
      { type: "step", step: "reading" },
      { type: "header", header },
      { type: "line", index: 1, line: second },
      { type: "line", index: 0, line: first },
      { type: "line", index: 0, line: first },
    ]);
    expect(state).toMatchObject({ status: "streaming", step: "reading", header });
    expect(state.lines.map((entry) => entry.index)).toEqual([0, 1]);
    expect(isRunning(state)).toBe(true);
  });

  it("oublie les lignes reçues quand la lecture recommence", () => {
    if (!first) throw new Error("fixture incomplète");
    const state = replay([
      { type: "send" },
      { type: "step", step: "reading" },
      { type: "line", index: 0, line: first },
      { type: "restart" },
    ]);
    expect(state.lines).toEqual([]);
  });

  it("remplace la lecture provisoire par l'extraction validée", () => {
    const state = replay([
      { type: "send" },
      { type: "step", step: "reading" },
      { type: "extracted", extraction: sampleExtraction, remaining: 3 },
    ]);
    expect(state.status).toBe("extracted");
    expect(state.lines).toHaveLength(sampleExtraction.lines.length);
    expect(state.header?.quoteDate).toBe("2026-09-12");
    expect(state.remaining).toBe(3);
    expect(isRunning(state)).toBe(false);
  });

  it("efface tout ce qui a été lu d'un document refusé", () => {
    if (!first) throw new Error("fixture incomplète");
    const refused: AnalyzeEvent = { type: "refused", reason: "health", message: "Pas encore pris en charge." };
    const state = replay([
      { type: "send" },
      { type: "header", header },
      { type: "line", index: 0, line: first },
      refused,
    ]);
    expect(state).toMatchObject({ status: "refused", header: null, lines: [] });
    expect(state.refusal?.reason).toBe("health");
  });

  it("garde l'erreur et repart de zéro au besoin", () => {
    const failed = replay([
      { type: "send" },
      { type: "error", code: "reading-failed", message: "Échec.", refunded: true },
    ]);
    expect(failed.error).toEqual({ code: "reading-failed", message: "Échec.", refunded: true });
    expect(liveReducer(failed, { type: "reset" })).toEqual(INITIAL_LIVE_STATE);
    expect(liveReducer(failed, { type: "send" }).error).toBeNull();
  });
});
