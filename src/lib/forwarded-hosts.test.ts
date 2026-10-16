import { describe, expect, it, vi } from "vitest";
import { codespaceHost, codespaceHosts, hostMatches, ownForwardedHosts } from "@/lib/forwarded-hosts";

const env = { CODESPACE_NAME: "octocat-loupe", GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev" };

describe("codespaceHost", () => {
  it("donne l'adresse publique du port dans un codespace", () => {
    expect(codespaceHost(env)).toBe("octocat-loupe-3000.app.github.dev");
    expect(codespaceHost({ ...env, PORT: "3001" })).toBe("octocat-loupe-3001.app.github.dev");
  });

  it("vaut null hors Codespaces", () => {
    expect(codespaceHost({})).toBeNull();
    expect(codespaceHost({ CODESPACE_NAME: "octocat-loupe" })).toBeNull();
    expect(codespaceHost({ CODESPACE_NAME: " ", GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev" })).toBeNull();
  });
});

describe("codespaceHosts", () => {
  it("n'accepte en production que l'adresse exacte, jamais un motif", () => {
    expect(codespaceHosts({}, "production")).toEqual([]);
    expect(codespaceHosts(env, "production")).toEqual(["octocat-loupe-3000.app.github.dev"]);
  });

  it("accepte en développement toute adresse de codespace, même sans ses variables", () => {
    expect(codespaceHosts({}, "development")).toEqual(["*.app.github.dev"]);
    expect(codespaceHosts(env, "development")).toEqual(["octocat-loupe-3000.app.github.dev", "*.app.github.dev"]);
  });
});

describe("ownForwardedHosts", () => {
  it("n'ajoute aucune adresse locale en production", () => {
    expect(ownForwardedHosts({}, "production")).toEqual([]);
    expect(ownForwardedHosts(env, "production")).toEqual(["octocat-loupe-3000.app.github.dev"]);
    expect(ownForwardedHosts({}, "test")).toEqual([]);
  });

  it("accepte en développement l'origine locale que le relais de Codespaces met dans `Origin`", () => {
    const hosts = ownForwardedHosts(env, "development");
    expect(hosts.slice(0, 4)).toEqual([
      "octocat-loupe-3000.app.github.dev",
      "*.app.github.dev",
      "localhost:3000",
      "127.0.0.1:3000",
    ]);
    // Un second `next dev` dans le même codespace écoute sur le port suivant.
    expect(hosts).toContain("localhost:3001");
    expect(hosts).toContain("localhost:3010");
    expect(hosts).not.toContain("localhost:3011");
    expect(ownForwardedHosts({ PORT: "4000" }, "development")).toContain("localhost:4000");
  });
});

describe("hostMatches", () => {
  it("compare un hôte exact, ou un seul niveau sous un motif en `*.`", () => {
    expect(hostMatches("loupe.fr", "loupe.fr")).toBe(true);
    expect(hostMatches("localhost:3000", "localhost:3000")).toBe(true);
    expect(hostMatches("octocat-loupe-3001.app.github.dev", "*.app.github.dev")).toBe(true);
    expect(hostMatches("Octocat-Loupe-3000.App.GitHub.dev", "*.app.github.dev")).toBe(true);
  });

  it("refuse le domaine nu, deux niveaux, ou un domaine qui l'imite", () => {
    expect(hostMatches("app.github.dev", "*.app.github.dev")).toBe(false);
    expect(hostMatches("a.b.app.github.dev", "*.app.github.dev")).toBe(false);
    expect(hostMatches("evilapp.github.dev", "*.app.github.dev")).toBe(false);
    expect(hostMatches("app.github.dev.evil.fr", "*.app.github.dev")).toBe(false);
    expect(hostMatches("localhost:3001", "localhost:3000")).toBe(false);
  });
});

describe("next.config.ts", () => {
  async function loadConfig(nodeEnv: string) {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("CODESPACE_NAME", "");
    vi.stubEnv("PORT", "");
    try {
      return (await import("../../next.config")).default;
    } finally {
      vi.unstubAllEnvs();
    }
  }

  it("permet en développement les Server Actions venues d'un codespace, même réécrites en localhost", async () => {
    const config = await loadConfig("development");
    expect(config.experimental?.serverActions?.allowedOrigins).toEqual(
      expect.arrayContaining(["*.app.github.dev", "localhost:3000"]),
    );
    expect(config.allowedDevOrigins).toEqual(["*.app.github.dev"]);
  });

  it("ne permet rien de plus en production", async () => {
    const config = await loadConfig("production");
    expect(config.experimental?.serverActions?.allowedOrigins).toBeUndefined();
    expect(config.allowedDevOrigins).toBeUndefined();
  });
});
