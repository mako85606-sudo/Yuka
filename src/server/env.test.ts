import { describe, expect, it } from "vitest";
import { developmentFallbacksAllowed, siteOrigin, type ServerEnv } from "@/server/env";

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

describe("developmentFallbacksAllowed", () => {
  it("n'autorise les replis qu'en développement et en test", () => {
    expect(developmentFallbacksAllowed({}, "development")).toBe(true);
    expect(developmentFallbacksAllowed({}, "test")).toBe(true);
    expect(developmentFallbacksAllowed({}, "production")).toBe(false);
    // Une préversion Vercel tourne en production : pas de repli non plus.
    expect(developmentFallbacksAllowed({ VERCEL_ENV: "preview" }, "production")).toBe(false);
  });

  it("les autorise pour un essai local explicite d'un build de production", () => {
    expect(developmentFallbacksAllowed({ ALLOW_MEMORY_QUOTA: "true" }, "production")).toBe(true);
    expect(developmentFallbacksAllowed({ ALLOW_MEMORY_QUOTA: "false" }, "production")).toBe(false);
  });
});
