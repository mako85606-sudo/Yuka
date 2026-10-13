import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";
import { fr } from "@/lib/typography";

/** Page introuvable, pour tout le site. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <p className="font-mono text-label uppercase text-ink-muted">Erreur 404</p>
        <h1 className="mt-2 font-display text-title text-ink">{fr("Cette page n'existe pas.")}</h1>
        <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
          {fr("Le lien est peut-être incomplet. Rien de grave : ton devis, lui, t'attend toujours.")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/analyse" size="lg">
            Corriger mon devis
          </ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">
            Revenir à l&apos;accueil
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
