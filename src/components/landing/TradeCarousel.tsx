"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { describeOutcome, type DemoQuote } from "@/lib/demo-outcome";
import { LAZY_MOUNT_MARGIN } from "@/lib/motion";
import { describeCorrection } from "@/lib/scene-quote";
import { TradeCard } from "./TradeCard";

/** Part visible d'une carte, dans le carrousel, pour qu'elle se corrige. */
const CARD_VISIBLE = 0.6;

interface TradeCarouselProps {
  readonly quotes: readonly DemoQuote[];
}

/**
 * Carrousel « un devis, quel que soit le métier » : des cartes qu'on fait
 * glisser du doigt (défilement natif, aimanté). Chaque carte se corrige
 * quand elle arrive à l'écran, une seule fois. Flèches pour la souris et le
 * clavier ; le défilement lui-même est atteignable au clavier.
 */
export function TradeCarousel({ quotes }: TradeCarouselProps) {
  const { reduced } = useMotionPrefs();
  const scrollerRef = useRef<HTMLUListElement>(null);
  const sectionInView = useInView(scrollerRef, { amount: 0.5 });
  // Les cartes (nombreuses animations) ne sont montées qu'à l'approche : une feuille vide les attend.
  const near = useInView(scrollerRef, { once: true, margin: LAZY_MOUNT_MARGIN });
  const [visible, setVisible] = useState<ReadonlySet<string>>(() => new Set());
  const [corrected, setCorrected] = useState<ReadonlySet<string>>(() => new Set());

  // Quelles cartes sont dans le carrousel, à au moins 60 % ?
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((previous) => {
          const next = new Set(previous);
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.card;
            if (!id) continue;
            if (entry.intersectionRatio >= CARD_VISIBLE) next.add(id);
            else next.delete(id);
          }
          return next;
        });
      },
      { root: scroller, threshold: [0, CARD_VISIBLE, 1] },
    );
    for (const card of scroller.querySelectorAll("[data-card]")) observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Une carte visible dans un carrousel lui-même à l'écran se corrige, et le reste.
  const toCorrect = sectionInView ? [...visible].filter((id) => !corrected.has(id)) : [];
  if (toCorrect.length > 0) setCorrected(new Set([...corrected, ...toCorrect]));

  const scrollByCard = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    const card = scroller?.querySelector<HTMLElement>("[data-card]");
    if (!scroller || !card) return;
    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0;
    scroller.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div>
      <ul
        ref={scrollerRef}
        tabIndex={0}
        aria-label="Exemples de devis corrigés, à faire défiler"
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-8 pt-4 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {quotes.map((quote) => (
          <li key={quote.id} data-card={quote.id} className="relative w-[80vw] max-w-[19.5rem] shrink-0 snap-start">
            <p className="sr-only">{`${describeCorrection(quote)} ${describeOutcome(quote)}`}</p>
            <div aria-hidden>
              {near ? (
                <TradeCard quote={quote} active={corrected.has(quote.id)} />
              ) : (
                <PaperSheet entrance={false}>
                  <div className="min-h-[27.5rem]" />
                </PaperSheet>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <p className="font-mono text-label uppercase text-ink-muted">Exemples fictifs</p>
        <div className="flex gap-2">
          <ArrowButton direction={-1} onClick={() => scrollByCard(-1)} />
          <ArrowButton direction={1} onClick={() => scrollByCard(1)} />
        </div>
      </div>
    </div>
  );
}

function ArrowButton({ direction, onClick }: { readonly direction: 1 | -1; readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === 1 ? "Exemple suivant" : "Exemple précédent"}
      className="grid size-10 place-items-center rounded-full border border-rule-strong text-ink hover:bg-paper-raised"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none">
        <path
          d={direction === 1 ? "M6 3.5 10.5 8 6 12.5" : "M10 3.5 5.5 8 10 12.5"}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
