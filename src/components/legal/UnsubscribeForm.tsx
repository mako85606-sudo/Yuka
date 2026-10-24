"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { unsubscribeFromNews } from "@/app/actions/unsubscribe";
import { Button } from "@/components/ui/Button";
import { AlertGlyph, CheckGlyph } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { emailProblem, HONEYPOT_FIELD, type SignupState } from "@/lib/signup-form";
import { fr } from "@/lib/typography";

const INITIAL_STATE: SignupState = { status: "idle" };
const SEND_FAILED = fr("L'envoi n'a pas abouti. Vérifiez votre connexion, puis réessayez.");

/** Comme l'inscription : une faute évidente s'arrête dans le navigateur, un échec réseau devient un message. */
async function unsubscribeSafely(previous: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email");
  const value = typeof email === "string" ? email : "";
  const problem = emailProblem(value);
  if (problem) return { status: "invalid", message: problem, email: value.trim() };
  try {
    return await unsubscribeFromNews(previous, formData);
  } catch {
    return { status: "unavailable", message: SEND_FAILED };
  }
}

/** Retirer son adresse de la liste des nouvelles. La réponse ne dit jamais si elle y était. */
export function UnsubscribeForm() {
  const [state, formAction, pending] = useActionState(unsubscribeSafely, INITIAL_STATE);
  const [email, setEmail] = useState("");
  const [edited, setEdited] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const messageId = useId();

  useEffect(() => {
    if (state.status === "invalid") inputRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <p role="status" className="flex items-start gap-2.5 text-[1.0625rem] text-ink">
        <CheckGlyph className="mt-0.5 shrink-0 text-brand-strong" />
        {state.message}
      </p>
    );
  }

  const hasError = !edited && !pending && (state.status === "invalid" || state.status === "unavailable");
  const invalid = hasError && state.status === "invalid";

  return (
    <form action={formAction} onSubmit={() => setEdited(false)} noValidate className="relative">
      <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor={`${inputId}-piege`}>Ne pas remplir</label>
        <input id={`${inputId}-piege`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        L&apos;adresse à retirer
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          ref={inputRef}
          id={inputId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEdited(true);
          }}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={hasError ? messageId : undefined}
          placeholder="prenom@exemple.fr"
          className={cn(
            "h-12 w-full min-w-0 rounded-md border bg-paper-raised px-4 text-base text-ink placeholder:text-ink-muted sm:flex-1",
            invalid ? "border-pen-red-strong ring-1 ring-pen-red-strong" : "border-rule-strong",
          )}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Envoi…" : "Me désinscrire"}
        </Button>
      </div>
      <p
        id={messageId}
        aria-live="polite"
        className={cn(
          "mt-2 flex min-h-5 items-start gap-1.5 text-sm",
          invalid ? "font-medium text-pen-red-strong" : hasError ? "text-ink" : "text-ink-muted",
        )}
      >
        {invalid ? <AlertGlyph className="mt-px size-4 shrink-0 text-pen-red" /> : null}
        {hasError ? state.message : fr("Votre adresse est effacée de la liste, définitivement.")}
      </p>
    </form>
  );
}
