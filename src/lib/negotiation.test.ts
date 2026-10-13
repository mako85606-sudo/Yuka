import { describe, expect, it } from "vitest";
import { expectedExtraction, quoteFixtures } from "@/fixtures/quotes/definitions";
import type { PriceOpinion } from "@/lib/analysis/result";
import { runChecks } from "@/lib/checks";
import type { Extraction } from "@/lib/extraction/schema";
import { aiOpinion, loupeOpinion } from "@/lib/pricing/opinions";
import { cleanExtraction, extractionWith, withLine } from "@/test/extraction";
import { buildNegotiation } from "./negotiation";

const plain = (text: string) => text.replace(/[  ]/g, " ");

function fixture(id: string): Extraction {
  const found = quoteFixtures.find((item) => item.id.startsWith(id));
  if (!found) throw new Error(`${id} introuvable`);
  return expectedExtraction(found);
}

function message(extraction: Extraction, prices: readonly PriceOpinion[] = []) {
  return buildNegotiation({ extraction, findings: runChecks(extraction), prices });
}

describe("buildNegotiation", () => {
  it("n'écrit rien quand il n'y a rien de vérifié à demander", () => {
    expect(message(cleanExtraction)).toBeNull();
  });

  it("signale poliment les erreurs de calcul et demande un devis corrigé", () => {
    const result = message(fixture("02"));
    if (!result) throw new Error("message attendu");
    const body = plain(result.email.body);
    expect(plain(result.email.subject)).toBe("Votre devis du 22/09/2026 (Remplacement des freins avant) : quelques questions");
    expect(body).toMatch(/^Bonjour,\n\nMerci pour votre devis du 22\/09\/2026/);
    expect(body).toContain("Ligne « Disques de frein avant (paire) » : il me semble que 1 × 189,90 € font 189,90 €, et non 198,90 €.");
    expect(body).toContain("Total TTC : le total HT et la TVA donnent 492,72 €, alors que le devis indique 502,72 €.");
    expect(body).toContain("Pourriez-vous m'envoyer un devis corrigé ?");
    expect(body.trimEnd().endsWith("Cordialement,")).toBe(true);
  });

  it("demande ce qui manque, le détail d'une ligne vague, et propose un acompte plus bas", () => {
    const locksmith = plain(message(fixture("04"))?.email.body ?? "");
    expect(locksmith).toContain("Pourriez-vous compléter le devis avec votre numéro SIRET et sa durée de validité ?");
    expect(locksmith).toContain("Pourriez-vous détailler ce que comprend la ligne « ");
    expect(locksmith).toContain("Total HT : la somme des lignes donne 472 €, alors que le devis indique 462 €.");

    const heatPump = plain(message(fixture("05"))?.email.body ?? "");
    expect(heatPump).toContain("limiter l'acompte à 30 %");
    // La rétractation est un droit du client : pas une question pour l'artisan.
    expect(heatPump).not.toMatch(/rétract/i);
    expect(heatPump).not.toContain("devis corrigé");
  });

  it("ne s'appuie ni sur une estimation IA ni sur un chiffre mal lu", () => {
    const misread = withLine(1, { totalHT: 184, confidence: "low" });
    const ai = aiOpinion(0, { unit: "unite", unitPrice: 2000, quantity: 1 }, { low: 400, high: 600 });
    expect(message(misread, [ai])).toBeNull();
  });

  it("cite la médiane de la base Loupe pour un prix nettement au-dessus", () => {
    const loupe = loupeOpinion(0, { unit: "unite", unitPrice: 689, quantity: 1 }, [500, 520, 540, 560, 580]);
    if (!loupe) throw new Error("avis attendu");
    const body = plain(message(cleanExtraction, [loupe])?.email.body ?? "");
    expect(body).toContain(
      "Le poste « Chauffe-eau électrique 200 L » est facturé 689 € HT / u ; pour la même prestation, les devis comparables de ma région se situent plutôt autour de 540 € HT.",
    );
    // Un écart faible ne justifie pas de demander une baisse.
    const close = loupeOpinion(0, { unit: "unite", unitPrice: 560, quantity: 1 }, [500, 520, 540, 560, 580]);
    expect(message(cleanExtraction, close ? [close] : [])).toBeNull();
  });

  it("reste courtois : ni accusation, ni mot qui fâche", () => {
    const messy = extractionWith({
      issuer: { hasSiret: false, hasCompanyName: false, hasInsuranceMention: false },
      meta: { depositPercent: 60 },
      totals: { totalTTC: 1200 },
    });
    const result = message(messy);
    const all = `${result?.email.subject} ${result?.email.body} ${result?.sms}`;
    expect(all).not.toMatch(/illégal|arnaque|escro|fraude|abus|vol\b|mensonge|tromp/i);
    expect(all).not.toMatch(/\btu\b|\bton\b|\btes\b/i);
    expect(plain(result?.email.body ?? "")).toContain("attestation d'assurance professionnelle (décennale)");
  });

  it("tient en un SMS court, sans espace insécable, avec trois points au plus", () => {
    const messy = extractionWith({
      issuer: { hasSiret: false, hasValidityDate: false },
      meta: { depositPercent: 60 },
      totals: { totalTTC: 1200 },
      lines: [
        { ...cleanExtraction.lines[0]!, label: "Fourniture et pose d'un chauffe-eau thermodynamique 270 L avec kit hydraulique", totalHT: 700 },
        ...cleanExtraction.lines.slice(1),
      ],
    });
    const sms = message(messy)?.sms ?? "";
    expect(sms).not.toMatch(/[  ]/);
    expect(sms.length).toBeLessThanOrEqual(480);
    expect(sms).toContain("…");
    expect(sms).toContain("je peux vous les envoyer par email");
    expect(sms.startsWith("Bonjour, merci pour votre devis du 14/09/2026")).toBe(true);
  });
});
