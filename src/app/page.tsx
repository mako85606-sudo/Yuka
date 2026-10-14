import type { ReactNode } from "react";
import { TrackView } from "@/components/analytics/TrackView";
import { CheckIllustration } from "@/components/landing/CheckIllustration";
import { EmailSignup } from "@/components/landing/EmailSignup";
import { Faq } from "@/components/landing/Faq";
import { HeroSheet } from "@/components/landing/HeroSheet";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PenTick } from "@/components/landing/PenTick";
import { Ringed } from "@/components/landing/Ringed";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { StickyCta } from "@/components/landing/StickyCta";
import { TradeCarousel } from "@/components/landing/TradeCarousel";
import { ButtonLink } from "@/components/ui/Button";
import { CameraGlyph, ScissorsGlyph } from "@/components/ui/icons";
import { plumbingQuote } from "@/fixtures/demo-quotes";
import { tradeQuotes } from "@/fixtures/trade-quotes";
import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";

const HERO_CTA_ID = "scanner-mon-devis";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      {/* Garde-fou : une goutte d'encre ou une pièce ne doit jamais élargir la page. */}
      <main className="overflow-x-clip pb-24 sm:pb-0">
        <Hero />
        <Story />
        <Trades />
        <Checks />
        <Trust />
        <Questions />
        <Signup />
      </main>
      <SiteFooter />
      <StickyCta targetId={HERO_CTA_ID} />
      <TrackView event="landing_view" />
    </>
  );
}

/**
 * Au-dessus de la ligne de flottaison : le titre, le bouton, et la feuille
 * du devis corrigé, posée de travers sur le bureau. Sur grand écran, elle
 * déborde du bord droit ; partout, son pied glisse sous la section suivante.
 */
function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-8 sm:pt-10 lg:pb-12 lg:pt-14">
        <div className="lg:max-w-[calc(100vw-35rem-max(2rem,50vw-34rem)-3rem)] xl:max-w-[min(36rem,calc(100vw-40rem-max(2rem,50vw-34rem)-4rem))]">
          <p className="mb-4 hidden font-mono text-label uppercase text-ink-muted sm:block">
            Garagiste, plombier, électricien, serrurier…
          </p>
          <h1 className="font-display text-display text-ink lg:text-[clamp(3.5rem,1rem+4.4vw,5.25rem)]">
            Ton devis, corrigé <em className="text-pen-red-strong">au stylo rouge</em> en
            30&nbsp;secondes.
          </h1>
          <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-muted sm:mt-6 sm:text-[1.0625rem]">
            Un chauffe-eau posé pour <Ringed seed="hero-prix">1&nbsp;527&nbsp;€</Ringed>, c&apos;est le bon prix&nbsp;? Prends le devis en photo.
            Loupe refait les multiplications, cherche les mentions qui manquent et compare chaque ligne
            aux devis de ta région. S&apos;il y a un souci, tu repars avec un message à envoyer à
            l&apos;artisan.
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
          <Promises className="mt-6" />
        </div>

        {/*
          La feuille : dans le flux sur mobile (elle déborde à droite et passe sous la
          section suivante), posée à droite du titre sur grand écran, débordant du bord.
        */}
        <div className="relative -mb-[9.5rem] -mr-4 mt-10 text-[13px] sm:-mr-8 sm:text-[15px] lg:absolute lg:right-0 lg:top-12 lg:m-0 lg:w-[40em] lg:text-[14px] xl:top-16 xl:text-[16px]">
          <p className="mb-3 font-mono text-label uppercase text-ink-muted lg:ml-[1.4em]">
            Choisis une ligne, le stylo passe dessus
          </p>
          <HeroSheet quote={plumbingQuote} />
        </div>
      </div>
    </section>
  );
}

const PROMISES = [
  "Gratuit et sans inscription",
  "Aucun artisan ne nous paie",
  "La photo est effacée après lecture",
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
          <PenTick seed={promise} />
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
      <h2 id={id} className="font-display text-section text-ink">
        {fr(title)}
      </h2>
      {children ? (
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-muted lg:text-[1.25rem]">{children}</p>
      ) : null}
    </div>
  );
}

