import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface HandTextProps {
  readonly children: ReactNode;
  /** Le geste (`cssGesture`) : sans lui, le texte est déjà écrit. */
  readonly gesture?: CSSProperties;
  /** Frappe à la machine (par crans) plutôt qu'écriture à la main. */
  readonly typed?: boolean;
  readonly className?: string;
}

/**
 * Texte qui s'écrit de gauche à droite : un cache couleur papier glisse et le
 * découvre, d'un trait (à la main) ou par crans (à la machine). Le texte est
 * là dès le rendu serveur, entier : seul le cache bouge (transform). À poser
 * sur une feuille unie, loin d'un pli ; le grain de la feuille passe par-dessus.
 */
export function HandText({ children, gesture, typed = false, className }: HandTextProps) {
  return (
    <span className={cn("relative inline-block overflow-hidden px-[0.25em] py-[0.15em] -mx-[0.25em] -my-[0.15em] align-top", className)}>
      {children}
      {gesture ? (
        <span
          aria-hidden
          className={cn("gesture absolute inset-y-0 -left-px -right-px bg-paper-raised", typed ? "gesture-type" : "gesture-wipe")}
          style={gesture}
        />
      ) : null}
    </span>
  );
}
