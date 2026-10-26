"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp } from "@/lib/client-ip";
import { fr } from "@/lib/typography";
import {
  ADMIN_COOKIE,
  ADMIN_PATH,
  adminPassword,
  createSessionToken,
  passwordMatches,
} from "@/server/admin/auth";
import { consumeAdminAttempt, consumeGlobalAdminAttempt, refundAdminAttempts } from "@/server/rate-limit";

export interface AdminSignInState {
  readonly message: string | null;
}

/** Un mauvais mot de passe coûte une seconde : de quoi décourager les essais en rafale. */
const FAILURE_DELAY_MS = 1_000;

export async function signInAdmin(_previous: AdminSignInState, formData: FormData): Promise<AdminSignInState> {
  const password = adminPassword();
  if (!password) return { message: fr("L'administration est fermée : ADMIN_PASSWORD n'est pas défini.") };

  const ip = clientIp(await headers());
  if (!(await consumeAdminAttempt(ip)) || !(await consumeGlobalAdminAttempt())) {
    return { message: fr("Trop d'essais aujourd'hui. Réessayez demain.") };
  }
  const candidate = formData.get("password");
  if (typeof candidate !== "string" || !passwordMatches(candidate, password)) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return { message: "Mot de passe incorrect." };
  }
  // Seuls les échecs comptent.
  await refundAdminAttempts(ip);

  const { token, expiresAt } = createSessionToken(password);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: ADMIN_PATH,
    expires: new Date(expiresAt),
  });
  redirect(ADMIN_PATH);
}

export async function signOutAdmin(): Promise<void> {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: ADMIN_PATH });
  redirect(ADMIN_PATH);
}
