import type { Metadata } from "next";
import Link from "next/link";
import { LegalFacts, LegalPage, LegalSection, legalLinkClass } from "@/components/legal/LegalPage";
import { legal } from "@/config/legal";
import { site } from "@/config/site";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Qui édite Loupe, qui l'héberge.",
};

/** Mentions légales : éditeur, directeur de la publication, hébergeur. */
export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      path="/mentions-legales"
      updated="13 octobre 2026"
      intro="Qui édite Loupe, qui l'héberge, et ce que le service est, ou n'est pas."
    >
      <LegalSection id="editeur" title="Éditeur">
        <LegalFacts
          facts={[
            { label: "Nom ou dénomination", value: legal.publisher.name },
            { label: "Adresse", value: legal.publisher.address },
            { label: "Contact", value: legal.publisher.contact },
            { label: "Immatriculation", value: legal.publisherRegistration },
            { label: "Directeur ou directrice de la publication", value: legal.publicationDirector },
          ]}
        />
      </LegalSection>

      <LegalSection id="hebergeur" title="Hébergeur">
        <LegalFacts
          facts={[
            { label: "Nom ou dénomination", value: legal.host.name },
            { label: "Adresse", value: legal.host.address },
            { label: "Contact", value: legal.host.contact },
          ]}
        />
      </LegalSection>

      <LegalSection id="service" title="Ce que Loupe est, et n'est pas">
        <p className="rounded-lg bg-mist px-5 py-4 font-medium text-ink">{fr(site.disclaimer)}</p>
        <p>
          {fr(
            "Loupe vérifie les calculs et les mentions d'un devis, et compare ses prix à des repères dont la source est toujours indiquée. Ses verdicts sont privés : ils ne visent aucun artisan nommé, et la page de partage ne montre ni nom d'entreprise ni adresse.",
          )}
        </p>
        <p>{fr("Loupe est indépendant : aucune publicité, aucun lien affilié vers des artisans.")}</p>
      </LegalSection>

      <LegalSection id="donnees" title="Données personnelles">
        <p>
          {fr("Tout est expliqué dans la ")}
          <Link href="/confidentialite" className={legalLinkClass}>
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="credits" title="Polices et crédits">
        <p>
          {fr(
            "Polices Instrument Serif, Geist et Geist Mono, sous licence SIL Open Font License 1.1.",
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
