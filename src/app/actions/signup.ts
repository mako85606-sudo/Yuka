"use server";

import { headers } from "next/headers";
import { limits } from "@/config/limits";
import { clientIp } from "@/lib/client-ip";
import { parseSignupForm, type SignupState } from "@/lib/signup";
import { fr } from "@/lib/typography";
import { consumeNamedQuota } from "@/server/rate-limit";
import { saveSignup } from "@/server/signups";

const SUCCESS = fr("C'est noté. Nous vous écrirons seulement quand il y aura vraiment du nouveau.");
const UNAVAILABLE = fr("L'inscription ouvre très bientôt. Revenez dans quelques jours.");
const FAILED = fr("Votre adresse n'a pas pu être enregistrée, le problème vient de chez nous. Réessayez dans un instant.");

/** Inscription aux nouvelles de Loupe (landing, rapport détaillé). */
export async function subscribeToNews(
  _previous: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = parseSignupForm(formData);
  // Un robot reçoit la même réponse qu'un humain, mais rien n'est enregistré.
  if (parsed.kind === "bot") return { status: "success", message: SUCCESS };
  if (parsed.kind === "invalid") {
    return { status: "invalid", message: parsed.message, email: parsed.email };
  }
  // Au-delà de `limits.signupsPerDay` inscriptions par jour depuis une même
  // adresse, même réponse, mais rien n'est enregistré : impossible d'inscrire
  // en masse les adresses d'autres personnes.
  if (!(await consumeNamedQuota("signup", clientIp(await headers()), limits.signupsPerDay))) {
    return { status: "success", message: SUCCESS };
  }
  const saved = await saveSignup({ email: parsed.email, source: parsed.source });
  if (saved.ok) return { status: "success", message: SUCCESS };
  return {
    status: "unavailable",
    message: saved.reason === "error" ? FAILED : UNAVAILABLE,
  };
}
