"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { cn } from "@/lib/cn";
import { angles, offsets, reducedFade, shakeKeyframes, transitions } from "@/lib/motion";

interface PaperSheetProps {
  readonly children: ReactNode;
  /** Joue le dépôt de la feuille sur le bureau au montage. */
  readonly entrance?: boolean;
  /** Délai avant le dépôt, en secondes. */
  readonly delay?: number;
  /** Faisceau de scan : à activer pendant l'étape de lecture réelle. */
  readonly scanning?: boolean;
  /** Chaque nouvelle valeur fait tressaillir la feuille (coup de tampon). */
  readonly shakeKey?: number;
  /** Nom accessible de la feuille. */
  readonly label?: string;
  /** Ce qui est posé sur la feuille et peut déborder (le tampon). Bouge avec elle. */
  readonly overlay?: ReactNode;
  readonly className?: string;
}

/**
 * La feuille : le devis reconstruit proprement (jamais l'image originale),
 * posé sur le bureau avec une ombre réaliste et un angle de −0,6° au repos.
 *
 * L'ombre qui « se resserre » à l'atterrissage est un fondu entre deux
 * calques d'ombre statiques : on n'anime que l'opacité, jamais box-shadow.
 */
export function PaperSheet({
  children,
  entrance = true,
  delay = 0,
  scanning = false,
  shakeKey = 0,
  label = "Devis reconstruit",
  overlay,
  className,
}: PaperSheetProps) {
  const { reduced, skip } = useMotionPrefs();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const lastShake = useRef(shakeKey);

  useEffect(() => {
    if (shakeKey === lastShake.current) return;
    lastShake.current = shakeKey;
    if (reduced || skip || !scope.current) return;
    const controls = animate(scope.current, { x: [...shakeKeyframes] }, transitions.shake);
    return () => controls.stop();
  }, [shakeKey, reduced, skip, animate, scope]);

  const shadowTransition = reduced ? reducedFade(delay) : transitions.sheetShadow(delay);

  return (
    <motion.div
      ref={scope}
      className={cn("relative isolate", className)}
      initial={entrance ? { opacity: 0, y: offsets.sheetDropY, rotate: angles.sheetDrop } : false}
      animate={{ opacity: 1, y: 0, rotate: angles.sheetRest }}
      transition={reduced ? reducedFade(delay) : transitions.sheetDrop(delay)}
    >
      <motion.div
        aria-hidden
        className="sheet-shadow-lifted absolute inset-0 -z-10 rounded-[3px]"
        initial={entrance ? { opacity: 1 } : false}
        animate={{ opacity: 0 }}
        transition={shadowTransition}
      />
      <motion.div
        aria-hidden
        className="sheet-shadow-rest absolute inset-0 -z-10 rounded-[3px]"
        initial={entrance ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={shadowTransition}
      />
      <section aria-label={label} className="paper-grain relative rounded-[3px] bg-paper-raised">
        {children}
        <AnimatePresence>{scanning ? <ScanBeam key="scan" reduced={reduced} /> : null}</AnimatePresence>
      </section>
      {overlay}
    </motion.div>
  );
}

/**
 * Faisceau de scan : une traîne bleue qui descend la feuille en boucle.
 * Le calque fait toute la hauteur de la feuille et le faisceau occupe son
 * bas ; une translation de −100 % à +18 % le fait passer du haut au bas.
 * En mouvement réduit, pas de balayage : le calque reste invisible (même DOM,
 * pour ne pas créer d'écart entre le rendu serveur et le client).
 */
function ScanBeam({ reduced }: { readonly reduced: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: reduced ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={transitions.micro}
    >
      <motion.div
        className="scan-beam absolute inset-0"
        initial={{ y: "-100%" }}
        animate={reduced ? { y: "-100%" } : { y: "18%" }}
        transition={transitions.scan}
      />
    </motion.div>
  );
}
