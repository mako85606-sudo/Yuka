"use client";

import { useActionState, useId } from "react";
import { signInAdmin, type AdminSignInState } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";

const INITIAL: AdminSignInState = { message: null };

/** Connexion à `/admin` : un mot de passe, vérifié par une Server Action. */
export function AdminLogin() {
  const [state, action, pending] = useActionState(signInAdmin, INITIAL);
  const fieldId = useId();
  const messageId = useId();

  return (
    <form action={action} className="max-w-sm">
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        Mot de passe
      </label>
      <input
        id={fieldId}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        aria-invalid={state.message ? true : undefined}
        aria-describedby={messageId}
        className="mt-2 h-12 w-full rounded-[6px] border border-rule-strong bg-paper-raised px-4 text-base text-ink"
      />
      <p id={messageId} aria-live="polite" className="mt-2 min-h-5 text-sm text-pen-red-strong">
        {state.message}
      </p>
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Vérification…" : "Entrer"}
      </Button>
    </form>
  );
}
