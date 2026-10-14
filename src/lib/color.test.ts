import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex, relativeLuminance } from "@/lib/color";

describe("parseHex", () => {
  it("lit les formes courte et longue", () => {
    expect(parseHex("#FFE45C")).toEqual([255, 228, 92]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });

  it("refuse une valeur invalide", () => {
    expect(() => parseHex("rouge")).toThrow();
  });
});

describe("contraste WCAG", () => {
  it("connaît les bornes", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#D7372B", "#D7372B")).toBe(1);
  });

  it("est symétrique", () => {
    expect(contrastRatio("#16140F", "#F6F3EC")).toBeCloseTo(
      contrastRatio("#F6F3EC", "#16140F"),
      10,
    );
  });
});
