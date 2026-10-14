import { describe, expect, it } from "vitest";
import { SERVER_STEPS, type ServerStep } from "@/lib/phases";
import { stepState } from "./StepTracker";

const available: readonly ServerStep[] = ["received", "reading"];
const states = (step: Parameters<typeof stepState>[1], running: boolean, failed = false) =>
  SERVER_STEPS.map((target) => stepState(target, step, running, available, failed));

describe("stepState", () => {
  it("n'allume que les étapes atteintes par le serveur", () => {
    expect(states("idle", true)).toEqual(["upcoming", "upcoming", "unavailable", "unavailable", "unavailable"]);
    expect(states("reading", true)).toEqual(["done", "current", "unavailable", "unavailable", "unavailable"]);
  });

  it("termine l'étape atteinte quand le serveur a fini", () => {
    expect(states("reading", false)).toEqual(["done", "done", "unavailable", "unavailable", "unavailable"]);
  });

  it("marque l'étape interrompue par une erreur", () => {
    expect(states("reading", false, true)).toEqual([
      "done",
      "failed",
      "unavailable",
      "unavailable",
      "unavailable",
    ]);
  });
});
