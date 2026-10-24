import type { Metadata } from "next";
import Link from "next/link";
import {
  Filled,
  LegalItem,
  LegalList,
  LegalPage,
  LegalSection,
  LegalSummary,
  legalLinkClass,
} from "@/components/legal/LegalPage";
import { MeasurementChoice } from "@/components/legal/MeasurementChoice";
import { legal } from "@/config/legal";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Ce que Loupe fait de votre devis, ce qu'il garde et ce qu'il efface.",
};

const { retention } = legal;

const SUMMARY = [
  "Votre devis (photo ou PDF) n'est jamais enregistré par Loupe : il est lu le temps de l'analyse, puis effacé.",
  "Les noms, adresses, téléphones, emails et numéros du devis ne sont pas recopiés : Loupe note seulement s'ils y figurent (oui ou non).",
  "Pas de compte, pas de cookie de mesure, pas de publicité.",
  `Une analyse reste consultable ${retention.analysisDays} jours par son lien, puis elle est effacée. Vous pouvez l'effacer vous-même avant.`,
  "Vous pouvez refuser la mesure d'audience en un clic, sur cette page.",
] as const;

/** Politique de confidentialité : ce qui est traité, pourquoi, sur quelle base, combien de temps, par qui, et vos droits. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Confidentialité"
      path="/confidentialite"
      eyebrow="Vos données"
      updated="24 octobre 2026"
      intro="Votre devis en dit beaucoup sur vous, votre logement ou votre voiture. Loupe n'en lit que le strict nécessaire, n'en garde presque rien, et vous dit exactement quoi."
      summary={<LegalSummary items={SUMMARY} />}
    >
      <LegalSection id="responsable" title="Qui est responsable">
        <p>
          {fr("Le responsable des traitements décrits ici est l'éditeur de Loupe : ")}
          <Filled value={legal.publisher.name} />
          {fr(", ")}
          <Filled value={legal.publisher.address} />
          {fr(". Pour toute question ou demande sur vos données : ")}
          <Filled value={legal.privacyContact} />
          {fr(", ou par courrier à l'adresse ci-dessus.")}
        </p>
        <p>
          {fr(
            "Loupe n'a pas désigné de délégué à la protection des données : cette désignation n'est pas obligatoire pour son activité (art. 37 du RGPD).",
          )}
        </p>
      </LegalSection>

      <LegalSection id="traitements" title="Pourquoi, sur quelle base, combien de temps">
        <ul className="divide-y divide-rule rounded-lg border border-rule">
          {legal.processing.map((activity) => (
            <li key={activity.id} className="px-5 py-4">
              <h3 className="font-semibold text-ink">{fr(activity.purpose)}</h3>
              <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[0.95rem] sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <dt className="text-sm text-ink-muted sm:pt-px">Données</dt>
                <dd className="text-ink">{fr(activity.data)}</dd>
                <dt className="text-sm text-ink-muted sm:pt-px">Base légale</dt>
                <dd className="text-ink">{fr(activity.basis)}</dd>
                <dt className="text-sm text-ink-muted sm:pt-px">Durée</dt>
                <dd className="text-ink">
                  {activity.duration ? fr(activity.duration) : <Filled value={null} />}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
        <p>
          {fr(
            "Envoyer un devis est facultatif, mais nécessaire pour obtenir une analyse. Laisser son email est facultatif. Loupe ne prend aucune décision produisant des effets juridiques à votre égard (art. 22 du RGPD) : le verdict est un avis indicatif, que vous restez libre de suivre ou non.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="devis" title="Comment votre devis est protégé">
        <LegalList>
          <li>
            {fr(
              "Les photos sont réencodées dans votre navigateur avant l'envoi, ce qui efface leurs métadonnées (position GPS comprise). Les métadonnées d'un PDF (auteur, logiciel, titre) sont effacées sur le serveur avant la lecture.",
            )}
          </li>
          <li>
            {fr(
              "Avec votre accord (la case à cocher avant l'envoi), le devis part chez Anthropic, dont le modèle Claude le lit. Loupe ne l'écrit nulle part : ni sur disque, ni en base, ni dans ses journaux.",
            )}
          </li>
          <li>
            {fr(
              "Le modèle ne recopie ni nom, ni adresse, ni téléphone, ni email, ni numéro : seulement s'ils figurent sur le devis (oui ou non). Les libellés et l'objet du devis passent ensuite par un filtre qui retire ce qui ressemble encore à une donnée personnelle.",
            )}
          </li>
          <li>
            {fr(
              "Un devis peut révéler une information sensible (un équipement lié à un handicap, par exemple). En cochant la case, vous acceptez explicitement qu'il soit lu pour l'analyse (art. 9.2.a du RGPD). Les devis de santé (dentaire, optique, auditif, médical) ne sont pas analysés : leur lecture s'arrête dès qu'ils sont reconnus, et rien n'en est gardé.",
            )}
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="destinataires" title="Qui reçoit ces données, et où">
        <ul className="divide-y divide-rule rounded-lg border border-rule">
          {legal.processors.map((processor) => (
            <li key={processor.name} className="space-y-1.5 px-5 py-4">
              <p className="font-semibold text-ink">{processor.name}</p>
              <p>{fr(`${processor.role.charAt(0).toUpperCase()}${processor.role.slice(1)}.`)}</p>
              <p className="text-sm">
                {fr("Société : ")}
                <Filled value={processor.entity} />
              </p>
              <p className="text-sm">
                {fr("Lieu de traitement : ")}
                <Filled value={processor.location} />
              </p>
              <p className="text-sm">
                {fr("Conservation : ")}
                {processor.retention ? fr(processor.retention) : <Filled value={null} />}
              </p>
              <p className="text-sm">
                {fr("Garanties d'un transfert hors de l'Union européenne : ")}
                <Filled value={processor.safeguards} />
              </p>
            </li>
          ))}
        </ul>
        <p>
          {fr(
            "La lecture du devis par Anthropic est un transfert hors de l'Union européenne : le stockage technique se fait aux États-Unis, et le calcul peut avoir lieu dans toute zone où Anthropic dispose de capacités. Anthropic ne se sert pas du contenu des requêtes pour entraîner ses modèles.",
          )}
        </p>
        <p>{fr("Rien n'est vendu ni transmis à des fins publicitaires.")}</p>
      </LegalSection>

      <LegalSection id="personnes-citees" title="Si vous êtes cité sur un devis">
        <p>
          {fr(
            "Un devis porte souvent le nom, l'adresse et le téléphone de l'artisan et de son client. Ces informations figurent sur l'image lue par Anthropic, mais Loupe ne les recopie pas : il note seulement si elles y figurent (oui ou non). Ce traitement repose sur l'intérêt légitime de la personne qui fait vérifier son devis, et de Loupe (art. 6.1.f du RGPD).",
          )}
        </p>
        <p>
          {fr(
            "Comme ni l'image ni ces informations ne sont conservées, Loupe ne peut en général retrouver aucune donnée vous concernant. Vous disposez des droits décrits plus bas. Aucun verdict ne vise un artisan nommé, et la page de partage ne montre ni nom d'entreprise ni adresse.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="mesure" title="Mesure d'audience">
        <p>
          {fr(
            "Pour savoir combien d'analyses aboutissent et où le parcours bloque, Loupe compte une dizaine d'événements (« analyse terminée », « message copié »…), avec quelques précisions sans texte libre : catégorie du devis, verdict, étape. Chaque visite reçoit un identifiant tiré au hasard, gardé dans la page et oublié au rechargement. Ces données sont pseudonymes : elles ne disent pas qui vous êtes.",
          )}
        </p>
        <p>
          {fr(
            `Les événements passent par le serveur de Loupe, qui les enregistre et les transmet à PostHog, sans votre adresse IP ni géolocalisation. Ils servent uniquement aux statistiques de Loupe et sont conservés ${retention.eventsMonths} mois.`,
          )}
        </p>
        <p>
          {fr(
            "Vous pouvez vous y opposer à tout moment. Votre choix est gardé dans ce navigateur ; le signal Global Privacy Control de votre navigateur vaut aussi refus.",
          )}
        </p>
        <MeasurementChoice />
      </LegalSection>

      <LegalSection id="email" title="Votre email">
        <p>
          {fr(
            `Si vous laissez votre email, il sert seulement à vous prévenir des nouveautés ou de la sortie du rapport détaillé, avec votre accord. Il est gardé jusqu'à votre désinscription, et au plus ${retention.signupYears} ans après l'inscription.`,
          )}
        </p>
        <p>
          {fr("Pour retirer votre adresse : ")}
          <Link href="/desinscription" className={legalLinkClass}>
            désinscription
          </Link>
          {fr(". Chaque email que nous enverrons portera aussi un lien de désinscription.")}
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies et stockage dans le navigateur">
        <p>
          {fr(
            `Loupe n'utilise ni cookie publicitaire, ni cookie de mesure, ni bouton de réseau social. Le seul cookie, « ${legal.adminCookie} », est déposé quand l'éditeur se connecte à l'administration et garde sa session ouverte ${retention.adminSessionHours} heures : il est strictement nécessaire et ne concerne pas les visiteurs.`,
          )}
        </p>
        <p>
          {fr(
            "Si vous refusez la mesure d'audience, ce choix est gardé dans votre navigateur (stockage local), pour être respecté à votre prochaine visite. C'est pourquoi aucun bandeau de consentement ne s'affiche.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="droits" title="Vos droits">
        <p>
          {fr(
            "Vous pouvez demander l'accès à vos données, leur rectification, leur effacement, la limitation du traitement, en recevoir une copie, retirer votre accord à tout moment, et vous opposer aux traitements fondés sur l'intérêt légitime de Loupe. Vous pouvez aussi définir des directives sur le sort de vos données après votre décès. Écrivez à ",
          )}
          <Filled value={legal.privacyContact} />
          {fr(" : nous vous répondons dans un délai d'un mois.")}
        </p>
        <p>
          {fr(
            "Comme il n'y a pas de compte, Loupe ne sait pas qui a fait quelle analyse : indiquez-nous son lien, ou effacez-la vous-même depuis sa page (« Supprimer cette analyse »). Les lignes de prix anonymes restent, sans lien avec vous.",
          )}
        </p>
        <p>
          {fr("Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la ")}
          <a href={legal.authority.url} className={legalLinkClass}>
            {legal.authority.name}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="mineurs" title="Mineurs">
        <p>
          {fr(
            "Loupe s'adresse aux adultes. Si vous avez moins de 15 ans, ne laissez pas votre email sans l'accord d'un parent.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="en-savoir-plus" title="Pour aller plus loin">
        <LegalItem title="Les autres pages">
          <p>
            <Link href="/mentions-legales" className={legalLinkClass}>
              Mentions légales
            </Link>
            {fr(" (qui édite et héberge Loupe), ")}
            <Link href="/conditions" className={legalLinkClass}>
              conditions d&apos;utilisation
            </Link>
            {fr(", ")}
            <Link href="/methode" className={legalLinkClass}>
              comment Loupe vérifie un devis
            </Link>
            .
          </p>
        </LegalItem>
      </LegalSection>
    </LegalPage>
  );
}
