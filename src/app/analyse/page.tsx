import type { Metadata } from "next";
import { AnalyzeFlow } from "@/components/analyze/AnalyzeFlow";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";

export const metadata: Metadata = {
  title: "Scanner mon devis",
  description: "Prends ton devis en photo ou dépose le PDF : Loupe le lit et le corrige.",
  robots: { index: false, follow: false },
};

/** Dépôt du devis (photo ou PDF, consentement) puis lecture en direct. */
export default function AnalysePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <AnalyzeFlow />
      </main>
      <SiteFooter />
    </>
  );
}
