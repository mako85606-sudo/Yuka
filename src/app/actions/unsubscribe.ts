"use server";

import { headers } from "next/headers";
import { limits } from "@/config/limits";
import { clientIp } from "@/lib/client-ip";
import { parseSignupForm, type SignupState } from "@/lib/signup";
import { fr } from "@/lib/typography";
import { takeNamedQuota } from "@/server/rate-limit";
import { removeSignup } from "@/server/signups";

/** La même réponse, que l'adresse ait été inscrite ou non : personne ne peut tester une adresse. */
const DONE = fr("C'est fait : si cette adresse était inscrite, elle ne l'est plus. Vous ne recevrez plus nos nouvelles.");
const LATER = fr(
  "Votre demande n'a pas pu être traitée pour le moment. Réessayez demain, ou écrivez-nous : nous retirerons votre adresse.",
);

/** Désinscription des nouvelles de Loupe (`/desinscription`, lien de chaque email). */
export async function unsubscribeFromNews(_previous: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = parseSignupForm(formData);
  if (parsed.kind === "bot") return { status: "success", message: DONE };
  if (parsed.kind === "invalid") return { status: "invalid", message: parsed.message, email: parsed.email };
  // Même plafond que l'inscription, sur un compteur à part. Sans compteur (pas
  // de base ni de secret), on retire quand même : retirer n'écrit rien, et
  // sans base il n'y a rien à retirer.
  const quota = await takeNamedQuota("unsubscribe", clientIp(await headers()), limits.signupsPerDay);
  if (quota === "refused") return { status: "unavailable", message: LATER };
  const removed = await removeSignup(parsed.email);
  return removed.ok ? { status: "success", message: DONE } : { status: "unavailable", message: LATER };
}
