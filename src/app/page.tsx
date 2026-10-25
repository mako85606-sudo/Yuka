import { Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { TrackView } from "@/components/analytics/TrackView";
import { EmailSignup } from "@/components/landing/EmailSignup";
import { Faq } from "@/components/landing/Faq";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PhoneDemo } from "@/components/landing/phone/PhoneDemo";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { StickyCta } from "@/components/landing/StickyCta";
import { ButtonLink } from "@/components/ui/Button";
import { CameraGlyph, CheckGlyph, EraseGlyph, LockGlyph, ShieldGlyph } from "@/components/ui/icons";
import { limits } from "@/config/limits";
import { plumbingQuote } from "@/fixtures/demo-quotes";
import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";

const HERO_CTA_ID = "scanner-mon-devis";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      {/* Garde-fou : rien de décoratif ne doit élargir la page. */}
      <main className="overflow-x-clip pb-24 sm:pb-0">
        <Hero />
        <Steps />
        <Commitments />
        <Signup />
      </main>
      <SiteFooter />
      <StickyCta targetId={HERO_CTA_ID} />
      <TrackView event="landing_view" />
    </>
  );
}

const PROMISES = [
  "Gratuit et sans inscription",
  "Aucun artisan ne nous paie",
  "Photo effacée après lecture",
] as const;

/** L'italique du titre, le seul mot en italique du site : chargée sur l'accueil seulement. */
const displayItalic = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Le premier écran : la promesse, le bouton, et à droite un téléphone qui
 * montre l'application sur un devis fictif (photo, analyse, résultat).
 */
function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-14 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:pb-24 lg:pt-14">
      <div className="max-w-xl">
        <p className="inline-flex rounded-sm bg-brand-soft px-2.5 py-1 text-sm font-medium text-brand-strong">
          Garagiste, plombier, électricien, serrurier…
        </p>
        <h1 className="mt-6 font-display text-hero text-ink">
          Ne payez plus un devis <em className={cn(displayItalic.className, "text-brand-strong")}>trop cher.</em>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-ink-muted lg:text-xl lg:leading-relaxed">
          {fr(
            "Prenez votre devis en photo : en 30 secondes, Loupe vérifie les calculs, les mentions obligatoires et les prix, puis vous dit combien vous pouvez économiser.",
          )}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <ButtonLink id={HERO_CTA_ID} href="/analyse" size="xl">
            <CameraGlyph />
            Scanner mon devis
          </ButtonLink>
          {/* Sur mobile, le téléphone et « Comment ça marche » suivent juste en dessous. */}
          <div className="hidden sm:block">
            <ButtonLink href="#comment" variant="secondary" size="xl">
              Comment ça marche
            </ButtonLink>
          </div>
        </div>
        <ul className="mt-9 flex flex-col gap-2.5 text-[0.95rem] text-ink sm:flex-row sm:flex-wrap sm:gap-x-6">
          {PROMISES.map((promise) => (
            <li key={promise} className="flex items-center gap-2">
              <CheckGlyph className="size-[1.15rem] text-brand-strong" />
              {promise}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto lg:mx-0 lg:mr-6">
        {/* Le socle du téléphone : un aplat vert pâle, sans dégradé. */}
        <span aria-hidden className="absolute -inset-x-10 bottom-[14%] top-[10%] rounded-lg bg-brand-soft sm:-inset-x-16" />
        <PhoneDemo quote={plumbingQuote} className="relative text-[12.5px] sm:text-[13.5px] xl:text-[14px]" />
        <p className="relative mt-4 text-center text-sm text-ink-muted">Exemple fictif, à titre d&apos;illustration</p>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="text-sm font-semibold text-brand-strong">{eyebrow}</p>
      <h2 id={id} className="mt-3 font-display text-section text-ink">
        {fr(title)}
      </h2>
      {children ? <p className="mt-5 text-lg leading-relaxed text-ink-muted">{children}</p> : null}
    </div>
  );
}

/** « Comment ça marche », en quatre écrans. */
function Steps() {
  return (
    <section id="comment" aria-labelledby="comment-titre" className="scroll-mt-4 border-t border-rule">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
        <SectionHeading id="comment-titre" eyebrow="Comment ça marche" title="Une photo, trente secondes, et vous savez quoi négocier." />
        <div className="mt-12 lg:mt-16">
          <HowItWorks quote={plumbingQuote} />
        </div>
      </div>
    </section>
  );
}

const COMMITMENTS = [
  {
    icon: ShieldGlyph,
    title: "Indépendant",
    text: "Aucun artisan ne nous paie, aucune publicité, aucun lien sponsorisé. Le verdict ne dépend que de votre devis.",
  },
  {
    icon: EraseGlyph,
    title: "Votre devis n'est pas conservé",
    text: "La photo ou le PDF est lu en mémoire puis effacé. Nous ne gardons que des lignes anonymes, pour affiner les comparaisons de prix.",
  },
  {
    icon: LockGlyph,
    title: "Ni compte, ni revente",
    text: `Votre analyse s'ouvre par un lien privé, qui expire au bout de ${limits.analysisRetentionDays} jours. Vos données ne sont jamais vendues.`,
  },
] as const;

/** Nos engagements, puis les questions fréquentes, sur un fond gris-vert très pâle. */
function Commitments() {
  return (
    <section id="engagements" aria-labelledby="engagements-titre" className="scroll-mt-4 bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-8 lg:py-28">
        <SectionHeading id="engagements-titre" eyebrow="Nos engagements" title="Indépendant, et de votre côté.">
          {fr(
            "Chaque remarque dit si elle est vérifiée (un calcul, une mention) ou estimée (un prix), et d'où elle vient. Une estimation par IA est toujours présentée comme telle.",
          )}
        </SectionHeading>
        <ul className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-14 lg:gap-6">
          {COMMITMENTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-lg bg-paper-raised p-7 elevation-1">
              <span className="grid size-11 place-items-center rounded-md bg-brand-soft text-brand-strong">
                <Icon />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{fr(title)}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{fr(text)}</p>
            </li>
          ))}
        </ul>

        <div id="faq" className="mt-24 grid scroll-mt-4 gap-10 lg:mt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:gap-16">
          <div>
            <h2 className="font-display text-section text-ink">Questions fréquentes</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">
              {fr("Gratuité, vie privée, origine des prix : l'essentiel avant de scanner votre premier devis.")}
            </p>
          </div>
          <div className="rounded-lg bg-paper-raised px-6 elevation-1 sm:px-8">
            <Faq />
          </div>
        </div>
      </div>
    </section>
  );
}

/** L'inscription, discrète, en fin de page. */
function Signup() {
  return (
    <section aria-labelledby="inscription">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 rounded-lg border border-rule p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-center lg:gap-16 lg:p-10">
          <div>
            <h2 id="inscription" className="font-display text-[2.25rem] leading-tight text-ink">
              {fr("On vous prévient ?")}
            </h2>
            <p className="mt-3 max-w-lg leading-relaxed text-ink-muted">
              {fr(
                "Un email quand Loupe saura lire de nouveaux métiers, ou quand le rapport détaillé sera prêt. Rarement, et seulement quand cela en vaut la peine.",
              )}
            </p>
          </div>
          <EmailSignup />
        </div>
      </div>
    </section>
  );
}
