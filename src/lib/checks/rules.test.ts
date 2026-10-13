import { describe, expect, it } from "vitest";
import { MENTION_RULES } from "@/config/rules";
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
    const [finding] = checkDoorToDoor(extractionWith({ meta: { isDoorToDoorSale: true } }));
    expect(finding).toMatchObject({ ruleId: "door-to-door", kind: "reminder" });
    expect(finding?.detail).toContain("14");
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
