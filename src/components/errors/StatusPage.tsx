import type { ReactNode } from "react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";

/**
 * Gabarit des pages d'erreur (page introuvable, lien expiré, incident) : ce
 * qui s'est passé, en une phrase posée, et ce que l'on peut faire ensuite. Sur
 * grand écran, une feuille de devis vide, une ligne surlignée et une pastille
 * rappellent l'application, sans rien affirmer. Sans état ni effet : la page
 * d'erreur cliente (`error.tsx`) l'emploie aussi.
 */
export function StatusPage({
  eyebrow,
  title,
  badge,
  actions,
  children,
}: {
  /** Surtitre : « Erreur 404 », « Lien de partage »… */
  readonly eyebrow: string;
  readonly title: string;
  /** Texte de la pastille de l'illustration (décorative). */
  readonly badge: string;
  readonly actions: ReactNode;
  /** L'explication, déjà mise en forme (`fr()`). */
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center overflow-x-clip">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-x-16 gap-y-14 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:py-24">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-brand-strong">{eyebrow}</p>
            <h1 className="mt-3 font-display text-section text-ink">{fr(title)}</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-muted">{children}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">{actions}</div>
          </div>
          <BlankSheet badge={badge} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const LINES = ["w-40", "w-28", "w-36"] as const;

/** Une feuille de devis sans contenu : des filets à la place du texte, une ligne surlignée, des montants « — ». */
function BlankSheet({ badge }: { readonly badge: string }) {
  return (
    // Le panneau d'illustration, en gris-vert pâle, porte la feuille blanche.
    <div aria-hidden className="hidden rounded-lg bg-mist p-10 lg:block">
      <div className="w-[21rem] rounded-lg bg-paper-raised p-7 elevation-1">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5 pt-1">
            <span className="block h-3 w-28 rounded-sm bg-rule-strong" />
            <span className="block h-2 w-20 rounded-sm bg-rule" />
          </div>
          <span className="whitespace-nowrap rounded-sm bg-warning-soft px-2 py-0.5 text-xs font-semibold leading-5 text-stamp-orange-strong">
            {badge}
          </span>
        </div>

        <div className="mt-9 space-y-1">
          {LINES.map((width, index) => (
            <div
              key={width}
              className={cn(
                "flex items-center justify-between py-2.5",
                index === 1 && "-mx-2.5 rounded-sm bg-highlighter-mark px-2.5",
              )}
            >
              <span className={cn("block h-2 rounded-sm bg-rule-strong", width)} />
              <span className="font-mono text-sm tabular-nums text-ink-muted">—&nbsp;€</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-rule pt-4">
          <span className="text-sm font-medium text-ink-muted">Total TTC</span>
          <span className="font-mono text-base font-semibold tabular-nums text-ink">—&nbsp;€</span>
        </div>
      </div>
    </div>
  );
}
