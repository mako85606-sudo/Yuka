import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TrackView } from "@/components/analytics/TrackView";
import { AnalysisView } from "@/components/analyze/AnalysisView";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SharedConclusion } from "@/components/share/SharedConclusion";
import { CATEGORY_LABELS } from "@/config/taxonomy";
import { site } from "@/config/site";
import { shareCounts } from "@/lib/analysis/share";
import { fr } from "@/lib/typography";
import { getSharedPage } from "@/server/analysis/shared-view";

function categoryName(category: keyof typeof CATEGORY_LABELS): string {
  return CATEGORY_LABELS[category].toLowerCase();
}

export async function generateMetadata({ params }: PageProps<"/v/[shareId]">): Promise<Metadata> {
  await connection();
  const { shareId } = await params;
  const shared = await getSharedPage(shareId);
  const title = shared?.data.extraction
    ? `Un devis de ${categoryName(shared.data.extraction.category)} corrigé`
    : "Un devis corrigé";
  return {
    title,
    description: site.description,
    // Partageable sur les réseaux, mais jamais indexé par les moteurs de recherche.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: { title: `${title} · ${site.name}`, description: site.tagline, type: "article", locale: "fr_FR" },
    twitter: { card: "summary_large_image", title: `${title} · ${site.name}`, description: site.tagline },
  };
}

/**
 * Page de partage public : la feuille corrigée et le verdict, sans rien de
 * personnel (région au lieu du département, aucune date, aucun rappel privé,
 * aucun message), puis une invitation à corriger son propre devis.
 */
export default async function SharedAnalysisPage({ params }: PageProps<"/v/[shareId]">) {
  await connection();
  const { shareId } = await params;
  const shared = await getSharedPage(shareId);
  if (!shared?.data.extraction) notFound();
  const { data, place, verdict } = shared;
  const extraction = shared.data.extraction;
  const counts = shareCounts(data.findings ?? []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <p className="font-mono text-label uppercase text-ink-muted">Partagé avec Loupe</p>
        <h1 className="mt-2 font-display text-title text-ink">
          {fr(`Un devis de ${categoryName(extraction.category)}, corrigé au stylo rouge`)}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          {fr(
            `${place ? `${place}. ` : ""}Tu ne verras ici ni nom ni adresse : Loupe ne les relève même pas.`,
          )}
        </p>
        <div className="mt-4">
          <AnalysisView
            data={data}
            target="done"
            live={false}
            sheetId={shareId}
            place={place}
            conclusion={
              <SharedConclusion
                verdict={verdict.verdict}
                errors={counts.errors}
                warnings={counts.warnings}
                savings={verdict.savings}
              />
            }
          />
        </div>
        <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
      </main>
      <SiteFooter />
      <TrackView event="share_page_view" />
    </>
  );
}
