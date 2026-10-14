import { describe, expect, it } from "vitest";
import { codespaceHost, isProductionDeployment, siteOrigin, type ServerEnv } from "@/server/env";

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

describe("codespaceHost", () => {
  it("donne l'adresse publique du port dans un codespace", () => {
    const env: ServerEnv = { CODESPACE_NAME: "octocat-loupe", GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev" };
    expect(codespaceHost(env)).toBe("octocat-loupe-3000.app.github.dev");
    expect(codespaceHost({ ...env, PORT: "3001" })).toBe("octocat-loupe-3001.app.github.dev");
  });

  it("vaut null hors Codespaces", () => {
    expect(codespaceHost({})).toBeNull();
    expect(codespaceHost({ CODESPACE_NAME: "octocat-loupe" })).toBeNull();
  });
});
