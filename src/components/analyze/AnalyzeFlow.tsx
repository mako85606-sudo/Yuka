"use client";

import { useEffect, useId, useReducer, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { limits } from "@/config/limits";
import { site } from "@/config/site";
import { streamAnalysis } from "@/lib/analysis/client";
import type { AnalysisErrorCode } from "@/lib/analysis/events";
import { INITIAL_LIVE_STATE, isRunning, liveReducer } from "@/lib/analysis/live-state";
import { ERROR_MESSAGES } from "@/lib/analysis/messages";
import { cn } from "@/lib/cn";
import type { ServerStep } from "@/lib/phases";
import { fr } from "@/lib/typography";
import { AnalysisOutcome } from "./AnalysisOutcome";
import { LiveSheet } from "./LiveSheet";
import { PagePicker } from "./PagePicker";
import { StepTracker } from "./StepTracker";
import { usePages } from "./use-pages";

/** Étapes que cette version du serveur sait faire. */
const AVAILABLE_STEPS: readonly ServerStep[] = ["received", "reading"];

/** Refus « de formulaire » renvoyés par le serveur : on revient au formulaire pour corriger. */
const FORM_ERRORS: readonly AnalysisErrorCode[] = [
  "invalid-request",
  "consent-required",
  "no-file",
  "too-many-files",
  "unsupported-file",
  "too-large",
];

type FormError = { readonly field: "pages" | "consent"; readonly message: string };

const STILL_PREPARING = fr("Encore un instant : les photos se préparent.");
const REMOVE_BROKEN = fr("Retire la page marquée en rouge avant d'envoyer.");

/**
 * Le parcours d'une analyse : choisir les pages, accepter, envoyer, puis
 * suivre la lecture en direct. Tout ce qui s'affiche pendant l'analyse
 * vient d'un événement réel du serveur.
 */
export function AnalyzeFlow() {
  const { pages, notice, add, remove, clear } = usePages();
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [state, dispatch] = useReducer(liveReducer, INITIAL_LIVE_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const pagesNoticeId = useId();
  const consentId = useId();
  const consentErrorId = useId();
  const running = isRunning(state);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Le focus suit le parcours : vue d'analyse à l'envoi, conclusion à la fin.
  useEffect(() => {
    if (state.status === "sending") viewHeading.current?.focus();
    if (state.status === "extracted" || state.status === "refused" || state.status === "error") {
      outcomeHeading.current?.focus();
    }
  }, [state.status]);

  const run = async (files: readonly File[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "send" });
    for await (const event of streamAnalysis(files, controller.signal)) {
      if (controller.signal.aborted) return;
      if (event.type === "error" && FORM_ERRORS.includes(event.code)) {
        dispatch({ type: "reset" });
        setFormError({
          field: event.code === "consent-required" ? "consent" : "pages",
          message: event.message,
        });
        return;
      }
      dispatch(event);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const totalBytes = pages.reduce((sum, page) => sum + page.file.size, 0);
    let error: FormError | null = null;
    if (pages.length === 0) error = { field: "pages", message: ERROR_MESSAGES["no-file"] };
    else if (pages.some((page) => page.status === "preparing")) error = { field: "pages", message: STILL_PREPARING };
    else if (pages.some((page) => page.status === "error")) error = { field: "pages", message: REMOVE_BROKEN };
    else if (totalBytes > limits.maxUploadBytes) error = { field: "pages", message: ERROR_MESSAGES["too-large"] };
    else if (!consent) error = { field: "consent", message: ERROR_MESSAGES["consent-required"] };
    setFormError(error);
    if (!error) void run(pages.map((page) => page.file));
  };

  const cancel = () => {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
  };

  const restart = () => {
    abortRef.current?.abort();
    clear();
    setFormError(null);
    dispatch({ type: "reset" });
  };

  const retry = () => {
    void run(pages.map((page) => page.file));
  };

  if (state.status === "idle") {
    return (
      <form onSubmit={submit} noValidate>
        <h1 className="font-display text-title text-ink sm:text-[3rem] sm:leading-[1.05]">
          Montre-nous ce devis.
        </h1>
        <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
          {fr(
            "Une photo par page, bien à plat, ou le PDF. On le lit, on le corrige, et on ne garde rien de personnel.",
          )}
        </p>

        <fieldset className="mt-8">
          <legend className="sr-only">Pages du devis</legend>
          <PagePicker
            pages={pages}
            notice={formError?.field === "pages" ? formError.message : notice}
            onAdd={(files) => {
              setFormError(null);
              add(files);
            }}
            onRemove={remove}
            noticeId={pagesNoticeId}
          />
        </fieldset>

        <div className="mt-6 border-t border-rule pt-6">
          <div className="flex items-start gap-3">
            <input
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (formError?.field === "consent") setFormError(null);
              }}
              aria-invalid={formError?.field === "consent" ? true : undefined}
              aria-describedby={consentErrorId}
              className="mt-1 size-5 shrink-0 accent-ink"
            />
            <label htmlFor={consentId} className="text-[0.95rem] leading-relaxed text-ink">
              {fr(
                "J'accepte que Loupe fasse lire mon devis par son prestataire d'intelligence artificielle (Anthropic). Loupe ne garde jamais l'original : seulement des lignes de prix anonymes, la catégorie et le département.",
              )}
            </label>
          </div>
          <details className="ml-8 mt-3 text-sm text-ink-muted">
            <summary className="w-fit cursor-pointer text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
              {fr("Ce qu'on garde, ce qu'on jette")}
            </summary>
            <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                {fr(
                  "Jeté après la lecture : la photo ou le PDF, et tout ce qui est personnel (noms, adresses, téléphones, numéros).",
                )}
              </li>
              <li>
                {fr(
                  "Gardé pour comparer les prix : des lignes anonymes (« chauffe-eau 200 L, 890 € HT »), la catégorie et le département.",
                )}
              </li>
              <li>
                {fr(
                  `Ton adresse IP n'est jamais enregistrée : seulement une empreinte chiffrée, qui change chaque jour et s'efface au bout de quelques jours. Elle sert à limiter les analyses à ${limits.analysesPerDay} par jour.`,
                )}
              </li>
            </ul>
          </details>
          <p
            id={consentErrorId}
            aria-live="polite"
            className={cn("ml-8 mt-2 min-h-5 text-sm", formError?.field === "consent" && "text-pen-red-strong")}
          >
            {formError?.field === "consent" ? formError.message : null}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button type="submit" size="xl" className="w-full sm:w-auto">
            Corriger mon devis
          </Button>
          <p className="text-sm text-ink-muted">{fr("Moins de 30 secondes, en général.")}</p>
        </div>
        <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
      </form>
    );
  }

  const showSheet = state.status !== "refused" && state.status !== "error";

  return (
    <section aria-labelledby="titre-analyse">
      <div className="flex items-start justify-between gap-4">
        <h1
          id="titre-analyse"
          ref={viewHeading}
          tabIndex={-1}
          className="font-display text-title text-ink outline-none"
        >
          {running ? "Lecture en cours…" : "Ton devis"}
        </h1>
        {running ? (
          <Button variant="quiet" onClick={cancel} className="mt-2 shrink-0">
            Annuler
          </Button>
        ) : null}
      </div>
      {/* Refus avant toute étape (limite du jour, service fermé) : rien à suivre. */}
      {running || state.step !== "idle" ? (
        <StepTracker
          step={state.step}
          running={running}
          failed={state.status === "error"}
          available={AVAILABLE_STEPS}
          className="mt-5"
        />
      ) : null}
      {/* Une annonce par étape, pas par ligne : les lignes se lisent sur la feuille. */}
      <p role="status" className="sr-only">
        {running ? (state.step === "reading" ? "Lecture du devis en cours." : "Envoi du devis.") : null}
      </p>

      <div className="mt-8 space-y-8">
        {!running ? (
          <AnalysisOutcome
            state={state}
            headingRef={outcomeHeading}
            onRestart={restart}
            onRetry={retry}
          />
        ) : null}
        {showSheet ? <LiveSheet state={state} /> : null}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
    </section>
  );
}
