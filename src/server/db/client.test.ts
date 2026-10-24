import { describe, expect, it } from "vitest";
import { sslFor } from "@/server/db/client";

describe("sslFor", () => {
  it("exige une connexion chiffrée vers une base distante", () => {
    expect(sslFor("postgres://u:p@ep-cool-name.eu-central-1.aws.neon.tech/neondb")).toBe("require");
    expect(sslFor("postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres")).toBe("require");
    expect(sslFor("pas une adresse")).toBe("require");
  });

  it("laisse une base locale sans chiffrement", () => {
    expect(sslFor("postgres://postgres:secret@localhost:5432/loupe")).toBe(false);
    expect(sslFor("postgres://postgres:secret@127.0.0.1:5432/loupe")).toBe(false);
  });
});
