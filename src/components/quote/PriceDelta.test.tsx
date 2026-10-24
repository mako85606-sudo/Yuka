import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PriceDelta } from "./PriceDelta";

describe("PriceDelta", () => {
  it("marque une estimation IA pour les machines, et pas un prix de la base Loupe", () => {
    const ai = renderToStaticMarkup(<PriceDelta amount={40} source={{ kind: "ai" }} />);
    expect(ai).toContain('data-ai-generated="true"');
    expect(ai).toContain('data-price-source="ai"');

    const loupe = renderToStaticMarkup(<PriceDelta amount={40} source={{ kind: "loupe", comparables: 23 }} />);
    expect(loupe).not.toContain("data-ai-generated");
    expect(loupe).toContain('data-price-source="loupe"');
  });
});
