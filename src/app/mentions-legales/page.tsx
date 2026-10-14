import type { Metadata } from "next";
import Link from "next/link";
import { Filled, LegalPage, LegalSection } from "@/components/legal/LegalPage";
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
    <LegalPage title="Mentions légales" updated="13 octobre 2026">
      <LegalSection title="Éditeur">
        <p>
          <Filled value={legal.publisher.name} />
          <br />
          <Filled value={legal.publisher.address} />
          <br />
          Contact : <Filled value={legal.publisher.contact} />
          <br />
          Immatriculation : <Filled value={legal.publisherRegistration} />
        </p>
        <p>
          Directeur ou directrice de la publication : <Filled value={legal.publicationDirector} />
        </p>
      </LegalSection>

      <LegalSection title="Hébergeur">
        <p>
          <Filled value={legal.host.name} />
          <br />
          <Filled value={legal.host.address} />
          <br />
          Contact : <Filled value={legal.host.contact} />
        </p>
      </LegalSection>

      <LegalSection title="Ce que Loupe est, et n'est pas">
        <p>{fr(site.disclaimer)}</p>
        <p>
          {fr(
            "Loupe vérifie les calculs et les mentions d'un devis, et compare ses prix à des repères dont la source est toujours indiquée. Ses verdicts sont privés : ils ne visent aucun artisan nommé, et la page de partage ne montre ni nom d'entreprise ni adresse.",
          )}
        </p>
        <p>{fr("Loupe est indépendant : aucune publicité, aucun lien affilié vers des artisans.")}</p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          {fr("Tout est expliqué dans la ")}
          <Link href="/confidentialite" className="underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Polices et crédits">
        <p>
          {fr(
            "Polices Instrument Serif, Geist, Geist Mono et Caveat, sous licence SIL Open Font License 1.1.",
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
