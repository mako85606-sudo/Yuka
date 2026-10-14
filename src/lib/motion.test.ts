import { spring } from "motion";
import { describe, expect, it } from "vitest";
import {
  angles,
  durations,
  offsets,
  reducedFade,
  shakeKeyframes,
  springs,
  STAMP_IMPACT,
  stagger,
} from "@/lib/motion";

/** Simule un spring de `from` à `to` et renvoie sa trajectoire (pas de 1 ms). */
function simulate(from: number, to: number, options: { visualDuration: number; bounce: number }) {
  const generator = spring({ keyframes: [from, to], ...options });
  const samples: { t: number; value: number }[] = [];
  for (let t = 0; t <= 3000; t += 1) {
    const { value, done } = generator.next(t);
    samples.push({ t: t / 1000, value });
    if (done) break;
  }
  return samples;
}

describe("règles du brief", () => {
  it("garde les micro-interactions entre 150 et 250 ms", () => {
    expect(durations.micro).toBeGreaterThanOrEqual(0.15);
    expect(durations.microSlow).toBeLessThanOrEqual(0.25);
  });

  it("fait du mouvement réduit un fondu de 150 ms", () => {
    expect(durations.reducedFade).toBe(0.15);
    const transition = reducedFade(0.4) as {
      default: { duration: number; delay: number };
      opacity: { duration: number; delay: number };
    };
    expect(transition.default.duration).toBe(0);
    expect(transition.opacity).toMatchObject({ duration: 0.15, delay: 0.4 });
  });

  it("respecte les gestes de la correction", () => {
    expect(durations.highlight).toBe(0.28);
    expect(durations.circle).toBe(0.45);
    expect(durations.counter).toBeLessThanOrEqual(0.6);
    expect(durations.shake).toBe(0.12);
    expect(durations.blockMax).toBe(1.2);
    expect(stagger.lines).toBeGreaterThanOrEqual(0.04);
    expect(stagger.lines).toBeLessThanOrEqual(0.06);
  });

  it("dépose la feuille de 40 px et de 3° vers −0,6°", () => {
    expect(offsets.sheetDropY).toBe(40);
    expect(angles.sheetDrop).toBe(3);
    expect(angles.sheetRest).toBe(-0.6);
  });

  it("fait tomber le tampon de 1,6 à 1, penché entre −12° et −8°", () => {
    expect(offsets.stampFromScale).toBe(1.6);
    expect(angles.stampMin).toBe(-12);
    expect(angles.stampMax).toBe(-8);
  });

  it("secoue la feuille de 2 px au plus, et la ramène en place", () => {
    expect(Math.max(...shakeKeyframes.map(Math.abs))).toBe(2);
    expect(shakeKeyframes[0]).toBe(0);
    expect(shakeKeyframes.at(-1)).toBe(0);
  });
});

describe("springs nommés", () => {
  it("existent sous les noms gentle, snappy et stamp", () => {
    expect(Object.keys(springs).sort()).toEqual(["gentle", "snappy", "stamp"]);
  });

  it("donne au tampon un léger dépassement, sans rebond exagéré", () => {
    const samples = simulate(offsets.stampFromScale, 1, springs.stamp);
    const lowest = Math.min(...samples.map((sample) => sample.value));
    expect(lowest).toBeLessThan(1);
    expect(lowest).toBeGreaterThan(0.95);
  });

  it("place l'impact au premier contact du tampon avec la feuille (±20 ms)", () => {
    const samples = simulate(offsets.stampFromScale, 1, springs.stamp);
    const contact = samples.find((sample) => sample.value <= 1);
    expect(contact).toBeDefined();
    expect(Math.abs((contact?.t ?? 0) - STAMP_IMPACT)).toBeLessThanOrEqual(0.02);
  });

  it("pose la feuille sans rebond visible", () => {
    const samples = simulate(offsets.sheetDropY, 0, springs.gentle);
    const lowest = Math.min(...samples.map((sample) => sample.value));
    expect(lowest).toBeGreaterThan(-1);
  });
});
