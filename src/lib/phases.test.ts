import { describe, expect, it } from "vitest";
import { hasReached, SERVER_STEPS } from "@/lib/phases";

describe("étapes du serveur", () => {
  it("suivent l'ordre du brief", () => {
    expect(SERVER_STEPS).toEqual(["received", "reading", "checking", "pricing", "verdict"]);
  });

  it("savent si une étape est atteinte", () => {
    expect(hasReached("checking", "reading")).toBe(true);
    expect(hasReached("checking", "checking")).toBe(true);
    expect(hasReached("reading", "verdict")).toBe(false);
    expect(hasReached("idle", "received")).toBe(false);
    expect(hasReached("done", "verdict")).toBe(true);
  });
});
