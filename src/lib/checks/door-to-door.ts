import { DOOR_TO_DOOR_RULE } from "@/config/rules";
import type { Finding } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { fr } from "@/lib/typography";
import { isSure } from "./shared";

/** Contrat conclu au domicile : un rappel du délai de rétractation, pas un reproche. */
export function checkDoorToDoor(extraction: Extraction): Finding[] {
  if (!extraction.meta.isDoorToDoorSale) return [];
  const days = DOOR_TO_DOOR_RULE.withdrawalDays;
  return [
    {
      id: "door-to-door",
      ruleId: "door-to-door",
      kind: "reminder",
      confirmed: isSure(extraction.confidence.doorToDoorSale),
      note: fr(`${days} jours pour te rétracter`),
      detail: fr(
        `Contrat signé chez toi : tu disposes en principe de ${days} jours pour changer d'avis, sans avoir à te justifier. Garde le formulaire de rétractation.`,
      ),
      legalRef: DOOR_TO_DOOR_RULE.legalRef,
      ruleVerified: DOOR_TO_DOOR_RULE.verified,
    },
  ];
}
