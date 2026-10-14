/**
 * Ce que le formulaire d'inscription partage avec le serveur, sans Zod : le
 * navigateur n'a pas à télécharger la bibliothèque de validation (la
 * validation se fait côté serveur, `src/lib/signup.ts`).
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
