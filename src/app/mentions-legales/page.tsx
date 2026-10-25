import type { Metadata } from "next";
import Link from "next/link";
import { Filled, LegalFacts, LegalPage, LegalSection, legalLinkClass } from "@/components/legal/LegalPage";
import { legal } from "@/config/legal";
import { site } from "@/config/site";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Qui édite Loupe, qui l'héberge, comment nous joindre.",
};

const { publisher } = legal;

/** Mentions légales : éditeur, directeur de la publication, contact, hébergeurs, accessibilité. */
export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions légales"
      path="/mentions-legales"
      updated="24 octobre 2026"
      intro="Qui édite Loupe, qui l'héberge, comment nous joindre, et ce que le service est, ou n'est pas."
    >
      <LegalSection id="editeur" title="Éditeur">
        <LegalFacts
          facts={[
            { label: "Nom ou dénomination", value: publisher.name },
            { label: "Statut", value: publisher.status },
            { label: "Adresse", value: publisher.address },
            { label: "Téléphone", value: publisher.phone },
            { label: "Email", value: publisher.email },
            { label: "Immatriculation", value: publisher.registration },
            { label: "TVA intracommunautaire", value: publisher.vatNumber },
            { label: "Directeur ou directrice de la publication", value: legal.publicationDirector },
          ]}
        />
      </LegalSection>

      <LegalSection id="contact" title="Nous contacter">
        <p>
          {fr("Pour une question, une erreur dans une analyse ou une demande de droit de réponse, écrivez à ")}
          <Filled value={publisher.email} />
          {fr(" ou appelez le ")}
          <Filled value={publisher.phone} />.
        </p>
        <p>
          {fr("Pour vos données personnelles : ")}
          <Filled value={legal.privacyContact} />
          {fr(". Pour ne plus recevoir nos nouvelles : ")}
          <Link href="/desinscription" className={legalLinkClass}>
            désinscription
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="hebergeur" title="Hébergement">
        <p>{fr(`Le site est hébergé par ${legal.host.name ?? "Vercel"}. Ses fonctions s'exécutent à ${legal.hostRegion}.`)}</p>
        <LegalFacts
          facts={[
            { label: "Hébergeur du site", value: legal.host.name },
            { label: "Adresse", value: legal.host.address },
            { label: "Contact", value: legal.host.contact },
          ]}
        />
        <LegalFacts
          facts={[
            { label: "Hébergeur de la base de données", value: legal.databaseHost.name },
            { label: "Adresse", value: legal.databaseHost.address },
            { label: "Contact", value: legal.databaseHost.contact },
          ]}
        />
      </LegalSection>

      <LegalSection id="service" title="Ce que Loupe est, et n'est pas">
        <p className="rounded-lg bg-mist px-5 py-4 font-medium text-ink">{fr(site.disclaimer)}</p>
        <p>
          {fr(
            "Loupe vérifie les calculs et les mentions d'un devis, et compare ses prix à des repères dont la source est toujours indiquée. La lecture du devis est faite par une intelligence artificielle, le modèle Claude d'Anthropic ; les vérifications et le verdict suivent des règles fixes. Ses verdicts sont privés : ils ne visent aucun artisan nommé, et la page de partage ne montre ni nom d'entreprise ni adresse.",
          )}
        </p>
        <p>{fr("Loupe est indépendant : aucune publicité, aucun lien affilié vers des artisans.")}</p>
        <p>
          {fr("Le détail : ")}
          <Link href="/methode" className={legalLinkClass}>
            comment Loupe vérifie un devis
          </Link>
          {fr(" et les ")}
          <Link href="/conditions" className={legalLinkClass}>
            conditions d&apos;utilisation
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="accessibilite" title="Accessibilité">
        <p>
          {fr(
            "Loupe veut être utilisable par tous : navigation au clavier, contrastes vérifiés, équivalent texte des annotations du devis, respect du réglage « réduire les animations ». Le site n'a pas fait l'objet d'un audit de conformité au RGAA et ne revendique aucun niveau de conformité.",
          )}
        </p>
        <p>
          {fr("Un problème d'accès ? Écrivez à ")}
          <Filled value={publisher.email} />
          {fr(" : nous vous répondrons et vous transmettrons l'information sous une autre forme.")}
        </p>
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
        <p>{fr("Polices Instrument Serif, Geist et Geist Mono, sous licence SIL Open Font License 1.1.")}</p>
      </LegalSection>
    </LegalPage>
  );
}
