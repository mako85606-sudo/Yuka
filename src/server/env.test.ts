import { describe, expect, it } from "vitest";
import { isProductionDeployment, siteOrigin, type ServerEnv } from "@/server/env";

describe("siteOrigin", () => {
  it("prend SITE_URL en priorité, sans barre finale", () => {
    const env: ServerEnv = { SITE_URL: "https://loupe.fr/", VERCEL_PROJECT_PRODUCTION_URL: "loupe.vercel.app" };
    expect(siteOrigin(env)).toBe("https://loupe.fr");
  });

  it("se rabat sur le domaine de production Vercel, en HTTPS", () => {
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "loupe.vercel.app" })).toBe("https://loupe.vercel.app");
  });

  it("vaut le serveur local sans rien d'autre", () => {
    expect(siteOrigin({})).toBe("http://localhost:3000");
  });
});

describe("isProductionDeployment", () => {
  it("n'est vrai que sur le déploiement de production Vercel", () => {
    expect(isProductionDeployment({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionDeployment({})).toBe(false);
  });
});
