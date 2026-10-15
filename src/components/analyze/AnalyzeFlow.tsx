"use client";

import Link from "next/link";
import { useEffect, useId, useReducer, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CheckGlyph, LockGlyph } from "@/components/ui/icons";
import { limits } from "@/config/limits";
import { site } from "@/config/site";
import { track } from "@/lib/analytics";
import { streamAnalysis } from "@/lib/analysis/client";
import type { AnalysisErrorCode, AnalyzeEvent } from "@/lib/analysis/events";
import { INITIAL_LIVE_STATE, isRunning, liveReducer } from "@/lib/analysis/live-state";
import { ERROR_MESSAGES } from "@/lib/analysis/messages";
import { cn } from "@/lib/cn";
import type { ScenePhase } from "@/lib/phases";
import { fr } from "@/lib/typography";
import { AnalysisOutcome } from "./AnalysisOutcome";
import { AnalysisView } from "./AnalysisView";
import { PagePicker } from "./PagePicker";
import { StepTracker } from "./StepTracker";
import { usePages } from "./use-pages";

/** Titre et annonce (lecteurs d'écran) de chaque étape réelle du serveur. */
const STEP_TEXT: Partial<Record<ScenePhase, { readonly title: string; readonly status: string }>> = {
  received: { title: "Envoi du devis…", status: "Envoi du devis." },
  reading: { title: "Lecture ligne par ligne…", status: "Lecture du devis en cours." },
  checking: { title: "Vérification des calculs…", status: "Vérification des calculs et des mentions." },
  pricing: { title: "Comparaison des prix…", status: "Comparaison des prix." },
  verdict: { title: "Verdict…", status: "Verdict en cours." },
};

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

const STILL_PREPARING = fr("Un instant : vos photos sont en cours de préparation.");
const BLURRY_CONFIRM = fr(
  "Cette photo semble floue. Si possible, reprenez-la à plat, avec plus de lumière. Sinon, appuyez une deuxième fois sur « Analyser mon devis » : nous ferons au mieux.",
);
const REMOVE_BROKEN = fr("Retirez la page signalée en rouge avant d'envoyer.");

/**
 * Mesure du parcours : envoi, réception, fin ou échec (avec l'étape atteinte).
 * Seulement des catégories et des codes, jamais le contenu du devis.
 */
function measurer(files: readonly File[]): (event: AnalyzeEvent) => void {
  const kind = files.some((file) => file.type === "application/pdf") ? "pdf" : "photo";
  track("upload_started", { pages: Math.min(files.length, 10), kind });
  let step: ScenePhase = "idle";
  let category: Extract<AnalyzeEvent, { type: "extracted" }>["extraction"]["category"] | null = null;
  return (event) => {
    if (event.type === "step") {
      step = event.step;
      if (event.step === "received") track("upload_completed");
    } else if (event.type === "extracted") {
      category = event.extraction.category;
    } else if (event.type === "verdict" && category) {
      track("analysis_completed", { category, verdict: event.result.verdict, saved: event.analysisId !== null });
    } else if (event.type === "refused") {
      track("analysis_failed", { step, code: event.reason });
    } else if (event.type === "error" && !FORM_ERRORS.includes(event.code)) {
      track("analysis_failed", { step, code: event.code });
    }
  };
}

/** Adresse de la page d'analyse, et de celle d'une analyse enregistrée. */
const ANALYZE_PATH = "/analyse";

/**
 * Le parcours d'une analyse : choisir les pages, accepter, envoyer, puis
 * suivre la correction en direct. Tout ce qui s'affiche pendant l'analyse
 * vient d'un événement réel du serveur. Une fois l'analyse enregistrée,
 * l'adresse devient celle de l'analyse (`/analyse/[id]`), sans recharger.
 */
