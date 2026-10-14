import type { ReactNode } from "react";
import { PenRing } from "@/components/signature/PenRing";
import type { RingShape } from "@/lib/hand-drawn";

/**
 * Un mot clé entouré au stylo, comme sur une copie : l'anneau se trace quand
 * le mot passe à l'écran. Le mot reste du texte ordinaire.
 */
export function Ringed({
  children,
  seed,
  shape = "word",
}: {
  readonly children: ReactNode;
  readonly seed: string;
  readonly shape?: RingShape;
}) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <PenRing mode="view" seed={seed} shape={shape} className="-inset-x-[0.35em] -inset-y-[0.2em]" />
    </span>
  );
}
