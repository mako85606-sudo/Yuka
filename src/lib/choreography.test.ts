import { describe, expect, it } from "vitest";
import {
  CHECKS_PHASE_TARGET,
  endOf,
  ISSUE_DURATION,
  ISSUE_INTERVAL,
  issueBeats,
  issuesSchedule,
  lineSchedule,
  MIN_ISSUE_INTERVAL,
  priceSchedule,
  verdictBeats,
} from "@/lib/choreography";
import { durations, STAMP_IMPACT } from "@/lib/motion";

describe("lineSchedule", () => {
  it("espace les lignes de 50 ms sur un devis normal", () => {
    const lines = lineSchedule(8);
    expect(lines).toHaveLength(8);
    expect(lines[1]!.start - lines[0]!.start).toBeCloseTo(0.05, 10);
  });

  it("ne descend jamais sous 40 ms ni au-dessus de 60 ms d'écart", () => {
    for (const count of [2, 5, 12, 20, 26]) {
      const lines = lineSchedule(count);
      const gap = lines[1]!.start - lines[0]!.start;
      expect(gap).toBeGreaterThanOrEqual(0.04 - 1e-9);
      expect(gap).toBeLessThanOrEqual(0.06 + 1e-9);
    }
  });

  it("tient en 1,2 s, même pour un très long devis", () => {
    for (const count of [1, 10, 30, 80]) {
      const lines = lineSchedule(count);
      const last = lines.at(-1)!;
      expect(endOf(last)).toBeLessThanOrEqual(durations.blockMax + 1e-9);
    }
  });

  it("décale tout le bloc avec startAt", () => {
    expect(lineSchedule(3, { startAt: 2 })[0]!.start).toBe(2);
  });

  it("n'échelonne rien en mouvement réduit : un seul fondu de 150 ms", () => {
    const lines = lineSchedule(6, { reduced: true, startAt: 1 });
    expect(new Set(lines.map((line) => line.start))).toEqual(new Set([1]));
    expect(lines.every((line) => line.duration === 0.15)).toBe(true);
  });
});

describe("issueBeats", () => {
  it("surligne, puis entoure, puis annote", () => {
    const { highlight, circle, note } = issueBeats();
    expect(highlight.start).toBe(0);
    expect(highlight.duration).toBe(0.28);
    expect(circle.start).toBeCloseTo(endOf(highlight), 10);
    expect(circle.duration).toBe(0.45);
    expect(note.start).toBeGreaterThan(circle.start);
  });

  it("tient sous 1,2 s par problème", () => {
    expect(ISSUE_DURATION).toBeLessThanOrEqual(durations.blockMax);
  });
});

describe("issuesSchedule", () => {
  it("enchaîne les premiers problèmes au rythme d'une main", () => {
    const issues = issuesSchedule(3);
    expect(issues[1]!.highlight.start).toBeCloseTo(ISSUE_INTERVAL, 10);
    expect(issues[2]!.highlight.start).toBeCloseTo(2 * ISSUE_INTERVAL, 10);
  });

  it("resserre l'écart quand il y a beaucoup de problèmes, sans passer sous le minimum", () => {
    const issues = issuesSchedule(12);
    const gap = issues[1]!.highlight.start - issues[0]!.highlight.start;
    expect(gap).toBeGreaterThanOrEqual(MIN_ISSUE_INTERVAL);
    expect(gap).toBeLessThan(ISSUE_INTERVAL);
  });

  it("garde la phase dans sa cible tant que le minimum le permet", () => {
    const issues = issuesSchedule(6);
    expect(endOf(issues.at(-1)!.note)).toBeLessThanOrEqual(CHECKS_PHASE_TARGET + 1e-9);
  });
});

describe("priceSchedule", () => {
  it("anime chaque compteur en 600 ms au plus, et le bloc en 1,2 s", () => {
    for (const count of [1, 3, 10]) {
      const prices = priceSchedule(count);
      expect(prices.every((price) => price.duration <= 0.6)).toBe(true);
      expect(endOf(prices.at(-1)!)).toBeLessThanOrEqual(durations.blockMax + 1e-9);
    }
  });
});

describe("verdictBeats", () => {
  it("secoue la feuille et projette l'encre à l'impact du tampon", () => {
    const beats = verdictBeats({ startAt: 3 });
    expect(beats.impact).toBeCloseTo(3 + STAMP_IMPACT, 10);
    expect(beats.shake.start).toBe(beats.impact);
    expect(beats.shake.duration).toBe(0.12);
    expect(beats.ink.start).toBe(beats.impact);
  });

  it("se contente d'un fondu en mouvement réduit", () => {
    const beats = verdictBeats({ startAt: 3, reduced: true });
    expect(beats.stamp).toEqual({ start: 3, duration: 0.15 });
  });
});
