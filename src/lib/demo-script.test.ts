import { describe, expect, it } from "vitest";
import { blockDuration, canAdvance, demoScript, nextPhase } from "@/lib/demo-script";
import { SERVER_STEPS } from "@/lib/phases";

const counts = { lines: 6, issues: 2, prices: 2 };

describe("demoScript", () => {
  it("rejoue les étapes du serveur dans l'ordre, puis termine", () => {
    const phases = demoScript(counts).map((step) => step.phase);
    expect(phases).toEqual([...SERVER_STEPS, "done"]);
  });

  it("avance toujours dans le temps", () => {
    const times = demoScript(counts).map((step) => step.at);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i]).toBeGreaterThan(times[i - 1]!);
    }
  });

  it("reste courte : la démo complète tient en moins de 6 s", () => {
    expect(demoScript(counts).at(-1)!.at).toBeLessThan(6);
  });

  it("va beaucoup plus vite en mouvement réduit", () => {
    const reduced = demoScript(counts, true).at(-1)!.at;
    expect(reduced).toBeLessThan(2);
    expect(reduced).toBeLessThan(demoScript(counts).at(-1)!.at);
  });
});

describe("rythme de l'analyse réelle", () => {
  it("ne passe à l'étape suivante que si le serveur l'a atteinte", () => {
    expect(canAdvance("idle", "received")).toBe(true);
    expect(canAdvance("reading", "reading")).toBe(false);
    expect(canAdvance("checking", "done")).toBe(true);
    expect(canAdvance("done", "done")).toBe(false);
    expect(nextPhase("verdict")).toBe("done");
    expect(nextPhase("done")).toBeNull();
  });

  it("laisse à chaque bloc le temps de se jouer, 1,2 s au plus par geste groupé", () => {
    expect(blockDuration("checking", counts)).toBeGreaterThan(blockDuration("checking", { ...counts, issues: 0 }));
    expect(blockDuration("pricing", counts)).toBeLessThanOrEqual(1.2 + 0.2);
    expect(blockDuration("idle", counts)).toBe(0);
    expect(blockDuration("done", counts)).toBe(0);
  });

  it("en direct, ne rejoue pas la lecture : les lignes sont déjà là", () => {
    expect(blockDuration("reading", counts, { live: true })).toBeLessThan(blockDuration("reading", counts));
  });

  it("enchaîne vite en mouvement réduit", () => {
    for (const phase of SERVER_STEPS) {
      expect(blockDuration(phase, counts, { reduced: true })).toBeLessThan(0.4);
    }
  });
});
