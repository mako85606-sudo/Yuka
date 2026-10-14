import "server-only";
import { cache } from "react";
import { shareableAnalysis, type SharedView } from "@/lib/analysis/share";
import type { VerdictResult } from "@/lib/analysis/result";
import { loadSharedAnalysis } from "@/server/analysis/store";
import { getDb } from "@/server/db/client";

export interface SharedPage extends SharedView {
  readonly shareId: string;
  readonly verdict: VerdictResult;
}

/**
 * La part publique d'une analyse partagée, ou `null` (lien inconnu, analyse
 * expirée, pas de base). Mise en cache le temps d'une requête : la page, ses
 * métadonnées et son image la lisent chacune.
 */
export const getSharedPage = cache(async (shareId: string): Promise<SharedPage | null> => {
  const db = getDb();
  if (!db) return null;
  const analysis = await loadSharedAnalysis(db, shareId);
  if (!analysis) return null;
  const view = shareableAnalysis({
    shareId,
    region: analysis.region,
    createdAt: analysis.createdAt,
    extraction: analysis.extraction,
    findings: analysis.findings,
    prices: analysis.prices,
    pricesComplete: analysis.pricesComplete,
    verdict: analysis.verdict,
  });
  return { ...view, shareId, verdict: view.data.verdict ?? analysis.verdict };
});
