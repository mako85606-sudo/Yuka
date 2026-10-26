/**
 * Base à laquelle `scripts/migrate.ts` applique les migrations, au build de
 * Vercel (`npm run vercel-build`) ou à la main (`npm run db:deploy`). Ni
 * `server-only` ni alias `@/` : le script le charge hors de Next.js.
 *
 * - L'adresse directe (`DATABASE_URL_UNPOOLED`, posée par l'intégration Neon
 *   de Vercel) passe avant l'adresse « pooled » (`DATABASE_URL`) : Neon
 *   déconseille le relais de connexions (PgBouncer) pour modifier le schéma.
 * - Un déploiement de test (Vercel « Preview ») ne migre rien par défaut : s'il
 *   voyait la base de production, il la modifierait avant même la revue du
 *   code. `MIGRATE_PREVIEW_DATABASE=true` l'autorise, quand chaque déploiement
 *   de test a sa propre branche de base (option « Preview » de l'intégration
 *   Neon).
 */

export type MigrationTarget =
  | { readonly kind: "migrate"; readonly url: string; readonly source: "DATABASE_URL_UNPOOLED" | "DATABASE_URL" }
  | { readonly kind: "skip"; readonly reason: string };

type MigrationEnv = Readonly<Record<string, string | undefined>>;

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function migrationTarget(env: MigrationEnv): MigrationTarget {
  if (env.VERCEL_ENV === "preview" && env.MIGRATE_PREVIEW_DATABASE !== "true") {
    return {
      kind: "skip",
      reason:
        "déploiement de test (Preview) : rien n'est appliqué, pour ne jamais toucher la base de production (MIGRATE_PREVIEW_DATABASE=true l'autorise si ce déploiement a sa propre base).",
    };
  }
  const direct = present(env.DATABASE_URL_UNPOOLED);
  if (direct) return { kind: "migrate", url: direct, source: "DATABASE_URL_UNPOOLED" };
  const pooled = present(env.DATABASE_URL);
  if (pooled) return { kind: "migrate", url: pooled, source: "DATABASE_URL" };
  return { kind: "skip", reason: "DATABASE_URL n'est pas définie : rien à appliquer." };
}
