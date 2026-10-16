import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, maskEmail, parseSignupForm } from "@/lib/signup";
import { EMAIL_INVALID, EMAIL_MISSING, emailProblem } from "@/lib/signup-form";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("parseSignupForm", () => {
  it("accepte une adresse valide, nettoyée", () => {
    expect(parseSignupForm(form({ email: "  Camille@Exemple.FR ", source: "landing" }))).toEqual({
      kind: "valid",
      email: "camille@exemple.fr",
      source: "landing",
    });
  });

  it("garde la source du rapport détaillé", () => {
    const parsed = parseSignupForm(form({ email: "a@b.fr", source: "detailed_report" }));
    expect(parsed).toMatchObject({ kind: "valid", source: "detailed_report" });
  });

  it("retombe sur la landing pour une source inconnue", () => {
    const parsed = parseSignupForm(form({ email: "a@b.fr", source: "pirate" }));
    expect(parsed).toMatchObject({ kind: "valid", source: "landing" });
  });

  it("refuse une adresse sans @, avec un message clair et l'adresse tapée", () => {
    const parsed = parseSignupForm(form({ email: "camille.exemple.fr" }));
    expect(parsed.kind).toBe("invalid");
    if (parsed.kind !== "invalid") return;
    expect(parsed.message).toContain("@");
    expect(parsed.email).toBe("camille.exemple.fr");
  });

  it("refuse une adresse vide ou trop longue", () => {
    expect(parseSignupForm(form({ email: "" }))).toEqual({ kind: "invalid", message: EMAIL_MISSING, email: "" });
    expect(parseSignupForm(form({ email: "   " }))).toMatchObject({ kind: "invalid", message: EMAIL_MISSING });
    expect(parseSignupForm(form({ email: `${"a".repeat(250)}@b.fr` })).kind).toBe("invalid");
  });

  it("repère les robots qui remplissent le champ piège", () => {
    expect(parseSignupForm(form({ email: "a@b.fr", [HONEYPOT_FIELD]: "https://spam" }))).toEqual({
      kind: "bot",
    });
  });
});

describe("emailProblem", () => {
  it("arrête dans le navigateur un champ vide, avec les mots du serveur", () => {
    expect(emailProblem("")).toBe(EMAIL_MISSING);
    expect(emailProblem("   ")).toBe(EMAIL_MISSING);
  });

  it("arrête une adresse sans @ ou sans domaine", () => {
    for (const email of ["camille", "camille.exemple.fr", "camille@", "camille@exemple", "@exemple.fr", "ca mille@exemple.fr"]) {
      expect(emailProblem(email), email).toBe(EMAIL_INVALID);
    }
  });

  it("laisse partir une adresse plausible : le serveur tranche", () => {
    expect(emailProblem(" camille@exemple.fr ")).toBeNull();
    expect(emailProblem("julien.roux@viacesi.fr")).toBeNull();
  });

  it("ne laisse jamais partir ce que le serveur refuserait pour vide ou sans @", () => {
    for (const email of ["", " ", "camille.exemple.fr"]) {
      expect(emailProblem(email)).not.toBeNull();
      expect(parseSignupForm(form({ email })).kind).toBe("invalid");
    }
  });
});

describe("maskEmail", () => {
  it("masque l'adresse pour les journaux", () => {
    expect(maskEmail("camille.dupont@exemple.fr")).toBe("c***@exemple.fr");
  });
});
