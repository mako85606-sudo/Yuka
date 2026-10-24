import type { Metadata } from "next";
import Link from "next/link";
import { LegalItem, LegalList, LegalPage, LegalSection, LegalSummary, legalLinkClass } from "@/components/legal/LegalPage";
import { checksConfig } from "@/config/checks";
import { limits } from "@/config/limits";
import { pricingConfig } from "@/config/pricing";
import { DOOR_TO_DOOR_RULE } from "@/config/rules";
import { verdictConfig } from "@/config/verdict";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Notre méthode",
  description: "Comment Loupe lit un devis, vérifie ses calculs et ses mentions, compare ses prix et rend son verdict.",
};

const percent = (ratio: number) => `${Math.round(ratio * 100)} %`;

const SUMMARY = [
  "La lecture du devis est faite par une intelligence artificielle ; les vérifications et le verdict, par des règles fixes.",
  "Une erreur n'est affichée comme sûre que si les chiffres en cause ont été bien lus.",
  "Chaque avis de prix dit d'où il vient et quelle confiance lui accorder.",
  "Aucun artisan ne paie Loupe, aucune publicité n'influence un résultat.",
] as const;

/**
 * Comment Loupe compare et juge : critères, sources, seuils, limites. Toutes
 * les valeurs viennent de `src/config/` : la page ne peut pas dire autre
 * chose que ce que fait le code.
 */
