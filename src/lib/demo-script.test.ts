import { describe, expect, it } from "vitest";
import { demoScript } from "@/lib/demo-script";
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
