import { describe, expect, it } from "vitest";
import type { ServerEnv } from "@/server/env";
import { missingLegalFields, setupChecklist } from "./setup";

function state(env: ServerEnv, id: string) {
  return setupChecklist(env).find((item) => item.id === id)?.state;
}

describe("setupChecklist", () => {
  it("signale ce qui manque pour ouvrir l'analyse en ligne", () => {
    const empty: ServerEnv = {};
    expect(state(empty, "anthropic")).toBe("missing");
    expect(state(empty, "database")).toBe("missing");
    expect(state(empty, "ip-secret")).toBe("missing");
    expect(state(empty, "cron")).toBe("missing");
    expect(state(empty, "posthog")).toBe("optional");
  });

  it("ne montre jamais la valeur d'un secret", () => {
    const env: ServerEnv = {
      ANTHROPIC_API_KEY: "sk-ant-secret-de-test",
      DATABASE_URL: "postgres://u:motdepasse@db.exemple.fr/loupe",
      IP_HASH_SECRET: "x".repeat(40),
      CRON_SECRET: "c".repeat(20),
      ADMIN_PASSWORD: "a".repeat(20),
      POSTHOG_KEY: "phc_secret",
    };
    const text = JSON.stringify(setupChecklist(env));
    for (const secret of ["sk-ant-secret-de-test", "motdepasse", "x".repeat(40), "c".repeat(20), "a".repeat(20), "phc_secret"]) {
      expect(text).not.toContain(secret);
    }
    expect(state(env, "anthropic")).toBe("ok");
    expect(state(env, "database")).toBe("ok");
  });

  it("prévient d'un modèle qui garde ce qu'il lit, ou sans tarif connu", () => {
    expect(state({ ANTHROPIC_MODEL: "claude-fable-5-1" }, "model")).toBe("warning");
    expect(state({ ANTHROPIC_MODEL: "claude-inconnu-9" }, "model")).toBe("warning");
    expect(state({}, "model")).toBe("ok");
  });

  it("demande l'adresse du site en ligne hors de Vercel", () => {
    expect(setupChecklist({}, "production").find((item) => item.id === "site-url")?.state).toBe("warning");
    expect(setupChecklist({ VERCEL_PROJECT_PRODUCTION_URL: "loupe.vercel.app" }, "production").find((item) => item.id === "site-url")?.state).toBe("ok");
    expect(setupChecklist({}, "development").find((item) => item.id === "site-url")?.state).toBe("optional");
  });

  it("compte les informations légales encore à compléter", () => {
    expect(missingLegalFields()).toBeGreaterThan(0);
    expect(state({}, "legal")).toBe("warning");
  });
});
