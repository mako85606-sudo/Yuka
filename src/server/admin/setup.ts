import "server-only";
import { legal } from "@/config/legal";
import { limits } from "@/config/limits";
import { llmConfig, MODEL_PRICING, modelRetainsContent } from "@/config/llm";
import { serverEnv, siteOrigin, type ServerEnv } from "@/server/env";

/**
 * État de la configuration, pour `/admin` : ce qui est réglé, ce qui manque,
 * jamais une valeur secrète (seulement « oui » ou « non »). Sert surtout après
 * une mise en ligne, pour voir d'un coup d'œil ce qu'il reste à faire.
 */

export type SetupState = "ok" | "missing" | "warning" | "optional";

export interface SetupItem {
  readonly id: string;
  readonly label: string;
  readonly state: SetupState;
  /** Ce qu'il faut savoir ou faire, en une phrase. */
  readonly detail: string;
}

/** Informations des pages légales encore vides (« à compléter » en rouge sur le site). */
export function missingLegalFields(): number {
  const values: (string | null)[] = [
    ...Object.values(legal.publisher),
    legal.publicationDirector,
    legal.privacyContact,
    legal.databaseHost.name,
    legal.databaseHost.address,
    legal.databaseHost.contact,
    ...legal.processors.flatMap((processor) => [processor.entity, processor.location, processor.retention, processor.safeguards]),
    ...legal.processing.map((activity) => activity.duration),
  ];
  return values.filter((value) => value === null).length;
}

export function setupChecklist(env: ServerEnv = serverEnv()): readonly SetupItem[] {
  const model = env.ANTHROPIC_MODEL ?? llmConfig.defaultModel;
  const missingLegal = missingLegalFields();
  return [
    {
      id: "anthropic",
      label: "Clé de l'API Claude",
      state: env.ANTHROPIC_API_KEY ? "ok" : "missing",
      detail: env.ANTHROPIC_API_KEY
        ? "Les devis peuvent être lus."
        : "ANTHROPIC_API_KEY manque : l'analyse est fermée.",
    },
    {
      id: "model",
      label: "Modèle de lecture",
      state: modelRetainsContent(model) || !MODEL_PRICING[model] ? "warning" : "ok",
      detail: modelRetainsContent(model)
        ? `${model} : Anthropic garde 30 jours ce qu'il lit, contrairement à ce que dit la politique de confidentialité.`
        : MODEL_PRICING[model]
          ? model
          : `${model} : tarif inconnu, la dépense est comptée au tarif le plus cher (src/config/llm.ts).`,
    },
    {
      id: "database",
      label: "Base de données",
      state: env.DATABASE_URL ? "ok" : "missing",
      detail: env.DATABASE_URL
        ? "Analyses, base de prix, limites et inscriptions enregistrées."
        : "DATABASE_URL manque : l'analyse est fermée en ligne (pas de limite quotidienne possible).",
    },
    {
      id: "ip-secret",
      label: "Secret des adresses IP",
      state: env.IP_HASH_SECRET ? "ok" : "missing",
      detail: env.IP_HASH_SECRET
        ? "Les limites quotidiennes fonctionnent."
        : "IP_HASH_SECRET manque (32 caractères au moins) : l'analyse est fermée en ligne.",
    },
    {
      id: "cron",
      label: "Nettoyage de nuit",
      state: env.CRON_SECRET ? "ok" : "missing",
      detail: env.CRON_SECRET
        ? "Les données expirées sont effacées chaque nuit."
        : "CRON_SECRET manque : l'effacement ne se fait qu'après une analyse.",
    },
    {
      id: "site-url",
      label: "Adresse du site",
      state: env.SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL ? "ok" : "optional",
      detail: siteOrigin(env),
    },
    {
      id: "posthog",
      label: "Mesure PostHog",
      state: env.POSTHOG_KEY ? "ok" : "optional",
      detail: env.POSTHOG_KEY
        ? "Les événements sont aussi envoyés à PostHog (Europe)."
        : "Facultatif : sans POSTHOG_KEY, les événements restent dans la base.",
    },
    {
      id: "legal",
      label: "Pages légales",
      state: missingLegal === 0 ? "ok" : "warning",
      detail:
        missingLegal === 0
          ? "Toutes les informations sont renseignées."
          : `${missingLegal} informations « à compléter » (src/config/legal.ts) : à remplir avant d'ouvrir au public.`,
    },
    {
      id: "budget",
      label: "Plafond de dépense",
      state: "ok",
      detail: `${limits.dailyLlmBudgetUsd} $ par jour (src/config/limits.ts). Fixez aussi une limite mensuelle dans la console Anthropic.`,
    },
  ];
}
