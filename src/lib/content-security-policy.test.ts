import { getScriptNonceFromHeader } from "next/dist/server/app-render/get-script-nonce-from-header";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce, NONCE_PATTERN } from "@/lib/content-security-policy";

/** Les sources d'une directive, ou `null` si elle manque. */
function directive(policy: string, name: string): string[] | null {
  const found = policy
    .split(";")
    .map((part) => part.trim().split(/\s+/))
    .find(([key]) => key === name);
  return found ? found.slice(1) : null;
}

describe("contentSecurityPolicy", () => {
  it("garde 'unsafe-inline' sur les pages statiques, faute de nonce possible au build", () => {
    const policy = contentSecurityPolicy({ dev: false });
    expect(directive(policy, "script-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("n'autorise sur les pages dynamiques que les scripts au nonce de la requête", () => {
    const policy = contentSecurityPolicy({ dev: false, nonce: "abc123+/=" });
    const scripts = directive(policy, "script-src");
    expect(scripts).toEqual(["'self'", "'nonce-abc123+/='", "'strict-dynamic'"]);
    expect(scripts).not.toContain("'unsafe-inline'");
  });

  it("n'ajoute 'unsafe-eval' qu'en développement", () => {
    expect(contentSecurityPolicy({ dev: false })).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy({ dev: false, nonce: "abc" })).not.toContain("unsafe-eval");
    expect(directive(contentSecurityPolicy({ dev: true }), "script-src")).toContain("'unsafe-eval'");
    expect(directive(contentSecurityPolicy({ dev: true, nonce: "abc" }), "script-src")).toEqual([
      "'self'",
      "'nonce-abc'",
      "'strict-dynamic'",
      "'unsafe-eval'",
    ]);
  });

  it("laisse les styles en ligne, sans nonce (un nonce y ferait ignorer 'unsafe-inline')", () => {
    for (const policy of [contentSecurityPolicy({ dev: false }), contentSecurityPolicy({ dev: false, nonce: "abc" })]) {
      expect(directive(policy, "style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    }
  });

  it("ne change que `script-src` d'une version à l'autre : rien de tiers, ni cadre, ni objet", () => {
    const withoutScripts = (policy: string) =>
      policy
        .split("; ")
        .filter((part) => !part.startsWith("script-src"))
        .join("; ");
    const loose = contentSecurityPolicy({ dev: false });
    expect(withoutScripts(contentSecurityPolicy({ dev: false, nonce: "abc" }))).toBe(withoutScripts(loose));
    expect(directive(loose, "default-src")).toEqual(["'self'"]);
    expect(directive(loose, "img-src")).toEqual(["'self'", "blob:", "data:"]);
    expect(directive(loose, "connect-src")).toEqual(["'self'"]);
    expect(directive(loose, "font-src")).toEqual(["'self'"]);
    expect(directive(loose, "object-src")).toEqual(["'none'"]);
    expect(directive(loose, "base-uri")).toEqual(["'self'"]);
    expect(directive(loose, "form-action")).toEqual(["'self'"]);
    expect(directive(loose, "frame-ancestors")).toEqual(["'none'"]);
    expect(loose).not.toMatch(/https?:/);
  });

  it("refuse un nonce mal formé plutôt que d'abîmer l'en-tête", () => {
    expect(() => contentSecurityPolicy({ dev: false, nonce: "abc'; script-src *" })).toThrow();
    expect(() => contentSecurityPolicy({ dev: false, nonce: "" })).toThrow();
  });
});

describe("createNonce", () => {
  it("tire un nonce neuf à chaque requête, de 128 bits", () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(nonce).toMatch(NONCE_PATTERN);
      expect(atob(nonce)).toHaveLength(16);
    }
  });

  it("donne un nonce que Next.js relit dans l'en-tête de la requête", () => {
    const nonce = createNonce();
    expect(getScriptNonceFromHeader(contentSecurityPolicy({ dev: false, nonce }))).toBe(nonce);
    expect(getScriptNonceFromHeader(contentSecurityPolicy({ dev: true, nonce }))).toBe(nonce);
    expect(getScriptNonceFromHeader(contentSecurityPolicy({ dev: false }))).toBeUndefined();
  });
});
