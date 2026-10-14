"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useMotionPrefs } from "@/components/motion/MotionPreferences";
import { ButtonLink } from "@/components/ui/Button";
import { reducedFade, springs } from "@/lib/motion";

interface StickyCtaProps {
  /** Identifiant du bouton principal du haut de page. */
  readonly targetId: string;
}

/**
 * Sur mobile, une fois le bouton principal sorti de l'écran par le haut,
 * « Scanner mon devis » reste à portée de pouce en bas de l'écran.
 */
export function StickyCta({ targetId }: StickyCtaProps) {
  const { reduced } = useMotionPrefs();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <motion.div
      inert={!visible}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:hidden"
      initial={false}
      animate={visible ? { y: 0, opacity: 1 } : { y: "110%", opacity: 0 }}
      transition={reduced ? reducedFade() : springs.snappy}
    >
      <ButtonLink href="/analyse" size="lg" className="w-full">
        Scanner mon devis
      </ButtonLink>
    </motion.div>
  );
}
