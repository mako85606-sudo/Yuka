import { describe, expect, it } from "vitest";
import { legal } from "@/config/legal";
import { limits } from "@/config/limits";
import { ADMIN_COOKIE } from "@/server/admin/auth";

describe("informations légales", () => {
  it("nomme le vrai cookie de l'administration", () => {
    expect(legal.adminCookie).toBe(ADMIN_COOKIE);
  });

  it("tire les durées affichées de la configuration", () => {
    expect(legal.retention.analysisDays).toBe(limits.analysisRetentionDays);
    expect(legal.retention.signupYears).toBe(limits.signupRetentionYears);
    expect(legal.retention.adminSessionHours).toBe(limits.adminSessionHours);
  });

  it("n'invente aucune identité d'éditeur", () => {
    // Tant que l'éditeur n'a rien fourni, chaque champ reste vide (« à compléter »).
    for (const value of Object.values(legal.publisher)) expect(value === null || value.trim() !== "").toBe(true);
  });

  it("donne une base légale à chaque traitement", () => {
    const ids = legal.processing.map((activity) => activity.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const activity of legal.processing) expect(activity.basis).toMatch(/art\. \d/);
  });
});
