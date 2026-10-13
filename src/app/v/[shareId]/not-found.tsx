import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

/** Lien de partage inconnu ou expiré. */
export default function SharedNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <h1 className="font-display text-title text-ink">{fr("Ce lien a fait son temps.")}</h1>
        <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
          {fr(
            `Une correction partagée reste visible ${limits.analysisRetentionDays} jours, puis elle est effacée. Tu as un devis à faire relire ?`,
          )}
        </p>
        <ButtonLink href="/analyse" size="lg" className="mt-8">
          Corriger mon devis
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
