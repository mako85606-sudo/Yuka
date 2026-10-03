import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { fitWithin, jpegName } from "@/lib/image-compression";

describe("fitWithin", () => {
  it("ramène une photo de téléphone à 1600 px de large, proportions gardées", () => {
    expect(fitWithin({ width: 3024, height: 4032 }, limits.photoMaxWidth, limits.photoMaxHeight)).toEqual({
      width: 1600,
      height: 2133,
    });
  });

  it("limite aussi la hauteur des photos très allongées", () => {
    expect(fitWithin({ width: 2000, height: 6000 }, 1600, 2400)).toEqual({ width: 800, height: 2400 });
  });

  it("n'agrandit jamais une petite photo", () => {
    expect(fitWithin({ width: 900, height: 1200 }, 1600, 2400)).toEqual({ width: 900, height: 1200 });
  });
});

describe("jpegName", () => {
  it("remplace l'extension par .jpg", () => {
    expect(jpegName("IMG_2041.HEIC")).toBe("IMG_2041.jpg");
    expect(jpegName("scan.devis.png")).toBe("scan.devis.jpg");
    expect(jpegName("photo")).toBe("photo.jpg");
    expect(jpegName(".png")).toBe("page.jpg");
  });
});
