import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Scanner mon devis",
  robots: { index: false, follow: false },
};

/**
 * Page provisoire : le dépôt du devis (photo ou PDF, consentement, envoi)
 * arrive à l'étape 3.
 */
export default function AnalysePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-8 sm:pt-20">
        <p className="font-mono text-label uppercase text-ink-muted">Bientôt</p>
        <h1 className="mt-4 font-display text-title text-ink">
          Le dépôt de devis arrive très vite.
        </h1>
        <p className="mt-5 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
          Ici, tu pourras prendre ton devis en photo ou déposer un PDF. Loupe le lira, le corrigera
          et te rendra son verdict en moins de 30 secondes.
        </p>
        <p className="mt-10">
          <Link
            href="/"
            className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
          >
            Revenir à l&apos;accueil
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
