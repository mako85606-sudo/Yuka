import { describe, expect, it } from "vitest";
import type { Finding, PriceOpinion } from "@/lib/analysis/result";
import { runChecks } from "@/lib/checks";
import { aiOpinion, loupeOpinion } from "@/lib/pricing/opinions";
import { extractionWith } from "@/test/extraction";
import { groupFindings, quotedPriceText, referenceText, savingsRelyOnAi, savingsText } from "./result-view";

const NBSP = " ";
const NNBSP = " ";
/** Espaces insécables (fines ou non) ramenées à des espaces, pour lire les attentes. */
const plain = (text: string) => text.replaceAll(NBSP, " ").replaceAll(NNBSP, " ");

describe("groupFindings", () => {
  it("sépare les erreurs sûres, les points d'attention, ce qui est à confirmer et les rappels", () => {
    const findings = runChecks(
      extractionWith({
        issuer: { hasCompanyName: false, hasSiret: false, hasValidityDate: false },
        meta: { isDoorToDoorSale: true, depositPercent: 50 },
        totals: { totalTTC: 990 },
        confidence: { totals: "low" },
      }),
    );
    const groups = groupFindings(findings);
    const ids = (list: readonly Finding[]) => list.map((finding) => finding.ruleId);
    expect(ids(groups.errors)).toEqual(["mention-company-name"]);
    expect(ids(groups.warnings)).toEqual(
      expect.arrayContaining(["mention-siret", "mention-validity", "deposit-high", "door-to-door-payment"]),
    );
    expect(ids(groups.toConfirm)).toEqual(["total-ttc"]);
    expect(ids(groups.reminders)).toEqual(["door-to-door"]);
  });
});

describe("savingsText", () => {
  it("dit une économie sans en rajouter", () => {
    expect(plain(savingsText({ low: 21, high: 21 }))).toBe("21 €");
    expect(plain(savingsText({ low: 40, high: 1200 }))).toBe("40 à 1 200 €");
    expect(plain(savingsText({ low: 0, high: 120 }))).toBe("jusqu'à 120 €");
    // Au centime pour un montant exact, arrondi vers le bas pour une fourchette.
    expect(plain(savingsText({ low: 20.8, high: 20.8 }))).toBe("20,80 €");
    expect(plain(savingsText({ low: 129.9, high: 149.6 }))).toBe("129 à 149 €");
  });
});

describe("références de prix", () => {
  const price = { unit: "heure" as const, unitPrice: 58, quantity: 3 };

  it("montre la médiane et l'écart habituel de la base Loupe", () => {
    const opinion = loupeOpinion(1, price, [40, 45, 50, 55, 60]) as PriceOpinion;
    expect(plain(quotedPriceText(opinion))).toBe("58 € HT / h × 3");
    expect(plain(referenceText(opinion))).toBe("Médiane : 50 € HT / h · la moitié des devis entre 45 € et 55 €");
    const cents = loupeOpinion(1, { ...price, unitPrice: 42.5, quantity: 1 }, [40, 45, 50, 55, 61]) as PriceOpinion;
    expect(plain(quotedPriceText(cents))).toBe("42,50 € HT / h");
    expect(savingsRelyOnAi([opinion])).toBe(false);
  });

  it("présente une estimation IA comme une fourchette, sans médiane ni marché", () => {
    const opinion = aiOpinion(1, price, { low: 45, high: 52 });
    const text = plain(referenceText(opinion));
    expect(text).toBe("Fourchette estimée : 45 € à 52 € HT / h");
    expect(text).not.toMatch(/médiane|marché/i);
    expect(savingsRelyOnAi([opinion])).toBe(true);
    expect(savingsRelyOnAi([aiOpinion(1, price, { low: 45, high: 70 })])).toBe(false);
  });
});
