"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { CheckGlyph, CopyGlyph } from "@/components/ui/icons";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { holds, reducedFade, transitions } from "@/lib/motion";
import type { NegotiationMessage as Message } from "@/lib/negotiation";
import { fr } from "@/lib/typography";

type Version = "email" | "sms";

const VERSIONS: Record<Version, string> = { email: "Email", sms: "SMS" };

interface NegotiationMessageProps {
  readonly message: Message;
  readonly id?: string;
}

/** Copie dans le presse-papiers ; sinon, sélectionne le texte pour un copier à la main. */
async function copyText(text: string, fallback: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    fallback?.focus();
    fallback?.select();
    return false;
  }
}

/**
 * Le message à envoyer à l'artisan, prêt à copier, en version email ou SMS.
 * Le texte reste modifiable avant d'être copié. Le bouton « Copier » répond
 * net : « Copié » aussitôt, puis il revient.
 */
export function NegotiationMessage({ message, id }: NegotiationMessageProps) {
  const { reduced } = useMotionPrefs();
  const [version, setVersion] = useState<Version>("email");
  const [texts, setTexts] = useState<Record<Version, string>>({ email: message.email.body, sms: message.sms });
  const [copied, setCopied] = useState<"text" | "subject" | null>(null);
  const [status, setStatus] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const statusId = useId();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), holds.copied * 1000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (what: "text" | "subject") => {
    const ok = await copyText(what === "subject" ? message.email.subject : texts[version], textRef.current);
    setCopied(ok ? what : null);
    if (ok) track("negotiation_copied", { version: what === "subject" ? "subject" : version });
    setStatus(
      ok
        ? what === "subject"
          ? "Objet copié."
          : `${version === "sms" ? "SMS" : "Message"} copié.`
        : fr("Copie impossible ici : le texte est sélectionné, copie-le à la main."),
    );
  };

  return (
    <div id={id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span role="group" aria-label="Version du message" className="flex rounded-[6px] border border-rule-strong p-0.5">
          {(Object.keys(VERSIONS) as Version[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={version === key}
              onClick={() => {
                setVersion(key);
                setCopied(null);
                setStatus("");
              }}
              className={cn(
                "h-8 rounded-[4px] px-3 text-sm",
                version === key ? "bg-ink text-paper" : "text-ink hover:bg-ink/8",
              )}
            >
              {VERSIONS[key]}
            </button>
          ))}
        </span>
        {version === "email" ? (
          <button
            type="button"
            onClick={() => void copy("subject")}
            className="text-sm text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
          >
            {copied === "subject" ? "Objet copié" : "Copier l'objet"}
          </button>
        ) : null}
      </div>

      {version === "email" ? (
        <p className="mt-4 text-sm text-ink-muted">
          <span className="font-mono text-label uppercase">Objet</span>{" "}
          <span className="text-ink">{message.email.subject}</span>
        </p>
      ) : null}

      <label htmlFor={fieldId} className="sr-only">
        {version === "email" ? "Texte de l'email, modifiable" : "Texte du SMS, modifiable"}
      </label>
      <textarea
        id={fieldId}
        ref={textRef}
        value={texts[version]}
        onChange={(event) => setTexts((current) => ({ ...current, [version]: event.target.value }))}
        rows={version === "email" ? 12 : 5}
        aria-describedby={statusId}
        className="mt-3 block w-full resize-y surface-paper rounded-[4px] border border-rule-strong px-4 py-3 text-[0.95rem] leading-relaxed text-ink [field-sizing:content] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void copy("text")}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-[6px] px-5 font-medium motion-safe:active:translate-y-px",
            copied === "text" ? "bg-ink text-paper" : "bg-ink text-paper hover:bg-ink/88",
          )}
        >
          <span className="relative inline-flex size-5">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={copied === "text" ? "ok" : "copy"}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={reduced ? reducedFade() : transitions.micro}
              >
                {copied === "text" ? <CheckGlyph /> : <CopyGlyph />}
              </motion.span>
            </AnimatePresence>
          </span>
          {copied === "text" ? "Copié" : version === "email" ? "Copier le message" : "Copier le SMS"}
        </button>
        <p id={statusId} aria-live="polite" className="text-sm text-ink-muted">
          {status}
        </p>
      </div>
    </div>
  );
}
