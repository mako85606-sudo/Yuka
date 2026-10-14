import type { ReactNode } from "react";
import { FindingCard, FrameCorners, QuotePaper } from "@/components/landing/phone/PhoneParts";
import { CheckGlyph, CopyGlyph } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { DemoQuote } from "@/lib/demo-outcome";
import { formatEuros } from "@/lib/format";
import { phoneResult } from "@/lib/phone-demo";
import { fr } from "@/lib/typography";

/**
 * « Comment ça marche » : quatre étapes, chacune illustrée par un écran de
 * l'application, sur le même devis fictif que le téléphone du haut de page.
 */
export function HowItWorks({ quote }: { readonly quote: DemoQuote }) {
  const result = phoneResult(quote);
  const calculation = result.findings.find((finding) => finding.kind === "calculation");

  const steps: readonly { readonly title: string; readonly text: string; readonly art: ReactNode }[] = [
    {
      title: "Photographiez votre devis",
      text: "Une photo nette de chaque page, ou le PDF reçu par email. Pas de compte à créer.",
      art: <PhotoArt quote={quote} />,
    },
    {
      title: "Loupe vérifie tout",
      text: "Chaque multiplication est refaite, les mentions obligatoires sont contrôlées et chaque prix est comparé aux devis de votre région.",
      art: <ChecksArt />,
    },
    {
      title: "Vous voyez ce qui cloche",
      text: "Les erreurs vérifiées d'un côté, les avis sur les prix de l'autre, avec leur source. Et combien vous pouvez économiser.",
      art: (
        <div className="w-full space-y-[0.6em]">
          {result.savings === null ? null : (
            <div className="rounded-lg bg-paper-raised px-[1em] py-[0.8em] elevation-1">
              <p className="text-[0.8em] text-ink-muted">Vous pouvez économiser</p>
              <p className="text-[1.9em] font-semibold leading-tight tracking-[-0.03em] text-brand-strong">
                {fr(`jusqu'à ${formatEuros(result.savings, 0)}`)}
              </p>
            </div>
          )}
          {calculation ? <FindingCard finding={calculation} className="elevation-1" /> : null}
        </div>
      ),
    },
    {
      title: "Vous envoyez un message",
      text: "Un message courtois, fondé sur les seuls points vérifiés, prêt à copier par email ou par SMS.",
      art: <MessageArt message={quote.message ?? ""} />,
    },
  ];

  return (
    <ol className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.title}>
          <div aria-hidden className="flex aspect-[4/3.6] items-center justify-center overflow-hidden rounded-lg bg-mist p-[1.2em] text-[12.5px] select-none">
            {step.art}
          </div>
          <p className="mt-6 text-sm font-semibold text-brand-strong">{`Étape ${index + 1}`}</p>
          <h3 className="mt-1.5 text-lg font-semibold leading-snug text-ink">{step.title}</h3>
          <p className="mt-2 leading-relaxed text-ink-muted">{fr(step.text)}</p>
        </li>
      ))}
    </ol>
  );
}

/** Le viseur : la feuille cadrée par les coins verts. */
function PhotoArt({ quote }: { readonly quote: DemoQuote }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-lg bg-ink p-[1.2em]">
      <QuotePaper quote={quote} className="w-[82%] -rotate-2" />
      <FrameCorners className="inset-[0.8em]" />
    </div>
  );
}

const CHECKS = ["Calculs refaits ligne par ligne", "Mentions obligatoires", "Prix comparés à votre région"] as const;

function ChecksArt() {
  return (
    <ul className="w-full space-y-[0.5em]">
      {CHECKS.map((check) => (
        <li key={check} className="flex items-center gap-[0.7em] rounded-lg bg-paper-raised px-[0.9em] py-[0.8em] elevation-1">
          <span className="grid size-[1.6em] shrink-0 place-items-center rounded-[0.8em] bg-brand text-ink">
            <CheckGlyph className="size-[1.05em]" />
          </span>
          <span className="text-[0.95em] text-ink">{check}</span>
        </li>
      ))}
    </ul>
  );
}

/** Le message prêt à envoyer : l'onglet Email, le texte, le bouton Copier. */
function MessageArt({ message }: { readonly message: string }) {
  return (
    <div className="w-full rounded-lg bg-paper-raised p-[0.9em] elevation-1">
      <div className="flex gap-[0.3em] text-[0.8em] font-medium">
        {["Email", "SMS"].map((tab, index) => (
          <span key={tab} className={cn("rounded-sm px-[0.6em] py-[0.25em]", index === 0 ? "bg-ink text-paper" : "text-ink-muted")}>
            {tab}
          </span>
        ))}
      </div>
      <p className="mt-[0.7em] line-clamp-4 text-[0.88em] leading-snug text-ink">{message}</p>
      <span className="mt-[0.8em] flex h-[2.4em] items-center justify-center gap-[0.4em] rounded-md bg-brand text-[0.88em] font-semibold text-ink">
        <CopyGlyph className="size-[1.2em]" />
        Copier le message
      </span>
    </div>
  );
}
