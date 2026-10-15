import { Children, isValidElement, type ReactNode } from "react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { CheckGlyph } from "@/components/ui/icons";
import { MISSING } from "@/config/legal";
import { fr } from "@/lib/typography";

/** Un lien dans le texte d'une page légale : souligné, discret, net au survol. */
export const legalLinkClass =
  "font-medium text-ink underline decoration-rule-strong underline-offset-4 motion-safe:transition-colors motion-safe:duration-(--duration-micro) hover:decoration-ink";

interface LegalSectionProps {
  /** Ancre de la section, reprise par le sommaire. */
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * Gabarit des pages légales : un en-tête (surtitre, titre, introduction, date
 * de mise à jour) sur fond gris-vert, puis une colonne de lecture confortable.
 * Sur grand écran, un sommaire reprend les titres des sections (`LegalSection`
 * passées en enfants) et reste visible pendant la lecture.
 */
export function LegalPage({
  title,
  path,
  eyebrow = "Informations légales",
  intro,
  updated,
  summary,
  children,
}: {
  readonly title: string;
  /** Adresse de la page : son lien est signalé dans le pied de page. */
  readonly path: string;
  readonly eyebrow?: string;
  readonly intro?: string;
  readonly updated: string;
  /** Résumé placé en tête de la colonne de lecture (`LegalSummary`). */
  readonly summary?: ReactNode;
  readonly children: ReactNode;
}) {
  const contents = Children.toArray(children).flatMap((child) =>
    isValidElement<LegalSectionProps>(child) && child.type === LegalSection
      ? [{ id: child.props.id, title: child.props.title }]
      : [],
  );

  return (
    <>
      <SiteHeader />
      <main>
        <header className="border-b border-rule bg-mist">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-brand-strong">{eyebrow}</p>
              <h1 className="mt-3 font-display text-section text-ink">{title}</h1>
              {intro ? <p className="mt-5 text-lg leading-relaxed text-ink-muted">{fr(intro)}</p> : null}
              <p className="mt-6 text-sm text-ink-muted">{fr(`Dernière mise à jour : ${updated}`)}</p>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-24 pt-12 sm:px-8 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-16 lg:pt-16">
          {contents.length > 1 ? (
            <nav aria-label="Sur cette page" className="hidden lg:block">
              <div className="sticky top-8">
                <p className="text-sm font-semibold text-ink">Sur cette page</p>
                <ol className="mt-4 border-l border-rule">
                  {contents.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={`#${entry.id}`}
                        className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-sm leading-snug text-ink-muted motion-safe:transition-colors motion-safe:duration-(--duration-micro) hover:border-brand hover:text-ink"
                      >
                        {fr(entry.title)}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>
          ) : null}

          <div className="max-w-2xl lg:col-start-2">
            {summary ? <div className="mb-14">{summary}</div> : null}
            <div className="space-y-14">{children}</div>
          </div>
        </div>
      </main>
      <SiteFooter current={path} />
    </>
  );
}

/** Une section d'une page légale : un titre en Instrument Serif, puis le texte. */
export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="scroll-mt-8 font-display text-[2rem] leading-tight text-ink">
        {fr(title)}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

/** Un point d'une section : un intitulé court, puis son explication. */
export function LegalItem({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="border-t border-rule pt-5 first:border-t-0 first:pt-1">
      <h3 className="text-[1.0625rem] font-semibold text-ink">{fr(title)}</h3>
      <div className="mt-1.5 space-y-3">{children}</div>
    </div>
  );
}

/** Une liste à puces dans le texte d'une section. */
export function LegalList({ children }: { readonly children: ReactNode }) {
  return <ul className="list-disc space-y-2.5 pl-5 marker:text-brand-strong">{children}</ul>;
}

/** L'essentiel de la page en quelques phrases, sur un fond vert pâle. */
export function LegalSummary({ title = "En bref", items }: { readonly title?: string; readonly items: readonly string[] }) {
  return (
    <section aria-labelledby="en-bref" className="rounded-lg bg-brand-soft p-6 sm:p-8">
      <h2 id="en-bref" className="text-lg font-semibold text-ink">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-relaxed text-ink">
            <CheckGlyph className="mt-0.5 size-5 shrink-0 text-brand-strong" />
            <span>{fr(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Des informations en face de leur intitulé (éditeur, hébergeur), dans un cadre fin. */
export function LegalFacts({
  facts,
}: {
  readonly facts: readonly { readonly label: string; readonly value: string | null }[];
}) {
  return (
    <dl className="divide-y divide-rule rounded-lg border border-rule">
      {facts.map(({ label, value }) => (
        <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6">
          <dt className="text-sm text-ink-muted sm:pt-px">{label}</dt>
          <dd className="text-ink">
            <Filled value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Une information à fournir par l'éditeur : affichée telle quelle, ou signalée
 * « à compléter » dans une pastille rouge, bien visible, jamais inventée.
 */
export function Filled({ value }: { readonly value: string | null }) {
  if (value) return <>{value}</>;
  return (
    <span className="whitespace-nowrap rounded-sm bg-error-soft px-1.5 py-0.5 text-[0.9em] font-semibold text-pen-red-strong">
      {MISSING}
    </span>
  );
}
