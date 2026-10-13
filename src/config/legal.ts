import { analyticsConfig } from "@/config/analytics";
import { limits } from "@/config/limits";
import { pricingConfig } from "@/config/pricing";

/**
 * Informations des pages légales (`/mentions-legales`, `/confidentialite`).
 *
 * Tout ce qui dépend de l'éditeur ou d'un contrat (identité, adresses,
 * conditions des prestataires) n'est pas inventé : une valeur `null`
 * s'affiche « à compléter » sur la page, bien visible, jusqu'à ce qu'elle
 * soit renseignée ici.
 *
 * TODO: vérifier — compléter l'éditeur et le directeur de la publication,
 * vérifier les adresses des hébergeurs et les conditions des prestataires
 * (lieu de traitement, durée de conservation, garanties de transfert hors
 * UE) dans leurs contrats et politiques, et faire relire ces pages avant la
 * mise en ligne.
 */

export interface LegalEntity {
  readonly name: string | null;
  readonly address: string | null;
  readonly contact: string | null;
}

export interface Processor {
  readonly name: string;
  /** Ce qu'il fait pour Loupe. */
  readonly role: string;
  /** Où les données sont traitées. */
  readonly location: string | null;
  /** Ce qu'on sait de sa conservation des données, s'il y a lieu. */
  readonly retention: string | null;
}

export const legal = {
  /** Éditeur du site (LCEN, art. 6 III). TODO: vérifier — à compléter. */
  publisher: {
    name: null,
    address: null,
    contact: null,
  } satisfies LegalEntity as LegalEntity,
  /** Immatriculation de l'éditeur (SIREN), s'il y en a une. TODO: vérifier — à compléter. */
  publisherRegistration: null as string | null,
  /** Directeur ou directrice de la publication. TODO: vérifier — à compléter. */
  publicationDirector: null as string | null,
  /** Adresse pour exercer ses droits sur ses données. TODO: vérifier — à compléter. */
  privacyContact: null as string | null,
  /**
   * Hébergeur du site.
   * TODO: vérifier — adresse et contact de Vercel Inc. dans ses conditions.
   */
  host: { name: "Vercel Inc.", address: null, contact: null } satisfies LegalEntity as LegalEntity,
  /**
   * Prestataires qui traitent des données pour Loupe.
   * TODO: vérifier — lieux de traitement, durées de conservation et garanties
   * de transfert dans les contrats de chaque prestataire (et le choix entre
   * Neon et Supabase pour la base).
   */
  processors: [
    {
      name: "Anthropic",
      role: "lit le devis (photo ou PDF) avec son modèle Claude, le temps de l'analyse",
      location: "États-Unis",
      retention: null,
    },
    {
      name: "Vercel",
      role: "héberge le site et exécute l'analyse",
      location: null,
      retention: null,
    },
    {
      name: "Neon ou Supabase",
      role: "héberge la base de données (analyses, lignes de prix anonymes, compteurs, emails)",
      location: null,
      retention: null,
    },
    {
      name: "PostHog",
      role: "reçoit les événements de mesure anonymes (sans cookie, sans adresse IP)",
      location: "Union européenne",
      retention: null,
    },
  ] satisfies readonly Processor[] as readonly Processor[],
  /** Autorité de contrôle. */
  authority: { name: "CNIL", url: "https://www.cnil.fr" },
  /** Durées de conservation, tirées de la configuration (une seule source). */
  retention: {
    analysisDays: limits.analysisRetentionDays,
    priceLinesMonths: pricingConfig.windowMonths,
    eventsMonths: analyticsConfig.eventsRetentionMonths,
  },
} as const;

/** Texte affiché à la place d'une information manquante. */
export const MISSING = "à compléter";
