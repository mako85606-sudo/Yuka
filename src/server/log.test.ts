import { describe, expect, it } from "vitest";
import { errorSummary } from "@/server/log";

describe("errorSummary", () => {
  it("garde le nom et les codes de l'erreur et de ses causes", () => {
    const cause = Object.assign(new Error("terminating connection"), { name: "PostgresError", code: "57P01" });
    const error = new Error("Failed query: insert into signups … params: camille.dupont@exemple.fr,landing", { cause });
    error.name = "DrizzleQueryError";
    expect(errorSummary(error)).toBe("DrizzleQueryError · PostgresError · 57P01");
  });

  it("ne recopie jamais le message ni les paramètres d'une requête", () => {
    const error = new Error("Failed query: select … params: camille.dupont@exemple.fr,abc123privé");
    const summary = errorSummary(error);
    expect(summary).not.toContain("camille");
    expect(summary).not.toContain("abc123");
    expect(summary).toBe("Error");
  });

  it("résume aussi une erreur d'API et une valeur inconnue", () => {
    expect(errorSummary(Object.assign(new Error("x"), { name: "APIError", status: 529 }))).toBe("APIError · 529");
    expect(errorSummary("chaîne")).toBe("erreur inconnue");
    expect(errorSummary(null)).toBe("erreur inconnue");
  });
});
