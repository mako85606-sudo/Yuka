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
