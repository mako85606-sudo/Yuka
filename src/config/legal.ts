import { analyticsConfig } from "@/config/analytics";
import { limits } from "@/config/limits";
import { pricingConfig } from "@/config/pricing";

/**
 * Informations des pages légales (`/mentions-legales`, `/confidentialite`,
 * `/conditions`) et du registre des traitements (`docs/registre-traitements.md`).
 *
 * Tout ce qui dépend de l'éditeur ou d'un contrat (identité, adresses,
 * conditions des prestataires) n'est pas inventé : une valeur `null`
 * s'affiche « à compléter » sur la page, bien visible, jusqu'à ce qu'elle
 * soit renseignée ici.
 *
 * Sources de l'audit du 24 octobre 2026 (à relire avant la mise en ligne) :
 * - LCEN, art. 1-1 (identification de l'éditeur et de l'hébergeur, depuis la
 *   loi n° 2024-449) et art. 19 (commerce électronique).
 *   https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614
 * - RGPD, art. 13 (information), 30 (registre), 37 (délégué non obligatoire).
 * - Anthropic : contrat conclu avec Anthropic Ireland, Limited pour l'EEE,
 *   accord de traitement avec clauses contractuelles types, pas
 *   d'entraînement sur les données, rien de conservé par défaut, jusqu'à
 *   2 ans pour un contenu signalé, stockage aux États-Unis, calcul dans
 *   toute zone (`inference_geo` : `global` par défaut, pas d'option UE).
 *   https://www.anthropic.com/legal/commercial-terms
 *   https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
 *   https://platform.claude.com/docs/en/manage-claude/data-residency
 *
 * TODO: vérifier — compléter l'éditeur et le directeur de la publication ;
 * vérifier l'adresse de Vercel, le choix et la région de la base, les
 * garanties de transfert (Data Privacy Framework, clauses types) et les
 * durées de conservation de chaque prestataire dans leurs contrats ; accepter
 * et archiver leurs accords de traitement ; faire relire ces pages par un
 * juriste avant la mise en ligne.
 */

export interface LegalEntity {
  readonly name: string | null;
  readonly address: string | null;
  readonly contact: string | null;
}

/** Éditeur du site (LCEN, art. 1-1 ; art. 19 s'il exerce une activité économique). */
export interface Publisher {
  /** « Entrepreneur individuel », « SAS au capital de 1 000 € »… */
  readonly status: string | null;
  /** Prénom et nom, ou dénomination sociale. */
  readonly name: string | null;
  /** Domicile ou siège social. */
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  /** « SIREN 123 456 789 (RNE) », « RCS Lyon 123 456 789 ». */
  readonly registration: string | null;
  /** Numéro de TVA intracommunautaire, ou la mention de la franchise. */
  readonly vatNumber: string | null;
}

export interface Processor {
  readonly name: string;
  /** Société qui contracte avec Loupe, si elle est connue. */
  readonly entity: string | null;
  /** Ce qu'il fait pour Loupe. */
  readonly role: string;
  /** Où les données sont traitées. */
  readonly location: string | null;
  /** Ce qu'on sait de sa conservation des données, s'il y a lieu. */
  readonly retention: string | null;
  /** Garanties d'un transfert hors de l'Union européenne. */
  readonly safeguards: string | null;
}

/** Une ligne du tableau « Pourquoi, sur quelle base, combien de temps ». */
export interface ProcessingActivity {
  readonly id: string;
  readonly purpose: string;
  readonly data: string;
  readonly basis: string;
  /** `null` : durée à fixer par l'éditeur. */
  readonly duration: string | null;
}

const retention = {
  analysisDays: limits.analysisRetentionDays,
  priceLinesMonths: pricingConfig.windowMonths,
  eventsMonths: analyticsConfig.eventsRetentionMonths,
  signupYears: limits.signupRetentionYears,
  /** Compteurs d'analyses : ceux d'avant-hier sont effacés (`purgeExpiredQuotas`). */
  quotaDays: 2,
  adminSessionHours: limits.adminSessionHours,
} as const;

