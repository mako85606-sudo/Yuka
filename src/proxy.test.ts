import { readFileSync } from "node:fs";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { NONCE_PATTERN } from "@/lib/content-security-policy";
import { config, proxy } from "./proxy";

const matches = (url: string, headers?: Record<string, string>) =>
  unstable_doesMiddlewareMatch({ config, url, ...(headers ? { headers } : {}) });

/** Le nonce d'une politique, ou `null` s'il n'y en a pas. */
function nonceOf(policy: string | null): string | null {
  return policy?.match(/'nonce-([^']+)'/)?.[1] ?? null;
}

describe("proxy : adresses couvertes", () => {
  it("couvre les pages rendues à chaque visite", () => {
    expect(matches("/analyse/Gy7oSTYFlu8h3_gMsMpKGw")).toBe(true);
    expect(matches("/v/Rg2cT6agqJzCkcaaS-_7vA")).toBe(true);
    expect(matches("/admin")).toBe(true);
    // Les données de navigation (RSC) de ces pages aussi.
    expect(matches("/admin.rsc")).toBe(true);
  });

  it("laisse les pages statiques, les images, l'API et les fichiers à next.config.ts", () => {
    for (const url of [
      "/",
      "/analyse",
      "/methode",
      "/conditions",
      "/confidentialite",
      "/mentions-legales",
      "/desinscription",
      "/dev/design",
      "/analyse/abc/def",
      "/v/abc/opengraph-image",
      "/opengraph-image",
      "/icon.svg",
      "/api/analyze",
      "/api/events",
      "/_next/static/chunks/app.js",
      "/robots.txt",
      "/page-inconnue",
    ]) {
      expect(matches(url), url).toBe(false);
    }
  });

  it("ignore les préchargements de next/link, comme le conseille la doc", () => {
    expect(matches("/admin", { "next-router-prefetch": "1" })).toBe(false);
    expect(matches("/v/abc", { purpose: "prefetch" })).toBe(false);
  });

  it("ne couvre que des pages rendues à chaque visite (une page statique n'a pas de nonce)", () => {
    for (const page of ["app/analyse/[id]/page.tsx", "app/v/[shareId]/page.tsx", "app/admin/page.tsx"]) {
      const source = readFileSync(new URL(page, import.meta.url), "utf8");
      expect(source, page).toMatch(/await connection\(\)/);
    }
  });
});

describe("proxy : politique stricte", () => {
  it("pose le même nonce dans la requête (lu par Next.js) et dans la réponse", () => {
    const response = proxy(new NextRequest("http://localhost:3000/admin"));
    const sent = response.headers.get("content-security-policy");
    const forwarded = response.headers.get("x-middleware-request-content-security-policy");
    const nonce = nonceOf(sent);
    expect(nonce).toMatch(NONCE_PATTERN);
    expect(forwarded).toBe(sent);
    expect(sent?.split("; ").find((part) => part.startsWith("script-src"))).not.toContain("'unsafe-inline'");
  });

  it("tire un nonce neuf à chaque requête", () => {
    const first = nonceOf(proxy(new NextRequest("http://localhost:3000/v/abc")).headers.get("content-security-policy"));
    const second = nonceOf(proxy(new NextRequest("http://localhost:3000/v/abc")).headers.get("content-security-policy"));
    expect(first).not.toBe(second);
  });

  it("remplace une politique envoyée par le visiteur au lieu de la garder", () => {
    const request = new NextRequest("http://localhost:3000/admin", {
      headers: { "content-security-policy": "script-src 'nonce-choisi'" },
    });
    const forwarded = proxy(request).headers.get("x-middleware-request-content-security-policy");
    expect(forwarded).not.toContain("nonce-choisi");
    expect(nonceOf(forwarded)).toMatch(NONCE_PATTERN);
  });
});
