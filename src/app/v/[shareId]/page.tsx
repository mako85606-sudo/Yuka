import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TrackView } from "@/components/analytics/TrackView";
import { AnalysisView } from "@/components/analyze/AnalysisView";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SharedInvite, SharedSummary } from "@/components/share/SharedConclusion";
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
    ? `Un devis de ${categoryName(shared.data.extraction.category)} vérifié`
    : "Un devis vérifié";
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
 * Page de partage public : le devis vérifié et le verdict, sans rien de
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
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
        <p className="text-sm font-semibold text-brand-strong">Partagé avec Loupe</p>
        <h1 className="mt-3 font-display text-title text-ink">
          {fr(`Un devis de ${categoryName(extraction.category)}, vérifié par Loupe`)}
        </h1>
        <p className="mt-3 max-w-prose text-ink-muted">
          {fr(
            `${place ? `${place}. ` : ""}Vous ne verrez ici ni nom ni adresse : Loupe ne les relève même pas.`,
          )}
        </p>
        <div className="mt-6">
          <AnalysisView
            data={data}
            target="done"
            live={false}
            sheetId={shareId}
            place={place}
            summary={
              <SharedSummary
                verdict={verdict.verdict}
                errors={counts.errors}
                warnings={counts.warnings}
                savings={verdict.savings}
              />
            }
            details={<SharedInvite />}
          />
        </div>
        <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
      </main>
      <SiteFooter />
      <TrackView event="share_page_view" />
    </>
  );
}
