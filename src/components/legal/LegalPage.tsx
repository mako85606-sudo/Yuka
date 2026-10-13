import type { ReactNode } from "react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { MISSING } from "@/config/legal";
import { fr } from "@/lib/typography";

/** Gabarit des pages légales : un titre, une date, des sections lisibles. */
export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly updated: string;
  readonly children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <h1 className="font-display text-title text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{fr(`Mise à jour : ${updated}`)}</p>
        {intro ? <p className="mt-6 text-[1.0625rem] leading-relaxed text-ink">{fr(intro)}</p> : null}
        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function LegalSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[1.6rem] leading-tight text-ink">{fr(title)}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}

/** Une information à fournir par l'éditeur : affichée telle quelle, ou signalée « à compléter ». */
export function Filled({ value }: { readonly value: string | null }) {
  if (value) return <>{value}</>;
  return <span className="font-medium text-pen-red-strong">[{MISSING}]</span>;
}
