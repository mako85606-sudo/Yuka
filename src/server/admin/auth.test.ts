import { describe, expect, it } from "vitest";
import { createSessionToken, passwordMatches, verifySessionToken } from "./auth";

const PASSWORD = "un-mot-de-passe-assez-long";
const NOW = Date.parse("2026-10-13T10:00:00Z");

describe("session /admin", () => {
  it("reconnaît une session signée avec le bon mot de passe, tant qu'elle n'a pas expiré", () => {
    const { token, expiresAt } = createSessionToken(PASSWORD, NOW);
    expect(expiresAt - NOW).toBe(12 * 60 * 60 * 1000);
    expect(verifySessionToken(token, PASSWORD, NOW + 1000)).toBe(true);
    expect(verifySessionToken(token, PASSWORD, expiresAt + 1)).toBe(false);
  });

  it("refuse une session falsifiée, prolongée ou signée avec un autre mot de passe", () => {
    const { token, expiresAt } = createSessionToken(PASSWORD, NOW);
    const [, mac] = token.split(".");
    expect(verifySessionToken(`${expiresAt + 3_600_000}.${mac}`, PASSWORD, NOW)).toBe(false);
    expect(verifySessionToken(token, "un-autre-mot-de-passe-long", NOW)).toBe(false);
    expect(verifySessionToken("n'importe quoi", PASSWORD, NOW)).toBe(false);
    expect(verifySessionToken(undefined, PASSWORD, NOW)).toBe(false);
  });

  it("compare les mots de passe exactement", () => {
    expect(passwordMatches(PASSWORD, PASSWORD)).toBe(true);
    expect(passwordMatches(`${PASSWORD} `, PASSWORD)).toBe(false);
    expect(passwordMatches("", PASSWORD)).toBe(false);
  });
});
