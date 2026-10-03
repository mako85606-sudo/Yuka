import { z } from "zod";
import { fr } from "@/lib/typography";

/**
 * Inscription email : d'où elle vient, et la validation des données reçues.
 * Le formulaire envoie aussi un champ piège (`site_web`), invisible pour un
 * humain : s'il est rempli, c'est un robot.
 */

export const SIGNUP_SOURCES = ["landing", "detailed_report"] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

export const HONEYPOT_FIELD = "site_web";

const INVALID_EMAIL = fr(
  "Cette adresse ne ressemble pas à un email. Vérifie qu'il y a bien un @ et un domaine.",
);

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, { error: "Cette adresse est trop longue." })
    .pipe(z.email({ error: INVALID_EMAIL })),
  source: z.enum(SIGNUP_SOURCES).catch("landing"),
});

export type ParsedSignup =
  | { readonly kind: "bot" }
  | { readonly kind: "invalid"; readonly message: string; readonly email: string }
  | { readonly kind: "valid"; readonly email: string; readonly source: SignupSource };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function parseSignupForm(formData: FormData): ParsedSignup {
  if (field(formData, HONEYPOT_FIELD).trim() !== "") return { kind: "bot" };
  const email = field(formData, "email");
  const result = signupSchema.safeParse({ email, source: field(formData, "source") });
  if (!result.success) {
    return {
      kind: "invalid",
      message: result.error.issues[0]?.message ?? INVALID_EMAIL,
      email: email.trim(),
    };
  }
  return { kind: "valid", email: result.data.email, source: result.data.source };
}

/** « camille.dupont@exemple.fr » → « c***@exemple.fr », pour les journaux. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export type SignupState =
  | { readonly status: "idle" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "invalid"; readonly message: string; readonly email: string }
  | { readonly status: "unavailable"; readonly message: string };
