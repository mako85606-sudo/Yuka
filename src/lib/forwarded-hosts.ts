/**
 * Les adresses sous lesquelles le site est aussi le nôtre, derrière le relais
 * de GitHub Codespaces. Le site s'y ouvre à l'adresse publique du port
 * (« nom-3000.app.github.dev »), et le relais réécrit les en-têtes : `Origin`
 * devient « http://localhost:3000 » et l'adresse publique passe dans
 * `x-forwarded-host` (vercel/next.js#58019). Sans ces adresses, l'envoi d'un
 * devis et l'inscription (Server Action) sont refusés comme venant d'ailleurs.
 *
 * Module pur, sans alias ni dépendance : `next.config.ts` le charge hors de
 * Next.js (origines permises des Server Actions), et le serveur s'en sert pour
 * vérifier l'origine des envois (`isSameOrigin`). Rien n'est ajouté en
 * production, sauf l'adresse exacte d'un codespace si ses variables existent.
 */

/** Domaine des adresses publiques de GitHub Codespaces, quand le codespace ne le précise pas. */
export const CODESPACES_FORWARDING_DOMAIN = "app.github.dev";

/**
 * Les variables d'environnement (`process.env` ou leur version validée). Seules
 * comptent `CODESPACE_NAME` et `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`
 * (fournies par Codespaces), et `PORT`.
 */
export type ForwardingEnv = { readonly [name: string]: string | undefined };

function port(env: ForwardingEnv): string {
  return env.PORT?.trim() || "3000";
}

/** L'adresse publique du port dans un codespace ; `null` hors Codespaces. */
export function codespaceHost(env: ForwardingEnv): string | null {
  const name = env.CODESPACE_NAME?.trim();
  const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?.trim();
  if (!name || !domain) return null;
  return `${name}-${port(env)}.${domain}`;
}

/**
 * Adresses publiques de codespace, en motifs (`*.` : un seul niveau du nom).
 * L'adresse exacte quand le serveur la connaît ; en développement, toute
 * adresse de codespace : le serveur ne connaît pas toujours son nom public
 * (variables absentes du processus, port déplacé quand 3000 est pris).
 */
export function codespaceHosts(env: ForwardingEnv, nodeEnv: string | undefined): string[] {
  const exact = codespaceHost(env);
  const hosts = exact ? [exact] : [];
  if (nodeEnv === "development") {
    hosts.push(`*.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?.trim() || CODESPACES_FORWARDING_DOMAIN}`);
  }
  return hosts;
}

/**
 * Ports que `next dev` essaie l'un après l'autre quand le sien est pris (dix
 * de plus : `start-server.js` de Next) : un second lancement dans le même
 * codespace écoute alors sur 3001.
 */
const DEV_PORT_RETRIES = 10;

/**
 * Tous les hôtes acceptés en plus de celui de la requête : les adresses de
 * codespace et, en développement seulement, les adresses locales du serveur
 * (« localhost:3000 », « 127.0.0.1:3000 », et les ports suivants), que le
 * relais met dans `Origin`.
 */
export function ownForwardedHosts(env: ForwardingEnv, nodeEnv: string | undefined): string[] {
  const hosts = codespaceHosts(env, nodeEnv);
  if (nodeEnv === "development") {
    const first = Number(port(env));
    for (let offset = 0; offset <= DEV_PORT_RETRIES; offset += 1) {
      hosts.push(`localhost:${first + offset}`, `127.0.0.1:${first + offset}`);
    }
  }
  return hosts;
}

/** L'hôte correspond-il au motif ? Égalité, ou `*.` en tête pour exactement un niveau de plus. */
export function hostMatches(host: string, pattern: string): boolean {
  const name = host.toLowerCase();
  const wanted = pattern.toLowerCase();
  if (!wanted.startsWith("*.")) return name === wanted;
  const suffix = wanted.slice(1);
  if (!name.endsWith(suffix)) return false;
  const label = name.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".");
}
