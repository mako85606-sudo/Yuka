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
    ["Virement sur FR7630006000011234567890189", `Virement sur ${REDACTED}`],
    ["IBAN FR76 3000 6000 0112 3456 7890 189", `IBAN ${REDACTED}`],
    ["TVA intracom FR12123456789", `TVA intracom ${REDACTED}`],
    ["Diagnostic VIN VF3ABCDEF12345678", `Diagnostic VIN ${REDACTED}`],
    ["Révision ab-123-cd", `Révision ${REDACTED}`],
    ["Devis N° client 456789", `Devis ${REDACTED}`],
    ["Réf. client 12-345-678", REDACTED],
    ["Dossier 2025/1234", REDACTED],
    ["Voir www.exemple-arnaque.fr", `Voir ${REDACTED}`],
    ["Lien https://bit.ly/3abcd", `Lien ${REDACTED}`],
    ["Contact plomberie-durand.fr", `Contact ${REDACTED}`],
    ["Chantier 3 av. Foch", `Chantier ${REDACTED}`],
    ["Chantier 12 r. de la Paix", `Chantier ${REDACTED}`],
    ["Chantier 28 Grande Rue", `Chantier ${REDACTED}`],
    ["Résidence Les Tilleuls apt 12", REDACTED],
    ["Déplacement 75019 paris", `Déplacement ${REDACTED}`],
    ["Déplacement 20000 Ajaccio", `Déplacement ${REDACTED}`],
    ["Pose chez M Dupont", `Pose chez ${REDACTED}`],
    ["Pose chez Mr. Dupont", `Pose chez ${REDACTED}`],
    ["Pose chez Mme. Martin", `Pose chez ${REDACTED}`],
    ["Visite Dr Martin", `Visite ${REDACTED}`],
    ["Étude Maître Durand", `Étude ${REDACTED}`],
    ["Travaux Famille Dupont", `Travaux ${REDACTED}`],
    ["Travaux Chez Dupont", `Travaux ${REDACTED}`],
    ["Client : Jean Dupont", REDACTED],
    ["Pose chez M. et Mme Dupont", `Pose chez ${REDACTED}`],
    ["Pose chez Monsieur Jean-Pierre DE LA FONTAINE", `Pose chez ${REDACTED}`],
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
    "Remplacement chauffe-eau 200 L",
    "Main-d'œuvre 2 h",
    "Disjoncteur 20 A",
    "Robinet M12",
    "Tube PER 16 mm",
    "Tube cuivre de 200 mm",
    "Lot de 10000 vis",
    "Consommation 25000 kWh",
    "Ballon thermodynamique 270 L COP 3,2",
    "Bureau 2 places",
    "Pose 2 routes d'accès",
    "Kit no frost",
    "Remplacement disque et plaquettes AV",
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

  it("reste rapide sur un texte piégé très long", () => {
    const trap = `${"a".repeat(60_000)}@`;
    const started = performance.now();
    anonymizeText(trap);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