/** « Comment ça marche », raconté au défilement, sur le devis de garage du carrousel. */
function Story() {
  const quote = tradeQuotes[0];
  if (!quote) return null;
  return (
    <section aria-labelledby="comment" className="relative z-10 border-t border-rule bg-paper">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-8 lg:pb-16 lg:pt-24">
        <SectionHeading id="comment" title="Comment ça marche">
          Tu t&apos;occupes de la photo. Le reste prend une <Ringed seed="demi-minute" shape="wide">demi-minute</Ringed>.
        </SectionHeading>
        <div className="mt-8 lg:mt-0">
          <HowItWorks quote={quote} />
        </div>
      </div>
    </section>
  );
}

/** Six métiers, six devis qui se corrigent en glissant. */
function Trades() {
  return (
    <section aria-labelledby="metiers">
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-8 lg:pt-20">
        <SectionHeading id="metiers" title="Du garage au déménageur">
          {fr(
            "Une ouverture de porte à 390 €, un « forfait intervention » jamais détaillé, des cartons mal comptés… Fais glisser les fiches pour voir chaque exemple se corriger.",
          )}
        </SectionHeading>
      </div>
      <div className="mx-auto mt-8 max-w-6xl pb-16 lg:pb-20">
        <TradeCarousel quotes={tradeQuotes} />
      </div>
    </section>
  );
}

const CHECKS = [
  {
    kind: "calculation",
    title: "Les calculs",
    text: "Quantité fois prix unitaire, puis le total HT, la TVA et le TTC. Une faute de calcul se démontre : on l'entoure en rouge et on écrit le bon chiffre au-dessus.",
  },
  {
    kind: "mentions",
    title: "Les mentions obligatoires",
    text: "Durée de validité, détail des prestations, assurance pour les travaux, frais de déplacement… On te signale ce qui manque sur la feuille. Pour savoir ce que ça change en droit, mieux vaut demander à une association de consommateurs.",
  },
  {
    kind: "prices",
    title: "Les prix",
    text: "Dès qu'on a au moins cinq devis comparables dans ta région, tu vois où se situe le tien par rapport à la médiane. En dessous, c'est une estimation par IA, et on te le dit en toutes lettres.",
  },
] as const;

/** Chaque fiche est posée sur le bureau avec son propre angle, et alterne de côté. */
const CHECK_TILTS = [-1.4, 1, -0.6] as const;

