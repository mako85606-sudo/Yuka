import "server-only";
import { z } from "zod";

/** Une variable vide dans `.env.local` (« CLE= ») compte comme absente. */
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const envSchema = z.object({
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: optionalString,
  DATABASE_URL: optionalString,
  /** Secret du hachage des adresses IP (limite quotidienne). 32 caractères au moins. */
  IP_HASH_SECRET: optionalString.pipe(z.string().min(32).optional()).catch(undefined),
  /** Clé de projet PostHog (phc_…) ; sans elle, les événements restent dans Postgres. */
  POSTHOG_KEY: optionalString,
  /** Hôte PostHog ; par défaut l'hébergement européen (`src/config/analytics.ts`). */
  POSTHOG_HOST: optionalString.pipe(z.url().optional()).catch(undefined),
  /** Mot de passe de `/admin`, 16 caractères au moins ; sans lui, `/admin` reste fermé. */
  ADMIN_PASSWORD: optionalString.pipe(z.string().min(16).optional()).catch(undefined),
  /** Adresse publique du site (« https://loupe.fr »), pour les liens et les images de partage. */
  SITE_URL: optionalString.pipe(z.url().optional()).catch(undefined),
  /** Fourni par Vercel : le domaine de production (« loupe.vercel.app »), sans protocole. */
  VERCEL_PROJECT_PRODUCTION_URL: optionalString,
  /** Fourni par Vercel : « production », « preview » ou « development ». */
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional().catch(undefined),
  /** Fournis par GitHub Codespaces : nom du codespace et domaine de ses ports (« app.github.dev »). */
  CODESPACE_NAME: optionalString,
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: optionalString,
  /** Port du serveur (3000 par défaut). */
  PORT: optionalString,
  /**
   * « true » pour essayer un build de production en local sans base ni secret
   * (`npm run build` puis `npm start`) : compteur en mémoire et secret de
   * développement. Jamais sur un site en ligne.
   */
  ALLOW_MEMORY_QUOTA: z.enum(["true", "false"]).optional().catch(undefined),
  /** « true » si un relais de confiance (autre que Vercel) pose `x-real-ip` / `x-forwarded-for`. */
  TRUSTED_PROXY: z.enum(["true", "false"]).optional().catch(undefined),
  /** Secret des tâches planifiées (`/api/purge`), envoyé par Vercel Cron ; 16 caractères au moins. */
  CRON_SECRET: optionalString.pipe(z.string().min(16).optional()).catch(undefined),
});

export type ServerEnv = z.infer<typeof envSchema>;

/**
 * Variables d'environnement du serveur, validées. Relues à chaque appel (c'est
 * peu coûteux) pour que les tests puissent les modifier.
 */
export function serverEnv(): ServerEnv {
  return envSchema.parse(process.env);
}

/**
 * Vrai quand les replis de développement sont permis : compteur d'analyses en
 * mémoire, secret de hachage public, inscription simulée. Seulement en
 * développement et en test, ou si `ALLOW_MEMORY_QUOTA=true` est posé exprès
 * pour un essai local. Partout ailleurs (production Vercel, préversion, tout
 * `next start`), sans base ni secret, on ferme plutôt que d'ouvrir sans limite.
 */
export function developmentFallbacksAllowed(
  env: ServerEnv = serverEnv(),
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "development" || nodeEnv === "test" || env.ALLOW_MEMORY_QUOTA === "true";
}

/**
 * Adresse publique du site, pour les liens absolus (plan du site) :
 * `SITE_URL`, sinon le domaine de production Vercel, sinon le serveur local.
 */
export function siteOrigin(env: ServerEnv = serverEnv()): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
