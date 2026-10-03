"use client";

import { useInView } from "motion/react";
import { useRef } from "react";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import { issueBeats } from "@/lib/choreography";
import { PenTick } from "./PenTick";

type Kind = "calculation" | "mentions" | "prices";

/** Le geste commence un peu après l'entrée dans l'écran. */
const START = 0.15;

/**
 * Petites fiches illustrant chaque vérification. Elles se corrigent quand
 * elles arrivent à l'écran, une seule fois. Décoratives : le texte à côté
 * dit la même chose.
 */
export function CheckIllustration({ kind }: { readonly kind: Kind }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref} aria-hidden className="mx-auto w-full max-w-[19rem]">
      <PaperSheet entrance={false}>
        <div className="px-5 pb-5 pt-4">
          {kind === "calculation" ? <Calculation active={inView} /> : null}
          {kind === "mentions" ? <Mentions active={inView} /> : null}
          {kind === "prices" ? <Prices active={inView} /> : null}
        </div>
      </PaperSheet>
    </div>
  );
}

function Calculation({ active }: { readonly active: boolean }) {
  const beats = issueBeats({ startAt: START });
  return (
    <>
      <p className="font-mono text-label uppercase text-ink-muted">Main-d&apos;œuvre</p>
      <div className="relative isolate mt-3 flex items-baseline justify-between font-mono text-[0.95rem] tabular-nums">
        <HighlighterMark id="vitrine-calcul" active={active} delay={beats.highlight.start} />
        <span>4 h × 65,00</span>
        <span className="relative px-1">
          280,00
          <RedCircle
            id="vitrine-calcul"
            active={active}
            delay={beats.circle.start}
            className="-inset-x-2.5 -inset-y-2.5 sm:-inset-x-2.5"
          />
        </span>
      </div>
      <div className="mt-3 flex justify-end">
        <MarginNote id="vitrine-calcul" active={active} delay={beats.note.start} placement="below">
          ça fait 260
        </MarginNote>
      </div>
    </>
  );
}

const MENTIONS = ["Durée de validité", "Décompte détaillé", "Frais de déplacement"] as const;

function Mentions({ active }: { readonly active: boolean }) {
  const beats = issueBeats({ startAt: START });
  return (
    <>
      <p className="font-mono text-label uppercase text-ink-muted">Mentions</p>
      <ul className="mt-3 space-y-2 text-[0.9rem]">
        {MENTIONS.map((mention) => (
          <li key={mention} className="flex items-center gap-2.5">
            <PenTick />
            {mention}
          </li>
        ))}
        <li className="relative isolate flex items-center gap-2.5">
          <HighlighterMark id="vitrine-mention" active={active} delay={beats.highlight.start} />
          <span className="size-4 shrink-0" />
          <span>Assurance professionnelle</span>
          <span className="ml-auto font-mono text-xs font-semibold uppercase">absente</span>
        </li>
      </ul>
    </>
  );
}

function Prices({ active }: { readonly active: boolean }) {
  return (
    <>
      <p className="font-mono text-label uppercase text-ink-muted">Chauffe-eau 200 L</p>
      <div className="mt-2 flex items-baseline justify-between font-mono text-[0.95rem] tabular-nums">
        <span className="text-xs text-ink-muted">Prix du devis</span>
        <span>890,00</span>
      </div>
      <PriceDelta
        amount={340}
        source={{ kind: "loupe", comparables: 23 }}
        active={active}
        delay={START}
        className="mt-4"
      />
    </>
  );
}