function Checks() {
  return (
    <section aria-labelledby="verifications">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
        <SectionHeading id="verifications" title="Ce qu'on vérifie">
          <Ringed seed="ligne-par-ligne" shape="wide">Ligne par ligne</Ringed>, avec la patience d&apos;un prof de maths qui corrige des
          copies le dimanche soir.
        </SectionHeading>
        <ol className="mt-12 space-y-14 lg:mt-16 lg:space-y-6">
          {CHECKS.map((check, index) => (
            <li
              key={check.kind}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-20"
            >
              {/* La fiche, agrandie sur grand écran, d'un côté puis de l'autre. */}
              <div
                className={cn("flex justify-center lg:py-6 lg:[zoom:1.3]", index % 2 === 1 && "lg:order-2")}
                style={{ rotate: `${CHECK_TILTS[index % CHECK_TILTS.length]}deg` }}
              >
                <CheckIllustration kind={check.kind} />
              </div>
              <div className={cn("max-w-lg", index % 2 === 1 && "lg:order-1 lg:justify-self-end")}>
                <p aria-hidden className="font-display text-[3.5rem] leading-none text-ink-muted lg:text-[4.5rem]">
                  {index + 1}
                </p>
                <h3 className="mt-2 font-display text-[2rem] leading-tight text-ink lg:text-[2.6rem]">{check.title}</h3>
                <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-muted lg:text-[1.2rem]">{fr(check.text)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 font-mono text-label uppercase text-ink-muted">
          {fr("Illustrations : exemples fictifs")}
        </p>
      </div>
    </section>
  );
}

const COMMITMENTS = [
  {
    title: "Être payés par des artisans",
    text: "Loupe ne touche rien si tu choisis un pro plutôt qu'un autre, et ne te pousse vers personne. Il n'y a pas d'annuaire sponsorisé caché derrière le verdict.",
  },
  {
    title: "Vendre tes données",
    text: "Tu ne verras aucune publicité ici, et ton adresse mail ne finira jamais chez un courtier ou une plateforme de devis.",
  },
  {
    title: "Garder ton devis",
    text: "La photo ou le PDF est lu en mémoire puis effacé. On conserve seulement des lignes rendues anonymes (« chauffe-eau 200 L, 890 € HT »), la catégorie et le département, pour que les comparaisons s'affinent avec le temps.",
  },
] as const;

/**
 * « Ce qu'on s'interdit », comme un règlement imprimé posé sur le bureau :
 * chaque interdit est barré au stylo rouge.
 */
function Trust() {
  return (
    <section aria-labelledby="confiance">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
        <div className="surface-paper sheet-shadow-rest relative rounded-[2px] px-6 pb-10 pt-12 sm:px-10 lg:px-14 lg:pb-14 lg:pt-16" style={{ rotate: "-0.4deg" }}>
          <span aria-hidden className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 bg-tape/85 [clip-path:polygon(0_10%,4%_0,96%_8%,100%_0,97%_50%,100%_100%,95%_92%,5%_100%,0_90%,3%_50%)]" style={{ rotate: "2deg" }} />
          <span aria-hidden className="paper-grain pointer-events-none absolute inset-0" />
          <h2 id="confiance" className="font-display text-section text-ink">
            {fr("Ce qu'on s'interdit")}
          </h2>
          <ol className="mt-10 grid gap-10 border-t-2 border-ink pt-10 md:grid-cols-3 md:gap-12">
            {COMMITMENTS.map((commitment, index) => (
              <li key={commitment.title}>
                <p aria-hidden className="font-mono text-label uppercase text-ink-muted">{`Article ${index + 1}`}</p>
                <h3 className="mt-3 font-display text-[1.9rem] leading-tight text-ink decoration-pen-red decoration-[0.09em] line-through lg:text-[2.2rem]">
                  {commitment.title}
                </h3>
                <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-muted">{fr(commitment.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Les questions, sur une copie double à grands carreaux, marge rouge comprise. */
function Questions() {
  return (
    <section aria-labelledby="faq">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8 lg:py-20">
        <div className="surface-paper seyes-paper sheet-shadow-rest relative rounded-[2px] pb-8 pl-12 pr-6 pt-10 sm:pl-24 sm:pr-12 lg:pb-12 lg:pt-14" style={{ rotate: "0.4deg" }}>
          <span aria-hidden className="absolute inset-y-0 left-8 w-px bg-margin-rule sm:left-16" />
          <h2 id="faq" className="font-display text-section text-ink">
            {fr("Avant de te lancer")}
          </h2>
          <Faq ruled className="mt-8" />
        </div>
      </div>
    </section>
  );
}

/** L'inscription, sur un coupon à découper. */
function Signup() {
  return (
    <section aria-labelledby="inscription">
      <div className="mx-auto max-w-4xl px-4 pb-10 pt-8 sm:px-8 sm:pb-20 lg:pb-28">
        <div className="surface-paper sheet-shadow-rest relative rounded-[2px] p-3 sm:p-4" style={{ rotate: "-0.6deg" }}>
          <div className="relative grid gap-8 border-2 border-dashed border-rule-strong px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end lg:gap-12 lg:px-10 lg:py-10">
            <ScissorsGlyph className="absolute -top-[0.8rem] left-6 size-6 bg-paper-raised px-0.5 text-ink-muted" />
            <SectionHeading id="inscription" title="On te prévient ?">
              {fr(
                "Un mail le jour où Loupe saura lire les devis de nouveaux métiers, ou quand le rapport détaillé sera prêt. Rarement, et seulement quand ça vaut le coup.",
              )}
            </SectionHeading>
            <EmailSignup />
          </div>
        </div>
      </div>
    </section>
  );
}
