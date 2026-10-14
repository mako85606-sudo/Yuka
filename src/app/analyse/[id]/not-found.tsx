import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

/** Lien d'analyse inconnu ou expiré. */
export default function AnalysisNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <h1 className="font-display text-title text-ink">{fr("Cette analyse n'est plus là.")}</h1>
        <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
          {fr(
            `Soit le lien est incomplet, soit l'analyse a dépassé ses ${limits.analysisRetentionDays} jours et a été effacée. Ton devis, lui, n'a jamais été conservé.`,
          )}
        </p>
        <ButtonLink href="/analyse" size="lg" className="mt-8">
          Analyser un devis
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
