import { describe, expect, it } from "vitest";
import { HOSTING_BODY_LIMIT_BYTES, limits } from "@/config/limits";

describe("limits", () => {
  it("garde l'envoi sous le plafond de l'hébergeur, enveloppe multipart comprise", () => {
    expect(limits.maxUploadBytes + 64 * 1024).toBeLessThanOrEqual(HOSTING_BODY_LIMIT_BYTES);
  });

  it("laisse à l'analyse un budget plus court que la durée maximale de la route (120 s)", () => {
    expect(limits.analysisBudgetMs).toBeLessThan(120_000);
  });
});
