import { describe, expect, it } from "vitest";
import { migrationTarget } from "./migration-target";

const POOLED = "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const DIRECT = "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require";

describe("migrationTarget", () => {
  it("préfère l'adresse directe de Neon pour modifier le schéma", () => {
    expect(migrationTarget({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT })).toEqual({
      kind: "migrate",
      url: DIRECT,
      source: "DATABASE_URL_UNPOOLED",
    });
    expect(migrationTarget({ DATABASE_URL: POOLED, VERCEL_ENV: "production" })).toMatchObject({
      kind: "migrate",
      url: POOLED,
    });
  });

  it("ne migre jamais depuis un déploiement de test, sauf autorisation", () => {
    expect(migrationTarget({ DATABASE_URL: POOLED, VERCEL_ENV: "preview" }).kind).toBe("skip");
    expect(
      migrationTarget({ DATABASE_URL: POOLED, VERCEL_ENV: "preview", MIGRATE_PREVIEW_DATABASE: "true" }).kind,
    ).toBe("migrate");
  });

  it("ne fait rien sans base", () => {
    expect(migrationTarget({ DATABASE_URL: "  " }).kind).toBe("skip");
    expect(migrationTarget({}).kind).toBe("skip");
  });
});
