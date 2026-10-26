/**
 * Adresse et chiffrement des connexions à Postgres, partagés par le site
 * (`src/server/db/client.ts`) et le script de migrations
 * (`scripts/migrate.ts`). Ni `server-only` ni alias `@/` : le script le
 * charge hors de Next.js.
 */

/** Modes `sslmode` qui vérifient le certificat du serveur, pas seulement le chiffrement. */
const VERIFYING_MODES = new Set(["verify-full", "verify-ca"]);

/**
 * Paramètres de libpq (le client officiel de Postgres) que postgres.js ne
 * connaît pas : il les enverrait au serveur comme réglages de session, et
 * Postgres refuserait la connexion (« unrecognized configuration parameter
 * "channel_binding" », vérifié sur un vrai serveur). L'adresse que Neon
 * propose contient `channel_binding=require`.
 */
const LIBPQ_ONLY_PARAMETERS = [
  "sslmode",
  "channel_binding",
  "sslrootcert",
  "sslcert",
  "sslkey",
  "sslcrl",
  "sslcrldir",
  "sslpassword",
  "sslcompression",
  "sslsni",
  "sslcertmode",
  "ssl_min_protocol_version",
  "ssl_max_protocol_version",
  "gssencmode",
  "gssdelegation",
  "gsslib",
  "krbsrvname",
  "requiressl",
  "require_auth",
  "passfile",
  "service",
  "hostaddr",
  "keepalives",
  "keepalives_idle",
  "keepalives_interval",
  "keepalives_count",
  "tcp_user_timeout",
  "load_balance_hosts",
] as const;

export type SslMode = "verify-full" | "require" | false;

export interface PostgresConnection {
  /** L'adresse, sans les paramètres que postgres.js ne comprend pas. */
  readonly url: string;
  /** À passer tel quel à postgres.js (`ssl`). */
  readonly ssl: SslMode;
}

function isLocal(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

/**
 * Connexion à passer à postgres.js. Vers une base locale (développement) :
 * pas de chiffrement, elle n'a en général pas de certificat. Vers une base
 * distante : toujours chiffrée (`require`, même si l'adresse dit moins), et
 * certificat vérifié (`verify-full`) si l'adresse le demande
 * (`sslmode=verify-full`, `sslrootcert=system`) ou demande la liaison de canal
 * (`channel_binding=require`, adresse de Neon) : postgres.js ne sait pas faire
 * cette liaison, qui protège d'un intermédiaire ; vérifier le certificat
 * protège de la même chose.
 */
export function postgresConnection(url: string): PostgresConnection {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, ssl: "require" };
  }
  const params = parsed.searchParams;
  const mode = params.get("sslmode");
  const verify =
    (mode !== null && VERIFYING_MODES.has(mode)) ||
    params.get("sslrootcert") === "system" ||
    params.get("channel_binding") === "require";
  const ssl: SslMode = isLocal(parsed.hostname) ? false : verify ? "verify-full" : "require";
  for (const name of LIBPQ_ONLY_PARAMETERS) params.delete(name);
  return { url: parsed.toString(), ssl };
}
