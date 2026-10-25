import { describe, expect, it } from "vitest";
import { MENTION_RULES } from "@/config/rules";
import type { Extraction } from "@/lib/extraction/schema";
import { cleanExtraction, extractionWith, withLine } from "@/test/extraction";
import { checkDeposit, depositPercent } from "./deposit";
import { checkDoorToDoor } from "./door-to-door";
import { checkMentions } from "./mentions";
import { checkVagueLines, isVagueLine } from "./vague-lines";
import { checkUnknownVatRates, checkVatRatesForCategory } from "./vat-rates";

describe("checkUnknownVatRates", () => {
  it("accepte les taux en vigueur", () => {
    expect(checkUnknownVatRates(cleanExtraction)).toEqual([]);
  });

  it("relève un taux qui n'existe plus (19,6 %)", () => {
    const [finding] = checkUnknownVatRates(withLine(0, { vatRate: 19.6 }));
    expect(finding).toMatchObject({ ruleId: "vat-rate-unknown", kind: "warning", lineIndex: 0 });
    expect(finding?.detail).toContain("19,6");
  });
});

describe("taux de TVA selon le territoire du chantier", () => {
  /** La lecture propre, toutes lignes au même taux, pour un chantier dans `department`. */
  const at = (vatRate: number, department = "69") =>
    extractionWith({ meta: { department }, lines: cleanExtraction.lines.map((line) => ({ ...line, vatRate })) });

  it("accepte 8,5 % en Guadeloupe, et le relève en métropole", () => {
    expect(checkUnknownVatRates(at(8.5, "971"))).toEqual([]);
    const [finding] = checkUnknownVatRates(at(8.5));
    expect(finding).toMatchObject({ ruleId: "vat-rate-unknown", ruleVerified: true });
    expect(finding?.detail).toContain("en France métropolitaine");
  });

  it("relève 20 % en Martinique, sans présenter la règle comme vérifiée", () => {
    const [finding] = checkUnknownVatRates(at(20, "972"));
    expect(finding).toMatchObject({ ruleId: "vat-rate-unknown", ruleVerified: false });
    expect(finding?.detail).toContain("en Guadeloupe, en Martinique et à La Réunion");
    expect(finding?.detail).toContain("8,5");
  });

  it("dit que la TVA ne s'applique pas en Guyane", () => {
    expect(checkUnknownVatRates(at(0, "973"))).toEqual([]);
    const [finding] = checkUnknownVatRates(at(10, "973"));
    expect(finding?.detail).toContain("la TVA n'y est pas applicable");
    expect(finding?.detail).not.toContain("()");
  });

  it("accepte 13 % en Corse, et le relève ailleurs", () => {
    expect(checkUnknownVatRates(at(13, "2A"))).toEqual([]);
    expect(checkUnknownVatRates(at(13))).toHaveLength(1);
  });

  it("ne juge le taux selon le métier qu'en métropole", () => {
    expect(checkVatRatesForCategory(extractionWith({ category: "auto", meta: { department: "974" } }))).toEqual([]);
    expect(checkVatRatesForCategory(extractionWith({ category: "auto" }))).toHaveLength(1);
  });
});

describe("checkVatRatesForCategory", () => {
  it("accepte un taux réduit pour des travaux dans un logement", () => {
    expect(checkVatRatesForCategory(cleanExtraction)).toEqual([]);
  });

  it("s'étonne d'un taux réduit chez un garagiste", () => {
    const findings = checkVatRatesForCategory(extractionWith({ category: "auto" }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "vat-rate-category", ruleVerified: false });
    expect(findings[0]?.detail).toContain("les lignes 1, 2, 3");
  });
});

