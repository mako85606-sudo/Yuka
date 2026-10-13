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
  /** Fourni par Vercel : « production », « preview » ou « development ». */
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional().catch(undefined),
});

export type ServerEnv = z.infer<typeof envSchema>;

/**
 * Variables d'environnement du serveur, validées. Relues à chaque appel (c'est
 * peu coûteux) pour que les tests puissent les modifier.
 */
export function serverEnv(): ServerEnv {
  return envSchema.parse(process.env);
}

/** Vrai sur le déploiement de production Vercel : aucun repli de secours n'y est permis. */
export function isProductionDeployment(env: ServerEnv = serverEnv()): boolean {
  return env.VERCEL_ENV === "production";
}
