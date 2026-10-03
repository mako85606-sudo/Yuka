import type { ReactNode } from "react";
import { CheckIllustration } from "@/components/landing/CheckIllustration";
import { EmailSignup } from "@/components/landing/EmailSignup";
import { Faq } from "@/components/landing/Faq";
import { PenTick } from "@/components/landing/PenTick";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { StickyCta } from "@/components/landing/StickyCta";
import { DemoLoop } from "@/components/scene/DemoLoop";
import { ButtonLink } from "@/components/ui/Button";
import { demoQuotes } from "@/fixtures/demo-quotes";
import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";

const HERO_CTA_ID = "scanner-mon-devis";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="pb-24 sm:pb-0">
        <Hero />
        <Checks />
        <Trust />
        <Questions />
        <Signup />
      </main>
      <SiteFooter />
      <StickyCta targetId={HERO_CTA_ID} />
    </>
  );
}

/**
 * Au-dessus de la ligne de flottaison : le titre, le bouton, et la démo qui
 * tourne. Sur mobile, les promesses passent sous la démo pour que celle-ci
 * apparaisse dès le premier écran.
 */
function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 pb-20 pt-4 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:gap-14 lg:pb-28">
      <div className="lg:pt-12">
        <p className="mb-4 hidden font-mono text-label uppercase text-ink-muted sm:block">
          Garage, plomberie, électricité, travaux…
        </p>
        <h1 className="font-display text-display text-ink">
          Ton devis, corrigé <em className="text-pen-red-strong">au stylo rouge</em> en
          30&nbsp;secondes.
        </h1>
        <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-muted sm:mt-6 sm:text-[1.0625rem]">
          Prends-le en photo. Loupe vérifie les calculs et les mentions obligatoires, compare chaque
          prix et te prépare un message pour négocier, poliment.
        </p>
        <div className="mt-7 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center sm:gap-6">
          <ButtonLink id={HERO_CTA_ID} href="/analyse" size="xl" className="w-full sm:w-auto">
            <CameraGlyph />
            Scanner mon devis
          </ButtonLink>
          <a
            href="#verifications"
            className="hidden text-[0.95rem] text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink sm:inline"
          >
            Ce qu&apos;on vérifie
          </a>
        </div>
        <Promises className="mt-6 hidden lg:flex" />
      </div>
      <div>
        <DemoLoop quotes={demoQuotes} />
        <Promises className="mt-8 lg:hidden" />
      </div>
    </section>
  );
}

const PROMISES = [
  "Gratuit, sans compte",
  "Aucun artisan partenaire",
  "Ton devis n'est jamais conservé",
] as const;

function Promises({ className }: { readonly className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:flex-wrap sm:gap-x-5",
        className,
      )}
    >
      {PROMISES.map((promise) => (
        <li key={promise} className="flex items-center gap-2">
          <PenTick />
          {promise}
        </li>
      ))}
    </ul>
  );
}

function SectionHeading({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="font-display text-title text-ink">
        {fr(title)}
      </h2>
      {children ? (
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-muted">{children}</p>
      ) : null}
    </div>
  );
}

const CHECKS = [
  {
    kind: "calculation",
    title: "Les calculs",
    text: "Quantité × prix unitaire, total HT, TVA, total TTC. Une erreur de calcul, on l'entoure en rouge. Ce n'est pas un avis, c'est de l'arithmétique.",
  },
  {
    kind: "mentions",
    title: "Les mentions obligatoires",
    text: "Durée de validité, décompte détaillé, assurance pour les travaux, frais de déplacement… On repère ce qui manque, sans jouer les juristes.",
  },
  {
    kind: "prices",
    title: "Les prix",
    text: "Chaque ligne comparée à des devis similaires de ta région, quand on en a au moins cinq. Sinon, une estimation IA, annoncée comme telle, avec sa confiance.",
  },
] as const;

function Checks() {
  return (
    <section aria-labelledby="verifications" className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
        <SectionHeading id="verifications" title="Ce qu'on vérifie">
          Une relecture complète, ligne par ligne, comme le ferait un prof un peu tatillon.
        </SectionHeading>
        <ul className="mt-14 grid gap-14 md:grid-cols-3 md:gap-10">
          {CHECKS.map((check) => (
            <li key={check.kind} className="flex flex-col gap-7">
              {/* Les fiches reposent sur une même ligne, les titres s'alignent. */}
              <div className="md:flex md:min-h-[12rem] md:items-end">
                <CheckIllustration kind={check.kind} />
              </div>
              <div>
                <h3 className="font-display text-[1.75rem] leading-tight text-ink">{check.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{fr(check.text)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 font-mono text-label uppercase text-ink-muted">
          {fr("Illustrations : exemples fictifs")}
        </p>
      </div>
    </section>
  );
}

const COMMITMENTS = [
  {
    title: "Indépendant",
    text: "Aucun artisan ne nous paie. Pas de commission, pas de lien affilié, pas de « partenaire recommandé ».",
  },
  {
    title: "Sans pub",
    text: "Pas de publicité, pas de revente de données. Les avis de Loupe ne sont à vendre à personne.",
  },
  {
    title: "Ton devis n'est jamais conservé",
    text: "La photo ou le PDF est lu en mémoire, puis effacé. On garde seulement des lignes anonymes, la catégorie et le département, pour affiner les comparaisons.",
  },
] as const;

function Trust() {
  return (
    <section aria-labelledby="confiance" className="border-t border-rule bg-paper-raised">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
        <SectionHeading id="confiance" title="Pourquoi nous faire confiance" />
        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {COMMITMENTS.map((commitment) => (
            <li key={commitment.title} className="border-t-2 border-ink pt-5">
              <h3 className="font-display text-[1.75rem] leading-tight text-ink">
                {commitment.title}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-muted">{fr(commitment.text)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Questions() {
  return (
    <section aria-labelledby="faq" className="border-t border-rule">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16 lg:py-28">
        <SectionHeading id="faq" title="Questions fréquentes" />
        <Faq />
      </div>
    </section>
  );
}

function Signup() {
  return (
    <section aria-labelledby="inscription" className="border-t border-rule">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end lg:gap-16 lg:py-28">
        <SectionHeading id="inscription" title="On te prévient ?">
          {fr(
            "Nouvelles catégories, rapport détaillé, prix plus précis dans ta région : un email quand il y a du nouveau.",
          )}
        </SectionHeading>
        <EmailSignup />
      </div>
    </section>
  );
}

function CameraGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5 fill-none stroke-current" strokeWidth={1.6}>
      <path
        d="M3 6.5h2.6l1.3-2h6.2l1.3 2H17a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="3" />
    </svg>
  );
}
