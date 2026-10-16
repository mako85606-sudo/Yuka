import { fr } from "@/lib/typography";

/**
 * Ce que le formulaire d'inscription partage avec le serveur, sans Zod : le
 * navigateur n'a pas à télécharger la bibliothèque de validation. Le serveur
 * reste seul juge (`src/lib/signup.ts`) ; le navigateur arrête seulement les
 * fautes évidentes, avec les mêmes mots, sans rien envoyer.
 */

export const SIGNUP_SOURCES = ["landing", "detailed_report"] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

/** Champ piège, invisible pour un humain : s'il est rempli, c'est un robot. */
export const HONEYPOT_FIELD = "site_web";

export type SignupState =
  | { readonly status: "idle" }
  | { readonly status: "success"; readonly message: string }
  | { readonly status: "invalid"; readonly message: string; readonly email: string }
  | { readonly status: "unavailable"; readonly message: string };

export const EMAIL_MISSING = fr("Indiquez votre adresse email.");
export const EMAIL_INVALID = fr(
  "Cette adresse ne ressemble pas à un email. Vérifiez qu'il y a bien un @ et un domaine.",
);

/**
 * La faute évidente d'une adresse saisie : vide, ou sans la forme
 * « nom@domaine.extension ». `null` si rien ne saute aux yeux (le serveur
 * vérifie ensuite pour de bon).
 */
export function emailProblem(email: string): string | null {
  const value = email.trim();
  if (value === "") return EMAIL_MISSING;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : EMAIL_INVALID;
}
