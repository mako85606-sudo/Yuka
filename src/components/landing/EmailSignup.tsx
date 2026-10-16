"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { subscribeToNews } from "@/app/actions/signup";
import { Button } from "@/components/ui/Button";
import { CheckGlyph } from "@/components/ui/icons";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { emailProblem, HONEYPOT_FIELD, type SignupSource, type SignupState } from "@/lib/signup-form";
import { fr } from "@/lib/typography";

const INITIAL_STATE: SignupState = { status: "idle" };

const SEND_FAILED = fr("L'envoi n'a pas abouti. Vérifiez votre connexion, puis réessayez.");

/**
 * L'inscription, sans jamais faire tomber la page. Un champ vide ou une
 * adresse sans @ s'arrête dans le navigateur, avec les mots du serveur, sans
 * rien envoyer. Si la requête échoue (réseau coupé, serveur injoignable), un
 * message s'affiche sous le champ au lieu de la page d'erreur.
 */
async function subscribeSafely(previous: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email");
  const problem = emailProblem(typeof email === "string" ? email : "");
  if (problem) return { status: "invalid", message: problem, email: typeof email === "string" ? email.trim() : "" };
  try {
    return await subscribeToNews(previous, formData);
  } catch {
    return { status: "unavailable", message: SEND_FAILED };
  }
}

interface EmailSignupProps {
  readonly source?: SignupSource;
  readonly className?: string;
}

/**
 * Inscription aux nouvelles. La validation se fait côté serveur (Zod) ; le
 * message d'erreur est relié au champ et annoncé aux lecteurs d'écran. Dès
 * que l'adresse est retouchée, le message d'erreur s'efface.
 */
export function EmailSignup({ source = "landing", className }: EmailSignupProps) {
  const [state, formAction, pending] = useActionState(subscribeSafely, INITIAL_STATE);
  const [email, setEmail] = useState("");
  // Vrai quand l'adresse a changé depuis la dernière réponse : son message d'erreur ne vaut plus.
  const [edited, setEdited] = useState(false);
  const inputId = useId();
  const messageId = useId();

  useEffect(() => {
    if (state.status === "success") track("email_submitted", { source });
  }, [state.status, source]);

  if (state.status === "success") {
    return (
      <p role="status" className={cn("flex items-start gap-2.5 text-[1.0625rem]", className)}>
        <CheckGlyph className="mt-0.5 text-brand-strong" />
        {state.message}
      </p>
    );
  }

  const hasError = !edited && !pending && (state.status === "invalid" || state.status === "unavailable");
  const invalid = hasError && state.status === "invalid";

  return (
    <form action={formAction} onSubmit={() => setEdited(false)} noValidate className={cn("relative", className)}>
      <input type="hidden" name="source" value={source} />
      {/* Champ piège : invisible et hors du parcours clavier, seuls les robots le remplissent. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor={`${inputId}-piege`}>Ne pas remplir</label>
        <input id={`${inputId}-piege`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor={inputId} className="block text-sm font-medium text-ink">
        Votre email
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
          onChange={(event) => {
            setEmail(event.target.value);
            setEdited(true);
          }}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={hasError ? messageId : undefined}
          placeholder="prenom@exemple.fr"
          className={cn(
            "h-12 w-full min-w-0 rounded-md border bg-paper-raised px-4 text-base text-ink placeholder:text-ink-muted sm:flex-1",
            invalid ? "border-pen-red-strong" : "border-rule-strong",
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
          invalid ? "text-pen-red-strong" : "text-ink-muted",
        )}
      >
        {hasError
          ? state.message
          : "Votre adresse ne sert qu'à cela. Vous pouvez vous désinscrire à tout moment."}
      </p>
    </form>
  );
}
