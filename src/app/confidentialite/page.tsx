import type { Metadata } from "next";
import Link from "next/link";
import {
  Filled,
  LegalItem,
  LegalPage,
  LegalSection,
  LegalSummary,
  legalLinkClass,
} from "@/components/legal/LegalPage";
import { legal } from "@/config/legal";
import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Ce que Loupe fait de votre devis, ce qu'il garde et ce qu'il efface.",
};

const { retention } = legal;

const SUMMARY = [
  "Votre devis (photo ou PDF) n'est jamais enregistré : il est lu le temps de l'analyse, puis effacé.",
  "Les noms, adresses, téléphones, emails et numéros du devis ne sont pas lus : Loupe note seulement s'ils y figurent (oui ou non).",
  "Pas de compte, pas de cookie de mesure, pas de publicité.",
  `Une analyse reste consultable ${retention.analysisDays} jours par son lien, puis elle est effacée. Vous pouvez aussi la supprimer vous-même avant.`,
] as const;

/** Politique de confidentialité : ce qui est traité, pourquoi, combien de temps, par qui, et vos droits. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Confidentialité"
      path="/confidentialite"
      eyebrow="Vos données"
      updated="13 octobre 2026"
      intro="Votre devis en dit beaucoup sur vous, votre logement ou votre voiture. Loupe n'en lit que le strict nécessaire, n'en garde presque rien, et vous dit exactement quoi."
      summary={<LegalSummary items={SUMMARY} />}
    >
      <LegalSection id="responsable" title="Qui est responsable">
        <p>
          {fr("Le responsable du traitement est l'éditeur de Loupe : ")}
          <Filled value={legal.publisher.name} />
          {fr(". Pour toute question ou demande sur vos données : ")}
          <Filled value={legal.privacyContact} />.
        </p>
      </LegalSection>

      <LegalSection id="traitements" title="Ce que Loupe traite, et pourquoi">
        <LegalItem title="Votre devis, pour l'analyser">
          <p>
            {fr(
              "Avec votre accord (la case à cocher avant l'envoi), la photo ou le PDF part chez Anthropic, dont le modèle Claude le lit. Loupe ne l'écrit nulle part : ni sur disque, ni en base, ni dans ses journaux. Les photos sont réencodées dans votre navigateur avant l'envoi, ce qui efface leurs métadonnées (position GPS comprise).",
            )}
          </p>
        </LegalItem>
        <LegalItem title="Ce que l'analyse conclut, pour vous le montrer">
          <p>
            {fr(
              `Le verdict, les erreurs relevées, les avis de prix, la catégorie du devis, son département et ses lignes, après un filtre qui retire ce qui ressemble à une donnée personnelle. Conservé ${retention.analysisDays} jours, accessible seulement par le lien de l'analyse.`,
            )}
          </p>
        </LegalItem>
        <LegalItem title="Des lignes de prix anonymes, pour comparer les prix">
          <p>
            {fr(
              `Les lignes (« chauffe-eau 200 L, 890 € HT »), la catégorie et la région servent de base de comparaison pendant ${retention.priceLinesMonths} mois. Elles ne sont rattachées à personne.`,
            )}
          </p>
        </LegalItem>
        <LegalItem title="Votre adresse IP, sans la garder, pour limiter les abus">
          <p>
            {fr(
              `Pour tenir la limite de ${limits.analysesPerDay} analyses par jour, Loupe garde une empreinte chiffrée de votre adresse IP et du jour, qui ne permet pas de retrouver l'adresse ni de relier deux jours. Elle est effacée au bout de deux jours. C'est l'intérêt légitime de Loupe : rester disponible et gratuit.`,
            )}
          </p>
        </LegalItem>
        <LegalItem title="Une mesure d'audience anonyme, pour améliorer le service">
          <p>
            {fr(
              `Quelques événements (« analyse terminée », « message copié »…), sans cookie ni stockage sur votre appareil : la visite est un identifiant tiré au hasard, oublié dès que vous rechargez la page. Ni votre adresse IP ni le contenu du devis n'y figurent. Conservés ${retention.eventsMonths} mois.`,
            )}
          </p>
        </LegalItem>
        <LegalItem title="Votre email, si vous le laissez, pour vous prévenir">
          <p>
            {fr(
              "Seulement pour vous prévenir des nouveautés ou de la sortie du rapport détaillé, avec votre accord. Gardé jusqu'à ce que vous demandiez à être retiré de la liste.",
            )}
          </p>
        </LegalItem>
        <LegalItem title="Le lien de partage, si vous le créez">
          <p>
            {fr(
              "Il montre la correction et le verdict, sans date, sans département et sans votre message, et s'éteint avec l'analyse.",
            )}
          </p>
        </LegalItem>
      </LegalSection>

      <LegalSection id="destinataires" title="Qui reçoit ces données">
        <ul className="divide-y divide-rule rounded-lg border border-rule">
          {legal.processors.map((processor) => (
            <li key={processor.name} className="px-5 py-4">
              <p className="font-semibold text-ink">{processor.name}</p>
              <p className="mt-1">
                {fr(`${processor.role.charAt(0).toUpperCase()}${processor.role.slice(1)}.`)}
                {processor.retention ? fr(` ${processor.retention}`) : null}
              </p>
              <p className="mt-1 text-sm">
                {fr("Lieu de traitement : ")}
                <Filled value={processor.location} />
              </p>
            </li>
          ))}
        </ul>
        <p>
          {fr(
            "La lecture du devis par Anthropic a lieu aux États-Unis : c'est un transfert hors de l'Union européenne, encadré par les garanties prévues dans le contrat d'Anthropic ",
          )}
          <Filled value={null} />.
        </p>
        <p>{fr("Rien n'est vendu ni transmis à des fins publicitaires.")}</p>
      </LegalSection>

      <LegalSection id="droits" title="Vos droits">
        <p>
          {fr(
            "Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, la limitation du traitement, vous y opposer, retirer votre accord à tout moment, et en recevoir une copie. Écrivez à ",
          )}
          <Filled value={legal.privacyContact} />.
        </p>
        <p>
          {fr(
            "Comme il n'y a pas de compte, Loupe ne sait pas qui a fait quelle analyse : le plus simple est de la supprimer depuis sa page (« Supprimer cette analyse »). Les lignes de prix anonymes restent, sans lien avec vous.",
          )}
        </p>
        <p>
          {fr("Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la ")}
          <a href={legal.authority.url} className={legalLinkClass}>
            {legal.authority.name}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies">
        <p>
          {fr(
            "Loupe ne dépose aucun cookie de mesure, de publicité ni de réseau social. Le seul cookie du site sert à la connexion à l'administration, réservée à l'éditeur.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="en-savoir-plus" title="Pour aller plus loin">
        <p>
          {fr("Qui édite et héberge Loupe : ")}
          <Link href="/mentions-legales" className={legalLinkClass}>
            mentions légales
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
