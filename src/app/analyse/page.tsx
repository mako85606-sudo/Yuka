import type { Metadata } from "next";
import { AnalyzeFlow } from "@/components/analyze/AnalyzeFlow";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Scanner mon devis",
  description: "Prenez votre devis en photo ou envoyez le PDF : Loupe vérifie les calculs, les mentions et les prix.",
  robots: { index: false, follow: false },
  // Après l'analyse, l'adresse devient celle du résultat : elle ne doit pas fuiter vers les liens sortants.
  referrer: "no-referrer",
};

/** Dépôt du devis (photo ou PDF, consentement) puis lecture en direct. */
export default function AnalysePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-8 sm:pt-12">
        <AnalyzeFlow />
      </main>
      <SiteFooter />
    </>
  );
}
