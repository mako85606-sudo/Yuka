import type { Metadata } from "next";
import Link from "next/link";
import { Filled, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { legal, MISSING } from "@/config/legal";
import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Ce que Loupe fait de ton devis, ce qu'il garde, ce qu'il jette.",
};

const { retention } = legal;

/** Politique de confidentialité : ce qui est traité, pourquoi, combien de temps, par qui, et tes droits. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Confidentialité"
      path="/confidentialite"
      updated="13 octobre 2026"
      intro="Ton devis dit beaucoup de choses sur toi, ton logement, ta voiture. Loupe en lit le strict nécessaire, n'en garde presque rien, et te dit exactement quoi."
    >
      <LegalSection title="En bref">
        <ul>
          <li>{fr("Ton devis (photo ou PDF) n'est jamais enregistré : il est lu le temps de l'analyse, puis jeté.")}</li>
          <li>
            {fr(
              "Les noms, adresses, téléphones, emails et numéros du devis ne sont pas lus : Loupe note seulement s'ils y figurent (oui ou non).",
            )}
          </li>
          <li>{fr("Pas de compte, pas de cookie de mesure, pas de publicité.")}</li>
          <li>
            {fr(
              `Une analyse reste consultable ${retention.analysisDays} jours par son lien, puis elle est effacée. Tu peux aussi la supprimer toi-même avant.`,
            )}
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Qui est responsable">
        <p>
          {fr("Le responsable du traitement est l'éditeur de Loupe : ")}
          <Filled value={legal.publisher.name} />
          {fr(". Pour toute question ou demande sur tes données : ")}
          <Filled value={legal.privacyContact} />.
        </p>
      </LegalSection>

      <LegalSection title="Ce que Loupe traite, et pourquoi">
        <p className="font-medium">{fr("Ton devis, pour l'analyser.")}</p>
        <p>
          {fr(
            "Avec ton accord (la case à cocher avant l'envoi), la photo ou le PDF part chez Anthropic, dont le modèle Claude le lit. Loupe ne l'écrit nulle part : ni sur disque, ni en base, ni dans ses journaux. Les photos sont réencodées dans ton navigateur avant l'envoi, ce qui efface leurs métadonnées (position GPS comprise).",
          )}
        </p>
        <p className="font-medium">{fr("Ce que l'analyse conclut, pour te le montrer.")}</p>
        <p>
          {fr(
            `Le verdict, les erreurs relevées, les avis de prix, la catégorie du devis, son département et ses lignes, après un filtre qui retire ce qui ressemble à une donnée personnelle. Conservé ${retention.analysisDays} jours, accessible seulement par le lien de l'analyse.`,
          )}
        </p>
        <p className="font-medium">{fr("Des lignes de prix anonymes, pour comparer les prix.")}</p>
        <p>
          {fr(
            `Les lignes (« chauffe-eau 200 L, 890 € HT »), la catégorie et la région servent de base de comparaison pendant ${retention.priceLinesMonths} mois. Elles ne sont rattachées à personne.`,
          )}
        </p>
        <p className="font-medium">{fr("Ton adresse IP, sans la garder, pour limiter les abus.")}</p>
        <p>
          {fr(
            `Pour tenir la limite de ${limits.analysesPerDay} analyses par jour, Loupe garde une empreinte chiffrée de ton adresse IP et du jour, qui ne permet pas de retrouver l'adresse ni de relier deux jours. Elle est effacée au bout de deux jours. C'est l'intérêt légitime de Loupe : rester disponible et gratuit.`,
          )}
        </p>
        <p className="font-medium">{fr("Une mesure d'audience anonyme, pour améliorer le service.")}</p>
        <p>
          {fr(
            `Quelques événements (« analyse terminée », « message copié »…), sans cookie ni stockage sur ton appareil : la visite est un identifiant tiré au hasard, oublié dès que tu recharges la page. Ni ton adresse IP ni le contenu du devis n'y figurent. Conservés ${retention.eventsMonths} mois.`,
          )}
        </p>
        <p className="font-medium">{fr("Ton email, si tu le laisses, pour te prévenir.")}</p>
        <p>
          {fr(
            "Seulement pour te prévenir des nouveautés ou de la sortie du rapport détaillé, avec ton accord. Gardé jusqu'à ce que tu demandes à être retiré de la liste.",
          )}
        </p>
        <p className="font-medium">{fr("Le lien de partage, si tu le crées.")}</p>
        <p>
          {fr(
            "Il montre la feuille corrigée et le verdict, sans date, sans département et sans ton message, et s'éteint avec l'analyse.",
          )}
        </p>
      </LegalSection>

      <LegalSection title="Qui reçoit ces données">
        <ul>
          {legal.processors.map((processor) => (
            <li key={processor.name}>
              <span className="font-medium">{processor.name}</span>
              {fr(` : ${processor.role}. Lieu : `)}
              <Filled value={processor.location} />.
              {processor.retention ? fr(` ${processor.retention}`) : null}
            </li>
          ))}
        </ul>
        <p>
          {fr(
            `La lecture du devis par Anthropic a lieu aux États-Unis : c'est un transfert hors de l'Union européenne, encadré par les garanties prévues dans le contrat d'Anthropic (${MISSING}).`,
          )}
        </p>
        <p>{fr("Rien n'est vendu ni transmis à des fins publicitaires.")}</p>
      </LegalSection>

      <LegalSection title="Tes droits">
        <p>
          {fr(
            "Tu peux demander l'accès à tes données, leur rectification, leur effacement, la limitation du traitement, t'y opposer, retirer ton accord à tout moment, et en recevoir une copie. Écris à ",
          )}
          <Filled value={legal.privacyContact} />.
        </p>
        <p>
          {fr(
            "Comme il n'y a pas de compte, Loupe ne sait pas qui a fait quelle analyse : le plus simple est de la supprimer depuis sa page (« Supprimer cette analyse »). Les lignes de prix anonymes restent, sans lien avec toi.",
          )}
        </p>
        <p>
          {fr("Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la ")}
          <a href={legal.authority.url} className="underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
            {legal.authority.name}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          {fr(
            "Loupe ne dépose aucun cookie de mesure, de publicité ni de réseau social. Le seul cookie du site sert à la connexion à l'administration, réservée à l'éditeur.",
          )}
        </p>
      </LegalSection>

      <LegalSection title="Pour aller plus loin">
        <p>
          {fr("Qui édite et héberge Loupe : ")}
          <Link href="/mentions-legales" className="underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
            mentions légales
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