export default function MethodPage() {
  return (
    <LegalPage
      title="Notre méthode"
      path="/methode"
      eyebrow="Comment Loupe vérifie un devis"
      updated="24 octobre 2026"
      intro="Ce que fait l'intelligence artificielle, ce que font les règles, d'où viennent les prix et comment le verdict est rendu."
      summary={<LegalSummary items={SUMMARY} />}
    >
      <LegalSection id="lecture" title="1. La lecture">
        <p>
          {fr(
            "Le modèle Claude d'Anthropic lit le devis : chaque ligne (libellé, quantité, prix unitaire, total, TVA), les totaux, l'acompte, les dates, et la présence des mentions (nom de l'entreprise, adresse, SIRET, assurance…). Il recopie les montants tels qu'ils sont imprimés, même faux. Il ne recopie ni nom, ni adresse, ni téléphone, ni numéro : seulement s'ils figurent sur le devis.",
          )}
        </p>
        <p>
          {fr(
            "Pour chaque information, il indique s'il l'a lue avec certitude. Une lecture automatique peut se tromper, surtout sur une photo floue, penchée ou mal éclairée.",
          )}
        </p>
        <p>
          {fr(
            "Loupe n'analyse pas un devis de santé (dentaire, optique, auditif, médical), un document qui n'est pas un devis (une facture, par exemple) ni une photo illisible : la lecture s'arrête et rien n'est gardé.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="verifications" title="2. Les vérifications">
        <p>{fr("Elles sont faites par des règles fixes, en TypeScript, jamais par l'intelligence artificielle.")}</p>
        <LegalList>
          <li>
            {fr(
              `Calculs : quantité × prix unitaire, totaux HT, TVA et TTC, avec une tolérance d'arrondi (au moins ${Math.round(checksConfig.toleranceEuros * 100)} centimes).`,
            )}
          </li>
          <li>{fr("TVA : un taux qui n'existe pas là où ont lieu les travaux, ou inhabituel pour ce corps de métier.")}</li>
          <li>{fr("Mentions : celles qui manquent au devis, selon le corps de métier.")}</li>
          <li>
            {fr(
              `Acompte : un point d'attention au-delà de ${checksConfig.depositWarningPercent} % du total, jamais une accusation.`,
            )}
          </li>
          <li>
            {fr(
              `Contrat signé à domicile : un rappel du délai de rétractation (${DOOR_TO_DOOR_RULE.withdrawalDays} jours) et, si un acompte est demandé, de l'interdiction de principe d'encaisser avant ${DOOR_TO_DOOR_RULE.noPaymentDays} jours.`,
            )}
          </li>
          <li>
            {fr(
              `Lignes vagues : un libellé comme « Forfait divers » à partir de ${checksConfig.vagueLineMinAmount} € HT.`,
            )}
          </li>
        </LegalList>
        <p>
          {fr(
            "Si les chiffres en cause ont été mal lus, le constat est présenté « à confirmer sur votre devis », jamais comme une erreur sûre. Les références juridiques ne sont affichées qu'une fois relues ; en attendant, Loupe décrit ce qu'il constate sans citer de texte.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="prix" title="3. Les prix">
        <LegalItem title="La base Loupe">
          <p>
            {fr(
              `Elle réunit les lignes de prix des devis déjà analysés, rendues anonymes. Une ligne n'est comparée qu'à des lignes de la même prestation (nomenclature de Loupe), de la même unité et de la même région, datant de moins de ${pricingConfig.windowMonths} mois. Un même devis analysé deux fois ne compte qu'une fois.`,
            )}
          </p>
          <p>
            {fr(
              `La médiane et les quartiles sont calculés dès ${pricingConfig.minComparables} lignes comparables, venues d'au moins ${pricingConfig.minComparableDays} jours différents, ${pricingConfig.maxComparablesPerDay} par jour au plus : quelques devis envoyés le même jour ne suffisent pas à faire un prix.`,
            )}
          </p>
        </LegalItem>
        <LegalItem title="Sinon, une estimation IA">
          <p>
            {fr(
              `Le modèle propose une fourchette sans voir les prix de votre devis, pour ${pricingConfig.maxEstimatedLines} lignes au plus, les plus chères d'abord, et seulement à partir de ${pricingConfig.minEstimatedAmount} € HT. Elle est toujours étiquetée « estimation IA, confiance faible » : ce n'est pas un prix de marché.`,
            )}
          </p>
        </LegalItem>
        <LegalItem title="Sans avis">
          <p>{fr("Une ligne mal lue, vague ou une remise n'a pas d'avis de prix : mieux vaut rien qu'un avis sur un prix incertain.")}</p>
        </LegalItem>
      </LegalSection>

      <LegalSection id="verdict" title="4. Le verdict">
        <LegalList>
          <li>
            {fr(
              `« À vérifier sérieusement » : des erreurs de calcul qui vous coûtent au moins ${verdictConfig.alertOvercharge} €, l'absence du nom de l'entreprise, ou un prix au moins ${percent(verdictConfig.alertPriceRatio)} au-dessus de la médiane de la base Loupe.`,
            )}
          </li>
          <li>
            {fr(
              `« À négocier » : un prix au moins ${percent(verdictConfig.negotiatePriceRatio)} au-dessus de la médiane, au-dessus d'une fourchette IA, ou tout autre constat (hors simple rappel).`,
            )}
          </li>
          <li>{fr("« Correct » : rien de tout cela. Aucune économie n'est alors annoncée.")}</li>
        </LegalList>
        <p>{fr("Une estimation IA ne mène jamais à « À vérifier sérieusement ». Le verdict reste privé : il ne vise aucun artisan nommé.")}</p>
      </LegalSection>

      <LegalSection id="message" title="5. Le message à l'artisan">
        <p>
          {fr(
            "Il est rédigé par des règles fixes, au vouvoiement, sous forme de questions et de propositions, jamais d'accusations. Il ne reprend que les constats sûrs et les prix de la base Loupe nettement au-dessus de la médiane : jamais une estimation IA ni un chiffre à confirmer. Sans point vérifié, pas de message.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="limites" title="6. Les limites">
        <p>
          {fr(
            `La base n'est pas exhaustive : elle s'enrichit à chaque analyse. Loupe donne un avis indicatif, qui ne remplace ni un professionnel ni un conseil juridique. Le service est gratuit, dans la limite de ${limits.analysesPerDay} analyses par jour.`,
          )}
        </p>
        <p>
          {fr("Une erreur dans une analyse ? ")}
          <Link href="/mentions-legales#contact" className={legalLinkClass}>
            Écrivez-nous
          </Link>
          {fr(". Les conditions d'utilisation : ")}
          <Link href="/conditions" className={legalLinkClass}>
            conditions
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
