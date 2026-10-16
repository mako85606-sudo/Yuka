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

/**
 * Adresse publique du site, pour les liens absolus (plan du site) :
 * `SITE_URL`, sinon le domaine de production Vercel, sinon le serveur local.
 */
export function siteOrigin(env: ServerEnv = serverEnv()): string {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/**
 * Dans un GitHub Codespace, le site s'ouvre à l'adresse publique du port
 * (« nom-3000.app.github.dev ») alors que le serveur se croit sur localhost :
 * cet hôte-là est aussi le nôtre. `null` hors Codespaces (en production, toujours).
 */
export function codespaceHost(env: ServerEnv = serverEnv()): string | null {
  const name = env.CODESPACE_NAME;
  const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (!name || !domain) return null;
  return `${name}-${env.PORT ?? "3000"}.${domain}`;
}

/** Domaine des adresses publiques de GitHub Codespaces, quand le codespace ne le précise pas. */
export const CODESPACES_FORWARDING_DOMAIN = "app.github.dev";

/**
 * Hôtes publics qui sont aussi les nôtres, en motifs (« *.app.github.dev » :
 * `*` remplace un seul niveau du nom). L'adresse exacte du codespace quand le
 * serveur la connaît ; en développement seulement, toute adresse de codespace :
 * le serveur ne connaît pas toujours son nom public (variables du codespace
 * absentes du processus, port déplacé quand 3000 est pris). Jamais en
 * production : seul l'hôte du site y est accepté.
 */
export function ownForwardedHosts(env: ServerEnv = serverEnv(), nodeEnv = process.env.NODE_ENV): string[] {
  const exact = codespaceHost(env);
  const hosts = exact ? [exact] : [];
  if (nodeEnv === "development") {
    hosts.push(`*.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? CODESPACES_FORWARDING_DOMAIN}`);
  }
  return hosts;
}

/** L'hôte correspond-il au motif ? Égalité, ou `*.` en tête pour exactement un niveau de plus. */
export function hostMatches(host: string, pattern: string): boolean {
  if (!pattern.startsWith("*.")) return host === pattern;
  const suffix = pattern.slice(1);
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}