export const legal = {
  /** TODO: vérifier — à compléter par l'éditeur. */
  publisher: {
    status: null,
    name: null,
    address: null,
    phone: null,
    email: null,
    registration: null,
    vatNumber: null,
  } satisfies Publisher as Publisher,
  /** Directeur ou directrice de la publication. TODO: vérifier — à compléter. */
  publicationDirector: null as string | null,
  /** Adresse pour exercer ses droits sur ses données. TODO: vérifier — à compléter. */
  privacyContact: null as string | null,
  /**
   * Hébergeur du site. Les fonctions s'exécutent à Francfort (`vercel.json`, `fra1`).
   * TODO: vérifier — adresse relevée dans la politique de confidentialité de
   * Vercel (https://vercel.com/legal/privacy-notice) par un moteur de
   * recherche, page non ouverte ; téléphone non trouvé.
   */
  host: {
    name: "Vercel Inc.",
    address: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
    contact: "privacy@vercel.com",
  } satisfies LegalEntity as LegalEntity,
  /** Région d'exécution du site (`vercel.json`). */
  hostRegion: "Francfort (Allemagne)",
  /**
   * Hébergeur de la base de données.
   * TODO: vérifier — choisir entre Neon et Supabase, puis renseigner la
   * société exacte, son adresse et la région (Francfort conseillée).
   */
  databaseHost: { name: null, address: null, contact: null } satisfies LegalEntity as LegalEntity,
  /** Prestataires qui traitent des données pour Loupe. */
  processors: [
    {
      name: "Anthropic",
      entity: "Anthropic Ireland, Limited (contrat pour l'Europe) ; Anthropic, PBC et ses sous-traitants (traitement)",
      role: "lit le devis (photo ou PDF) avec son modèle Claude, le temps de l'analyse, et propose les fourchettes de prix « estimation IA »",
      location:
        "Stockage aux États-Unis ; le calcul peut avoir lieu dans toute zone où Anthropic dispose de capacités",
      retention:
        "Par défaut, Anthropic ne conserve pas le contenu des requêtes et ne s'en sert pas pour entraîner ses modèles. Elle peut le garder jusqu'à deux ans s'il est signalé par ses contrôles de sécurité, ou si la loi l'y oblige.",
      // TODO: vérifier — certification Data Privacy Framework d'Anthropic (dataprivacyframework.gov/list).
      safeguards: "Clauses contractuelles types de la Commission européenne, prévues par l'accord de traitement des données d'Anthropic",
    },
    {
      name: "Vercel",
      entity: "Vercel Inc. (États-Unis)",
      role: "héberge le site et exécute l'analyse ; ses journaux techniques contiennent l'adresse IP des visiteurs",
      location: "Francfort (Allemagne) pour l'exécution ; société établie aux États-Unis",
      // TODO: vérifier — durée des journaux selon l'offre Vercel choisie.
      retention: null,
      // TODO: vérifier — Data Privacy Framework et clauses types, dans l'accord de traitement de Vercel.
      safeguards: null,
    },
    {
      name: "Base de données",
      // TODO: vérifier — Neon (Neon, LLC) ou Supabase (Supabase Pte. Ltd.).
      entity: null,
      role: "héberge la base de données : analyses, lignes de prix anonymes, compteurs chiffrés, événements de mesure, emails des inscrits",
      location: null,
      retention: null,
      safeguards: null,
    },
    {
      name: "PostHog",
      entity: "PostHog Inc.",
      role: "reçoit les événements de mesure pseudonymes, sans adresse IP ni géolocalisation",
      // TODO: vérifier — hébergement en Allemagne, accès possible depuis les États-Unis pour le support.
      location: "Union européenne (Allemagne) ; accès possible depuis les États-Unis pour le support",
      // TODO: vérifier — réglage de conservation du projet PostHog, à aligner sur `eventsRetentionMonths`.
      retention: null,
      // TODO: vérifier — Data Privacy Framework ou clauses types, dans l'accord de traitement de PostHog.
      safeguards: null,
    },
  ] satisfies readonly Processor[] as readonly Processor[],
  /** Pourquoi, sur quelle base, combien de temps (RGPD, art. 13). */
  processing: [
    {
      id: "analyse",
      purpose: "Analyser votre devis",
      data: "La photo ou le PDF du devis, qui peut porter votre nom, votre adresse et ceux de l'artisan",
      basis: "Le service que vous demandez (art. 6.1.b du RGPD) ; votre accord explicite pour une éventuelle information sensible (art. 9.2.a)",
      duration: "Lu en mémoire, jamais enregistré par Loupe (chez Anthropic : voir « Qui reçoit ces données »)",
    },
    {
      id: "resultat",
      purpose: "Vous montrer le résultat",
      data: "Verdict, constats, avis de prix, lignes et objet filtrés, catégorie, département, région",
      basis: "Le service que vous demandez (art. 6.1.b)",
      duration: `${retention.analysisDays} jours, ou jusqu'à ce que vous effaciez l'analyse`,
    },
    {
      id: "prix",
      purpose: "Comparer les prix",
      data: "Lignes de prix filtrées (« chauffe-eau 200 L, 890 € HT »), catégorie, département, région, détachées de toute analyse",
      basis: "L'intérêt légitime de Loupe à constituer sa base de comparaison (art. 6.1.f)",
      duration: `${retention.priceLinesMonths} mois`,
    },
    {
      id: "abus",
      purpose: "Limiter les abus",
      data: `Une empreinte chiffrée (HMAC) de votre adresse IP et du jour, pour compter vos ${limits.analysesPerDay} analyses quotidiennes : elle ne permet ni de retrouver l'adresse, ni de relier deux jours`,
      basis: "L'intérêt légitime de Loupe à rester disponible et gratuit (art. 6.1.f)",
      duration: `${retention.quotaDays} jours`,
    },
    {
      id: "hebergement",
      purpose: "Sécurité de l'hébergement",
      data: "Journaux techniques de Vercel : adresse IP, date, page demandée",
      basis: "L'intérêt légitime de Loupe à sécuriser le site (art. 6.1.f)",
      // TODO: vérifier — durée selon l'offre Vercel.
      duration: null,
    },
    {
      id: "mesure",
      purpose: "Mesurer l'audience",
      data: "Un identifiant de visite tiré au hasard, le nom de l'événement, la catégorie, le verdict, l'étape",
      basis: "L'intérêt légitime de Loupe à améliorer le service (art. 6.1.f) ; vous pouvez vous y opposer",
      duration: `${retention.eventsMonths} mois`,
    },
    {
      id: "email",
      purpose: "Vous prévenir des nouveautés",
      data: "Votre email, l'endroit où vous l'avez laissé, la date",
      basis: "Votre consentement (art. 6.1.a)",
      duration: `Jusqu'à votre désinscription, et au plus ${retention.signupYears} ans après l'inscription`,
    },
    {
      id: "partage",
      purpose: "Le lien de partage, si vous le créez",
      data: "Un identifiant public et une version réduite de l'analyse, sans date ni département",
      basis: "Le service que vous demandez (art. 6.1.b)",
      duration: "S'éteint avec l'analyse",
    },
    {
      id: "demandes",
      purpose: "Répondre à vos demandes",
      data: "Votre message et notre réponse",
      basis: "Nos obligations légales, quand vous exercez vos droits (art. 6.1.c)",
      // TODO: vérifier — durée de conservation des demandes d'exercice des droits.
      duration: null,
    },
  ] satisfies readonly ProcessingActivity[] as readonly ProcessingActivity[],
  /** Autorité de contrôle. */
  authority: { name: "CNIL", url: "https://www.cnil.fr" },
  /** Cookie de l'administration (`ADMIN_COOKIE`, `src/server/admin/auth.ts`). */
  adminCookie: "loupe_admin",
  /** Durées de conservation, tirées de la configuration (une seule source). */
  retention,
} as const;

/** Texte affiché à la place d'une information manquante. */
export const MISSING = "à compléter";
