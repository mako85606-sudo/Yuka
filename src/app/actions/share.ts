"use server";

import { fr } from "@/lib/typography";
import { ensureShareId } from "@/server/analysis/store";
import { getDb } from "@/server/db/client";

export type ShareLinkResult =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly message: string };

/**
 * Lien de partage public d'une analyse. Qui a le lien privé (l'identifiant
 * de l'analyse) peut le créer ; le lien public, lui, n'ouvre que la page
 * anonyme (`/v/[shareId]`), jamais l'analyse privée.
 */
export async function createShareLink(analysisId: string): Promise<ShareLinkResult> {
  const db = getDb();
  if (!db || typeof analysisId !== "string") {
    return { ok: false, message: fr("Le partage n'est pas disponible pour le moment.") };
  }
  try {
    const shareId = await ensureShareId(db, analysisId);
    if (!shareId) return { ok: false, message: fr("Cette analyse a expiré : elle ne peut plus être partagée.") };
    return { ok: true, path: `/v/${shareId}` };
  } catch (error) {
    console.error("[partage] création du lien impossible", error);
    return { ok: false, message: fr("Petit souci de notre côté : réessaie dans un instant.") };
  }
}
