import { z } from "zod";
import { EMAIL_INVALID, EMAIL_MISSING, HONEYPOT_FIELD, SIGNUP_SOURCES, type SignupSource } from "@/lib/signup-form";

/**
 * Inscription email : d'où elle vient, et la validation des données reçues.
 * Le formulaire envoie aussi un champ piège (`site_web`), invisible pour un
 * humain : s'il est rempli, c'est un robot.
 */

export { HONEYPOT_FIELD, SIGNUP_SOURCES, type SignupSource, type SignupState } from "@/lib/signup-form";

export const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: EMAIL_MISSING })
    .max(254, { error: "Cette adresse est trop longue." })
    .pipe(z.email({ error: EMAIL_INVALID })),
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
      message: result.error.issues[0]?.message ?? EMAIL_INVALID,
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
