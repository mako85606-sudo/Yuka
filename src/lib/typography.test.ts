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

  it("garde une unité avec son nombre", () => {
    expect(fr("Chauffe-eau 200 L, classe C")).toBe(`Chauffe-eau 200${NBSP}L, classe C`);
    expect(fr("Disjoncteur 16 A")).toBe(`Disjoncteur 16${NBSP}A`);
    expect(fr("Peinture, 45 m² et 3 h")).toBe(`Peinture, 45${NBSP}m² et 3${NBSP}h`);
    expect(fr("Livraison 2 rue Haute, 3 couches")).toBe("Livraison 2 rue Haute, 3 couches");
  });

  it("ne touche pas au reste", () => {
    expect(fr("Ton devis, corrigé.")).toBe("Ton devis, corrigé.");
  });
});
