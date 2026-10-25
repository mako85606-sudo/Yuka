import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { sslOption } from "./ssl";

describe("sslOption", () => {
  it("exige une connexion chiffrée vers une base distante", () => {
    expect(sslOption("postgres://u:p@ep-cool-name.eu-central-1.aws.neon.tech/neondb")).toEqual({ ssl: "require" });
    expect(sslOption("postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres")).toEqual({
      ssl: "require",
    });
    expect(sslOption("pas une adresse")).toEqual({ ssl: "require" });
  });

  it("ne se laisse pas affaiblir par l'adresse vers une base distante", () => {
    expect(sslOption("postgres://u:p@db.exemple.fr/loupe?sslmode=disable")).toEqual({ ssl: "require" });
    expect(sslOption("postgres://u:p@db.exemple.fr/loupe?sslmode=prefer")).toEqual({ ssl: "require" });
  });

  it("garde la vérification du certificat demandée par l'adresse", () => {
    const url = "postgres://u:p@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full";
    expect(sslOption(url)).toEqual({});
    // postgres.js retient alors le mode de l'adresse, qui vérifie le certificat.
    const sql = postgres(url, { ...sslOption(url), prepare: false });
    expect(sql.options.ssl).toBe("verify-full");
    expect(sslOption("postgres://u:p@db.exemple.fr/loupe?sslrootcert=system")).toEqual({});
  });

  it("laisse une base locale sans chiffrement", () => {
    expect(sslOption("postgres://postgres:secret@localhost:5432/loupe")).toEqual({ ssl: false });
    expect(sslOption("postgres://postgres:secret@127.0.0.1:5432/loupe")).toEqual({ ssl: false });
  });
});
