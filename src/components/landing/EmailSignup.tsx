"use client";

import { useActionState, useId, useState } from "react";
import { subscribeToNews } from "@/app/actions/signup";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { HONEYPOT_FIELD, type SignupSource, type SignupState } from "@/lib/signup";
import { PenTick } from "./PenTick";

const INITIAL_STATE: SignupState = { status: "idle" };

interface EmailSignupProps {
  readonly source?: SignupSource;
  readonly className?: string;
}

/**
 * Inscription aux nouvelles. La validation se fait côté serveur (Zod) ; le
 * message d'erreur est relié au champ et annoncé aux lecteurs d'écran.
 */
export function EmailSignup({ source = "landing", className }: EmailSignupProps) {
  const [state, formAction, pending] = useActionState(subscribeToNews, INITIAL_STATE);
  const [email, setEmail] = useState("");
  const inputId = useId();
  const messageId = useId();

  if (state.status === "success") {
    return (
      <p role="status" className={cn("flex items-start gap-2.5 text-[1.0625rem]", className)}>
        <PenTick className="mt-1" />
        {state.message}
      </p>
    );
  }

  const hasError = state.status === "invalid" || state.status === "unavailable";

  return (
    <form action={formAction} noValidate className={cn("relative", className)}>
      <input type="hidden" name="source" value={source} />
      {/* Champ piège : invisible et hors du parcours clavier, seuls les robots le remplissent. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor={`${inputId}-piege`}>Ne pas remplir</label>
        <input id={`${inputId}-piege`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        Ton email
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={state.status === "invalid" ? true : undefined}
          aria-describedby={hasError ? messageId : undefined}
          placeholder="prenom@exemple.fr"
          className={cn(
            "h-12 min-w-0 flex-1 rounded-[6px] border bg-paper-raised px-4 text-base text-ink placeholder:text-ink-muted",
            state.status === "invalid" ? "border-pen-red-strong" : "border-rule-strong",
          )}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Envoi…" : "Me prévenir"}
        </Button>
      </div>
      <p
        id={messageId}
        aria-live="polite"
        className={cn(
          "mt-2 min-h-5 text-sm",
          state.status === "invalid" ? "text-pen-red-strong" : "text-ink-muted",
        )}
      >
        {hasError ? state.message : "Un email quand il y a du nouveau. Pas de pub, désinscription en un clic."}
      </p>
    </form>
  );
}
