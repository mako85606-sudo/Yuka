import type { Metadata } from "next";
import Link from "next/link";
import { Filled, LegalPage, LegalSection, legalLinkClass } from "@/components/legal/LegalPage";
import { legal } from "@/config/legal";
import { limits } from "@/config/limits";
import { site } from "@/config/site";
import { fr } from "@/lib/typography";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Ce que Loupe fait, ses limites, et ce que vous vous engagez à respecter en l'utilisant.",
};

/**
 * Conditions d'utilisation (recommandées par l'audit du 24 octobre 2026, non
 * imposées par la loi pour un service gratuit). Aucune clause n'exclut la
 * responsabilité de Loupe envers un consommateur (Code de la consommation,
 * art. R212-1, 6°).
 * TODO: vérifier — à faire relire par un juriste ; ajouter le médiateur de la
 * consommation et des conditions de vente avant toute offre payante.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      path="/conditions"
      updated="24 octobre 2026"
      intro="Ce que Loupe fait, ce qu'il ne fait pas, et les quelques règles du jeu."
    >
      <LegalSection id="objet" title="1. Objet">
        <p>
          {fr("Loupe, édité par ")}
          <Filled value={legal.publisher.name} />
          {fr(
            ", aide à relire un devis : vérification des calculs et des mentions, comparaison des prix, et un message prêt à envoyer à l'artisan.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="acces" title="2. Accès">
        <p>
          {fr(
            `Le service est gratuit et sans compte, dans la limite de ${limits.analysesPerDay} analyses par jour et par connexion. Une analyse reste accessible ${limits.analysisRetentionDays} jours par son lien, que vous êtes seul à recevoir.`,
          )}
        </p>
      </LegalSection>

      <LegalSection id="fonctionnement" title="3. Fonctionnement">
        <p>
          {fr(
            "Le devis est lu par une intelligence artificielle (Claude, d'Anthropic), puis vérifié par des règles fixes. Les prix sont comparés à la base Loupe ou, à défaut, à une estimation IA à confiance faible. Le détail : ",
          )}
          <Link href="/methode" className={legalLinkClass}>
            notre méthode
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="limites" title="4. Limites">
        <p className="rounded-lg bg-mist px-5 py-4 font-medium text-ink">{fr(site.disclaimer)}</p>
        <p>
          {fr(
            "Vérifiez sur votre devis original avant d'agir. Loupe ne porte aucun jugement sur un artisan nommé. Loupe répond de ses manquements dans les conditions du droit commun.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="engagements" title="5. Vos engagements">
        <p>
          {fr(
            "N'envoyez que des devis que vous avez reçus ou que vous êtes en droit de faire vérifier. N'envoyez pas de devis de santé (dentaire, optique, auditif, médical). N'utilisez pas le service de façon automatisée.",
          )}
        </p>
        <p>
          {fr(
            "Le message que vous envoyez à l'artisan l'est en votre nom : relisez-le et adaptez-le. Un lien de partage montre une version sans nom ni adresse ; c'est vous qui choisissez de le diffuser.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="6. Données">
        <p>
          {fr("Voir la ")}
          <Link href="/confidentialite" className={legalLinkClass}>
            politique de confidentialité
          </Link>
          {fr(". Les lignes de prix anonymes de votre devis alimentent la base de comparaison.")}
        </p>
      </LegalSection>

      <LegalSection id="disponibilite" title="7. Disponibilité">
        <p>
          {fr(
            "Loupe fait de son mieux pour que le service soit disponible, sans pouvoir le garantir en permanence. Il peut être suspendu pour maintenance, ou jusqu'au lendemain si son budget quotidien est atteint.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="propriete" title="8. Propriété intellectuelle">
        <p>{fr("Le site, la marque et les textes de Loupe appartiennent à son éditeur. Le message préparé pour vous est à vous.")}</p>
      </LegalSection>

      <LegalSection id="modifications" title="9. Modifications">
        <p>
          {fr(
            "Ces conditions sont datées. Une nouvelle version s'applique aux analyses lancées après sa publication.",
          )}
        </p>
      </LegalSection>

      <LegalSection id="droit" title="10. Droit applicable et réclamations">
        <p>
          {fr("Ces conditions relèvent du droit français. En cas de difficulté, écrivez d'abord à ")}
          <Filled value={legal.publisher.email} />
          {fr(". Les tribunaux sont compétents selon les règles de droit commun.")}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
