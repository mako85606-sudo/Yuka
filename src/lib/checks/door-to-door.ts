import { DOOR_TO_DOOR_RULE } from "@/config/rules";
import type { Finding } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { fr } from "@/lib/typography";
import { depositPercent } from "./deposit";
import { isSure } from "./shared";

/**
 * Contrat conclu hors des locaux de l'entreprise : un rappel du délai de
 * rétractation et de l'interdiction d'encaisser avant 7 jours, pas un
 * reproche. Si un acompte est demandé, un point d'attention en plus.
 */
export function checkDoorToDoor(extraction: Extraction): Finding[] {
  if (!extraction.meta.isDoorToDoorSale) return [];
  const { withdrawalDays: days, noPaymentDays } = DOOR_TO_DOOR_RULE;
  const sure = isSure(extraction.confidence.doorToDoorSale);
  const findings: Finding[] = [
    {
      id: "door-to-door",
      ruleId: "door-to-door",
      kind: "reminder",
      confirmed: sure,
      note: fr(`${days} jours pour vous rétracter`),
      detail: fr(
        `Contrat signé hors des locaux de l'entreprise (à votre domicile, par exemple) : vous disposez en principe de ${days} jours pour vous rétracter, sans avoir à vous justifier. Le délai part de la signature, ou de la livraison du matériel si le contrat en comprend. Aucun paiement ni acompte ne peut en principe vous être demandé avant ${noPaymentDays} jours. Ces règles ne s'appliquent pas aux réparations urgentes que vous avez vous-même demandées, dans la limite de ce qui est strictement nécessaire. Conservez le formulaire de rétractation joint au contrat.`,
      ),
      legalRef: DOOR_TO_DOOR_RULE.legalRef,
      ruleVerified: DOOR_TO_DOOR_RULE.verified,
    },
  ];
  const { depositAmount } = extraction.meta;
  const deposit = depositPercent(extraction);
  if ((deposit !== undefined && deposit > 0) || (depositAmount !== undefined && depositAmount > 0)) {
    findings.push({
      id: "door-to-door-payment",
      ruleId: "door-to-door-payment",
      kind: "warning",
      confirmed: sure && isSure(extraction.confidence.deposit),
      note: fr(`Pas de paiement avant ${noPaymentDays} jours`),
      detail: fr(
        `Ce contrat est signé hors des locaux de l'entreprise et prévoit un acompte. En principe, aucun paiement, chèque ou autorisation de prélèvement ne peut vous être demandé avant ${noPaymentDays} jours après la signature, sauf pour une réparation urgente que vous avez demandée.`,
      ),
      legalRef: DOOR_TO_DOOR_RULE.paymentLegalRef,
      ruleVerified: DOOR_TO_DOOR_RULE.verified,
    });
  }
  return findings;
}
