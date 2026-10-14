"use server";

import { fr } from "@/lib/typography";
import { deleteAnalysis } from "@/server/analysis/store";
import { getDb } from "@/server/db/client";

export type DeleteAnalysisResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

/** Supprime une analyse : qui a son lien privé peut l'effacer, sans attendre les 30 jours. */
export async function deleteAnalysisNow(analysisId: string): Promise<DeleteAnalysisResult> {
  const db = getDb();
  if (!db || typeof analysisId !== "string") {
    return { ok: false, message: fr("La suppression n'est pas disponible pour le moment.") };
  }
  try {
    await deleteAnalysis(db, analysisId);
    // Déjà absente (expirée, ou supprimée ailleurs) : le résultat est le même.
    return { ok: true };
  } catch (error) {
    console.error("[analyse] suppression impossible", error);
    return { ok: false, message: fr("La suppression a échoué de notre côté. Réessaie dans un instant.") };
  }
}
