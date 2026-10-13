import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AnalysisView } from "@/components/analyze/AnalysisView";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { site } from "@/config/site";
import { headerFromExtraction, type AnalysisData } from "@/lib/analysis/live-state";
import { formatShortDate } from "@/lib/format";
import { fr } from "@/lib/typography";
import { loadAnalysis, type LoadedAnalysis } from "@/server/analysis/store";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = {
  title: "Ton devis corrigé",
  // Un verdict est privé : jamais indexé, et l'adresse ne fuit pas vers les liens sortants.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function viewData(analysis: LoadedAnalysis): AnalysisData {
  const { extraction } = analysis;
  return {
    header: headerFromExtraction(extraction),
    lines: extraction.lines.map((line, index) => ({ index, line })),
    extraction,
    findings: analysis.findings,
    prices: analysis.prices,
    pricesComplete: analysis.pricesComplete,
    verdict: analysis.verdict,
    analysisId: analysis.id,
    expiresAt: analysis.expiresAt.toISOString(),
    correctedAt: analysis.createdAt.toISOString(),
    remaining: null,
  };
}

/**
 * Une analyse rouverte par son lien (identifiant aléatoire, 30 jours) : la
 * correction se rejoue en entier, puis la conclusion et le message.
 */
export default async function AnalysisPage({ params }: PageProps<"/analyse/[id]">) {
  // Rendu à chaque visite : une analyse expire, elle ne doit jamais rester en cache.
  await connection();
  const { id } = await params;
  const db = getDb();
  const analysis = db ? await loadAnalysis(db, id) : null;
  if (!analysis) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <h1 className="font-display text-title text-ink">Ton devis corrigé</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {fr(
            `Analyse du ${formatShortDate(analysis.createdAt)}, consultable jusqu'au ${formatShortDate(analysis.expiresAt)}.`,
          )}
        </p>
        <div className="mt-4">
          <AnalysisView data={viewData(analysis)} target="done" live={false} sheetId={analysis.id} />
        </div>
        <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
      </main>
      <SiteFooter />
    </>
  );
}