describe("checkMentions", () => {
  it("ne dit rien quand toutes les mentions sont là", () => {
    expect(checkMentions(cleanExtraction)).toEqual([]);
  });

  it.each(MENTION_RULES.map((rule) => [rule.id, rule] as const))("relève l'absence : %s", (_id, rule) => {
    const extraction =
      rule.field === "quoteDate"
        ? extractionWith({ meta: { quoteDate: undefined } })
        : extractionWith({ issuer: { [rule.field]: false } });
    const findings = checkMentions(extraction);
    expect(findings.map((finding) => finding.id)).toEqual([rule.id]);
    expect(findings[0]).toMatchObject({ kind: rule.severity, ruleVerified: rule.verified });
  });

  it("n'exige l'assurance décennale que pour les travaux du bâtiment", () => {
    const garage = extractionWith({ category: "auto", issuer: { hasInsuranceMention: false } });
    expect(checkMentions(garage)).toEqual([]);
  });

  it("cite le texte propre au corps de métier, et rien si aucun texte connu ne fonde la mention", () => {
    const missingClient = (category: Extraction["category"]) =>
      checkMentions(extractionWith({ category, issuer: { hasClientIdentity: false } }))[0]?.legalRef;
    expect(missingClient("plomberie")).toBe("Arrêté du 24 janvier 2017, art. 4");
    expect(missingClient("demenagement")).toBe("Arrêté du 27 avril 2010, art. 1");
    expect(missingClient("auto")).toBeUndefined();
    const [name] = checkMentions(extractionWith({ category: "auto", issuer: { hasCompanyName: false } }));
    expect(name?.legalRef).toBe("Code de la consommation, art. R111-1");
  });

  it("présente l'absence « à confirmer » si les mentions ont été mal lues", () => {
    const [finding] = checkMentions(extractionWith({ issuer: { hasSiret: false }, confidence: { issuer: "low" } }));
    expect(finding?.confirmed).toBe(false);
  });
});

describe("checkDeposit", () => {
  it("ne dit rien d'un acompte de 30 % ou moins", () => {
    expect(checkDeposit(extractionWith({ meta: { depositPercent: 30 } }))).toEqual([]);
    expect(checkDeposit(cleanExtraction)).toEqual([]);
  });

  it("signale un acompte élevé, sans jamais parler d'illégalité", () => {
    const [finding] = checkDeposit(extractionWith({ meta: { depositPercent: 50 } }));
    expect(finding).toMatchObject({ ruleId: "deposit-high", kind: "warning" });
    expect(finding?.detail).not.toMatch(/ill[ée]gal/i);
  });

  it("déduit le pourcentage d'un acompte en euros", () => {
    const extraction = extractionWith({ meta: { depositAmount: 491.15 } });
    expect(depositPercent(extraction)).toBe(50);
    expect(checkDeposit(extraction)).toHaveLength(1);
  });
});

describe("checkDoorToDoor", () => {
  it("ne dit rien d'un devis signé hors démarchage", () => {
    expect(checkDoorToDoor(cleanExtraction)).toEqual([]);
  });

  it("rappelle le délai de rétractation d'un contrat signé à domicile", () => {
    const findings = checkDoorToDoor(extractionWith({ meta: { isDoorToDoorSale: true } }));
    expect(findings.map((finding) => finding.ruleId)).toEqual(["door-to-door"]);
    expect(findings[0]).toMatchObject({ kind: "reminder" });
    expect(findings[0]?.detail).toContain("14");
  });

  it("signale un acompte demandé sur un contrat signé à domicile", () => {
    const findings = checkDoorToDoor(extractionWith({ meta: { isDoorToDoorSale: true, depositPercent: 30 } }));
    expect(findings.map((finding) => finding.ruleId)).toEqual(["door-to-door", "door-to-door-payment"]);
    expect(findings[1]).toMatchObject({ kind: "warning", confirmed: true, ruleVerified: false });
    expect(findings[1]?.detail).toContain("7");
    expect(findings[1]?.detail).not.toMatch(/illégal/i);
  });

  it("garde l'acompte « à confirmer » s'il a été mal lu", () => {
    const findings = checkDoorToDoor(
      extractionWith({ meta: { isDoorToDoorSale: true, depositAmount: 500 }, confidence: { deposit: "low" } }),
    );
    expect(findings[1]).toMatchObject({ ruleId: "door-to-door-payment", confirmed: false });
  });
});

describe("checkVagueLines", () => {
  it("ne dit rien de lignes précises", () => {
    expect(checkVagueLines(cleanExtraction)).toEqual([]);
    expect(isVagueLine({ label: "Raccords, flexibles et petites fournitures", confidence: "high", totalHT: 35 })).toBe(false);
    expect(isVagueLine({ label: "Frais de déplacement", confidence: "high", totalHT: 45 })).toBe(false);
  });

  it("relève « Forfait divers » et ses cousins", () => {
    for (const label of ["Forfait divers", "Fournitures", "Prestations complémentaires", "Travaux divers"]) {
      expect(isVagueLine({ label, confidence: "high", totalHT: 120 })).toBe(true);
    }
    const [finding] = checkVagueLines(withLine(2, { label: "Forfait divers", totalHT: 45, unitPriceHT: 45 }));
    expect(finding).toMatchObject({ id: "vague-line-2", lineIndex: 2, amount: 45 });
  });

  it("laisse passer une petite ligne vague", () => {
    expect(isVagueLine({ label: "Divers", confidence: "high", totalHT: 9.8 })).toBe(false);
  });
});
