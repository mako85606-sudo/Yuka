import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, legalLinkClass } from "@/components/legal/LegalPage";
import { UnsubscribeForm } from "@/components/legal/UnsubscribeForm";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Désinscription",
  description: "Ne plus recevoir les nouvelles de Loupe.",
  robots: { index: false, follow: true },
};

/** Désinscription des nouvelles : un champ, une réponse qui ne dit jamais si l'adresse était inscrite. */
export default function UnsubscribePage() {
  return (
    <LegalPage
      title="Désinscription"
      path="/desinscription"
      eyebrow="Vos données"
      updated="24 octobre 2026"
      intro="Vous ne souhaitez plus recevoir nos nouvelles ? Indiquez votre adresse : elle est retirée de la liste, sans autre question."
    >
      <LegalSection id="retirer" title="Retirer mon adresse">
        <UnsubscribeForm />
      </LegalSection>
      <LegalSection id="savoir" title="Bon à savoir">
        <p>
          {fr(
            "Pour éviter qu'on teste les adresses d'autres personnes, la réponse est la même que l'adresse ait été inscrite ou non. Vous pouvez aussi nous écrire : ",
          )}
          <Link href="/mentions-legales#contact" className={legalLinkClass}>
            nous contacter
          </Link>
          .
        </p>
        <p>
          {fr("Ce que nous faisons de vos données : ")}
          <Link href="/confidentialite#email" className={legalLinkClass}>
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
