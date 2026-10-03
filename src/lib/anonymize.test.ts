import { describe, expect, it } from "vitest";
import { anonymizeText, containsPersonalData, REDACTED } from "@/lib/anonymize";

describe("anonymizeText", () => {
  it.each([
    ["Devis envoyé à camille.dupont@exemple.fr", `Devis envoyé à ${REDACTED}`],
    ["Rappeler au 06 12 34 56 78", `Rappeler au ${REDACTED}`],
    ["Contact 06.12.34.56.78 ou +33 4 72 00 00 00", `Contact ${REDACTED} ou ${REDACTED}`],
    ["Révision véhicule AB-123-CD", `Révision véhicule ${REDACTED}`],
    ["Révision 1234 AB 69", `Révision ${REDACTED}`],
    ["Intervention au 12 bis, rue des Lilas, Lyon", `Intervention au ${REDACTED}, Lyon`],
    ["Chantier 3 avenue Foch", `Chantier ${REDACTED}`],
    ["Déplacement 69003 Lyon", `Déplacement ${REDACTED}`],
    ["Déplacement 42000 SAINT-ETIENNE", `Déplacement ${REDACTED}`],
    ["Remplacement chez M. Dupont", `Remplacement chez ${REDACTED}`],
    ["Pose chez Mme Camille Martin", `Pose chez ${REDACTED}`],
    ["Client MME DURAND", `Client ${REDACTED}`],
    ["SIRET 812 345 678 00019", `SIRET ${REDACTED}`],
    ["Chaudière n° de série 20251234567", `Chaudière n° de série ${REDACTED}`],
  ])("retire les données personnelles de « %s »", (input, expected) => {
    expect(anonymizeText(input)).toBe(expected);
  });

  it.each([
    "Chauffe-eau électrique 200 L, vertical",
    "Main-d'œuvre, pose (4 h)",
    "Pneu 205/55 R16 91V",
    "Disjoncteur 16 A, courbe C",
    "Chaudière gaz à condensation 24 kW",
    "Câble 3G2,5 mm²",
    "Remise 10 %",
    "Forfait déplacement zone 2",
    "Kit d'embrayage complet + volant moteur bimasse",
    "Peinture murs et plafond, 2 couches, 45 m²",
    "Monte-meuble 2 heures, 3e étage",
  ])("laisse intact le libellé technique « %s »", (label) => {
    expect(anonymizeText(label)).toBe(label);
    expect(containsPersonalData(label)).toBe(false);
  });

  it("garde l'espace avant les deux-points, à la française", () => {
    expect(anonymizeText("Main-d'œuvre : pose")).toBe("Main-d'œuvre : pose");
    expect(anonymizeText("Pose ,  dépose")).toBe("Pose, dépose");
  });

  it("fusionne les masques qui se suivent", () => {
    expect(anonymizeText("M. Dupont, 06 12 34 56 78, dupont@exemple.fr")).toBe(REDACTED);
  });

  it("repère ce qu'il reste à masquer", () => {
    expect(containsPersonalData("Appeler le 06 12 34 56 78")).toBe(true);
    expect(containsPersonalData(anonymizeText("Appeler le 06 12 34 56 78"))).toBe(false);
  });
});
