import { describe, expect, it } from "vitest";
import { fr } from "@/lib/typography";

const NBSP = " ";

describe("fr", () => {
  it("colle les signes doubles au mot qui précède", () => {
    expect(fr("C'est vraiment gratuit ?")).toBe(`C'est vraiment gratuit${NBSP}?`);
    expect(fr("Attention : ligne vague ; à vérifier !")).toBe(
      `Attention${NBSP}: ligne vague${NBSP}; à vérifier${NBSP}!`,
    );
  });

  it("garde les guillemets avec leur contenu", () => {
    expect(fr("pas de « partenaire recommandé »")).toBe(
      `pas de «${NBSP}partenaire recommandé${NBSP}»`,
    );
  });

  it("garde l'euro avec son montant", () => {
    expect(fr("890 € HT")).toBe(`890${NBSP}€ HT`);
  });

  it("ne touche pas au reste", () => {
    expect(fr("Ton devis, corrigé.")).toBe("Ton devis, corrigé.");
  });
});