export function AnalyzeFlow() {
  const { pages, notice, add, remove, clear } = usePages();
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<FormError | null>(null);
  // Le visiteur a vu l'avertissement de flou pour ces pages-là : le second envoi passe.
  const [blurAcknowledged, setBlurAcknowledged] = useState<string | null>(null);
  const [state, dispatch] = useReducer(liveReducer, INITIAL_LIVE_STATE);
  // Une feuille neuve à chaque envoi (nouvelle chorégraphie, nouveau tracé de tampon).
  const [runId, setRunId] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const pagesNoticeId = useId();
  const consentId = useId();
  const consentErrorId = useId();
  const running = isRunning(state);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Le focus suit le parcours : vue d'analyse à l'envoi, conclusion d'un refus ou d'un échec.
  // Le verdict, lui, prend le focus quand la correction a fini de s'afficher (`onShown`).
  useEffect(() => {
    if (state.status === "sending") viewHeading.current?.focus();
    if (state.status === "refused" || state.status === "error") outcomeHeading.current?.focus();
  }, [state.status]);

  // L'analyse enregistrée a son adresse : on peut y revenir, la garder en favori.
  useEffect(() => {
    if (state.status === "done" && state.analysisId) {
      window.history.replaceState(null, "", `${ANALYZE_PATH}/${state.analysisId}`);
    }
  }, [state.status, state.analysisId]);

  const run = async (files: readonly File[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunId((id) => id + 1);
    dispatch({ type: "send" });
    const measure = measurer(files);
    for await (const event of streamAnalysis(files, controller.signal)) {
      if (controller.signal.aborted) return;
      measure(event);
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
    const blurryPages = pages.filter((page) => page.blurry).map((page) => page.id).join(",");
    if (!error && blurryPages && blurAcknowledged !== blurryPages) {
      error = { field: "pages", message: BLURRY_CONFIRM };
      setBlurAcknowledged(blurryPages);
    }
    setFormError(error);
    if (!error) void run(pages.map((page) => page.file));
  };

  const cancel = () => {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
  };

  const restart = () => {
    abortRef.current?.abort();
    if (window.location.pathname !== ANALYZE_PATH) window.history.replaceState(null, "", ANALYZE_PATH);
    clear();
    setFormError(null);
    dispatch({ type: "reset" });
  };

  const retry = () => {
    void run(pages.map((page) => page.file));
  };

  if (state.status === "idle") {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <form onSubmit={submit} noValidate className="min-w-0">
          <p className="text-sm font-semibold text-brand-strong">Analyse gratuite · environ 30&nbsp;secondes</p>
          <h1 className="mt-3 font-display text-section text-ink">Scannez votre devis.</h1>
          <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-muted">
            {fr(
              "Prenez chaque page en photo, ou envoyez le PDF reçu par email. Loupe vérifie les calculs, les mentions obligatoires et les prix.",
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

          <div className="mt-6 rounded-lg border border-rule bg-paper-raised p-5">
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
                className="mt-1 size-5 shrink-0 accent-brand-strong"
              />
              <label htmlFor={consentId} className="text-[0.95rem] leading-relaxed text-ink">
                {fr(
                  "J'accepte que mon devis soit lu par l'intelligence artificielle d'Anthropic, le prestataire de Loupe. L'original est effacé juste après ; seules les lignes de prix rendues anonymes, la catégorie et le département sont conservés.",
                )}
              </label>
            </div>
            <details className="ml-8 mt-3 text-sm text-ink-muted">
              <summary className="w-fit cursor-pointer font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
                {fr("Ce que nous conservons, et ce que nous effaçons")}
              </summary>
              <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 leading-relaxed">
                <li>
                  {fr(
                    "Effacé dès la lecture terminée : la photo ou le PDF. Les noms, adresses et numéros de téléphone ne sont jamais recopiés.",
                  )}
                </li>
                <li>
                  {fr(
                    "Conservé pour affiner les comparaisons : des lignes du type « chauffe-eau 200 L, 890 € HT », avec la catégorie et le département.",
                  )}
                </li>
                <li>
                  {fr(
                    `Votre adresse IP n'est jamais enregistrée en clair. Nous en gardons une empreinte chiffrée, différente chaque jour, uniquement pour compter vos ${limits.analysesPerDay} analyses quotidiennes. Elle disparaît au bout de quelques jours.`,
                  )}
                </li>
                <li>
                  {fr("Pour tout savoir : ")}
                  <Link
                    href="/confidentialite"
                    className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                  >
                    politique de confidentialité
                  </Link>
                  .
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

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button type="submit" size="xl" className="w-full sm:w-auto">
              Analyser mon devis
            </Button>
            <p className="text-sm text-ink-muted">{fr("Comptez une trentaine de secondes.")}</p>
          </div>
          <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
        </form>

        <aside className="space-y-4 lg:pt-14">
          <section aria-labelledby="conseils-photo" className="rounded-lg bg-mist p-5">
            <h2 id="conseils-photo" className="text-sm font-semibold text-ink">
              Pour une lecture fiable
            </h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2.5">
                  <CheckGlyph className="mt-px size-[1.1rem] shrink-0 text-brand-strong" />
                  {fr(tip)}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="vie-privee" className="rounded-lg border border-rule p-5">
            <h2 id="vie-privee" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <LockGlyph className="size-5 text-brand-strong" />
              Votre devis n&apos;est pas conservé
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {fr(
                "Il est lu en mémoire puis effacé. Aucun compte, aucune revente : votre analyse s'ouvre par un lien privé.",
              )}
            </p>
          </section>
        </aside>
      </div>
    );
  }

  const showView = state.status !== "refused" && state.status !== "error";
  const stepText = running ? (STEP_TEXT[state.step] ?? STEP_TEXT.received) : undefined;

  return (
    <section aria-labelledby="titre-analyse">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-strong">
            {running ? "Analyse en cours" : state.status === "done" ? "Analyse terminée" : "Analyse"}
          </p>
          <h1
            id="titre-analyse"
            ref={viewHeading}
            tabIndex={-1}
            className="mt-2 font-display text-title text-ink outline-none"
          >
            {stepText ? stepText.title : state.status === "done" ? "Votre devis, vérifié" : "Votre devis"}
          </h1>
        </div>
        {running ? (
          <Button variant="secondary" onClick={cancel} className="mt-2 shrink-0">
            Annuler
          </Button>
        ) : null}
      </div>
      {/* Une annonce par étape, pas par ligne : les lignes se lisent sur le devis. */}
      <p role="status" className="sr-only">
        {stepText?.status ?? null}
      </p>

      <div className="mt-6">
        {state.status === "refused" || state.status === "error" ? (
          <div className="max-w-2xl space-y-6">
            {/* Refus avant toute étape (limite du jour, service fermé) : rien à suivre. */}
            {state.step !== "idle" ? (
              <StepTracker step={state.step} running={false} failed={state.status === "error"} layout="bar" />
            ) : null}
            <AnalysisOutcome state={state} headingRef={outcomeHeading} onRestart={restart} onRetry={retry} />
          </div>
        ) : null}
        {showView ? (
          <AnalysisView
            key={runId}
            data={state}
            target={state.status === "done" ? "done" : state.step}
            live
            sheetId={`analyse-${runId}`}
            headingRef={outcomeHeading}
            onRestart={restart}
            // Sans défilement : le devis reste sous les yeux, le lecteur d'écran suit le focus.
            onShown={() => outcomeHeading.current?.focus({ preventScroll: true })}
          />
        ) : null}
      </div>
      <p className="mt-8 text-xs leading-relaxed text-ink-muted">{fr(site.disclaimer)}</p>
    </section>
  );
}

/** Conseils de prise de vue, à côté du dépôt. */
const TIPS = [
  "Posez chaque page à plat, près d'une fenêtre ou sous une bonne lumière.",
  "Cadrez la page entière, sans couper les montants.",
  "Un devis reçu par email ? Envoyez directement le PDF.",
] as const;
