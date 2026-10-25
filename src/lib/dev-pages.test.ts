import { describe, expect, it } from "vitest";
import { devPagesEnabled } from "@/lib/dev-pages";

describe("devPagesEnabled", () => {
  it("montre les pages /dev en développement, ou sur demande", () => {
    expect(devPagesEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devPagesEnabled({ NODE_ENV: "production", ENABLE_DEV_PAGES: "true" })).toBe(true);
  });

  it("les masque sur tout site en ligne, Vercel ou non", () => {
    expect(devPagesEnabled({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
    expect(devPagesEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(false);
    expect(devPagesEnabled({ NODE_ENV: "production" })).toBe(false);
  });
});
