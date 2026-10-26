import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { postgresConnection } from "./connection";

const NEON =
  "postgresql://loupe_owner:s3cr%40t@ep-cool-name-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

describe("postgresConnection", () => {
  it("retire de l'adresse de Neon ce que postgres.js enverrait au serveur", () => {
    const { url, ssl } = postgresConnection(NEON);
    expect(url).toBe("postgresql://loupe_owner:s3cr%40t@ep-cool-name-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb");
    // Pas de liaison de canal possible avec postgres.js : le certificat est vérifié à la place.
    expect(ssl).toBe("verify-full");
    const sql = postgres(url, { ssl, prepare: false });
    expect(Object.keys(sql.options.connection)).toEqual(["application_name"]);
    expect(sql.options.pass).toBe("s3cr@t");
  });

  it("exige une connexion chiffrée vers une base distante", () => {
    expect(postgresConnection("postgres://u:p@ep-cool-name.eu-central-1.aws.neon.tech/neondb").ssl).toBe("require");
    expect(postgresConnection("postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres").ssl).toBe(
      "require",
    );
    expect(postgresConnection("pas une adresse")).toEqual({ url: "pas une adresse", ssl: "require" });
  });

  it("ne se laisse pas affaiblir par l'adresse vers une base distante", () => {
    expect(postgresConnection("postgres://u:p@db.exemple.fr/loupe?sslmode=disable")).toEqual({
      url: "postgres://u:p@db.exemple.fr/loupe",
      ssl: "require",
    });
    expect(postgresConnection("postgres://u:p@db.exemple.fr/loupe?sslmode=prefer").ssl).toBe("require");
  });

  it("vérifie le certificat quand l'adresse le demande", () => {
    expect(postgresConnection("postgres://u:p@db.exemple.fr/loupe?sslmode=verify-full").ssl).toBe("verify-full");
    expect(postgresConnection("postgres://u:p@db.exemple.fr/loupe?sslrootcert=system").ssl).toBe("verify-full");
  });

  it("garde les paramètres que Postgres connaît", () => {
    const { url } = postgresConnection("postgres://u:p@db.exemple.fr/loupe?application_name=loupe&options=endpoint%3Dep-x");
    expect(new URL(url).searchParams.get("application_name")).toBe("loupe");
    expect(new URL(url).searchParams.get("options")).toBe("endpoint=ep-x");
  });

  it("laisse une base locale sans chiffrement", () => {
    expect(postgresConnection("postgres://postgres:secret@localhost:5432/loupe").ssl).toBe(false);
    expect(postgresConnection("postgres://postgres:secret@127.0.0.1:5432/loupe?channel_binding=require")).toEqual({
      url: "postgres://postgres:secret@127.0.0.1:5432/loupe",
      ssl: false,
    });
  });
});
