import { InkStroke } from "@/components/signature/InkStroke";
import { cn } from "@/lib/cn";
import { inkStroke, penTick } from "@/lib/hand-drawn";

/** Repère de la coche, en px pour un texte de 16 px. */
const TICK = { width: 16, height: 15 } as const;

/**
 * Petit trait de stylo rouge, tracé à la main : « vérifié ». La graine change
 * le geste d'une coche à l'autre, toujours le même pour la même graine.
 * Décorative.
 */
export function PenTick({ seed = "coche", className }: { readonly seed?: string; readonly className?: string }) {
  const stroke = inkStroke(`coche:${seed}`, penTick(`coche:${seed}`, TICK.width, TICK.height), { min: 0.8, max: 2.3 });
  return (
    <span aria-hidden className={cn("inline-block shrink-0 text-pen-red", className)}>
      <InkStroke stroke={stroke} {...TICK} />
    </span>
  );
}
