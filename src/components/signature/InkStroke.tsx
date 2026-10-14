import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { InkStroke as InkStrokeGeometry } from "@/lib/hand-drawn";

interface InkStrokeProps {
  /** Le trait : contour rempli, ligne médiane et largeur du masque (`inkStroke`). */
  readonly stroke: InkStrokeGeometry;
  /** Repère du tracé, en px pour une taille de texte de 16 px : le trait suit la taille du texte. */
  readonly width: number;
  readonly height: number;
  /** Le geste (`cssGesture`) : sans lui, le trait est déjà tracé. */
  readonly gesture?: CSSProperties;
  /** Position et encre (`text-pen-red`, `text-annotation-blue`…). */
  readonly className?: string;
}

/**
 * Trait de stylo à largeur variable : un contour rempli, dévoilé dans l'ordre
 * du geste par un masque qui parcourt sa ligne médiane (pathLength = 1,
 * stroke-dashoffset animé en CSS). Fin quand le stylo se pose, plein au
 * milieu, effilé quand il se lève. Décoratif.
 */
export function InkStroke({ stroke, width, height, gesture, className }: InkStrokeProps) {
  const maskId = `encre-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const margin = stroke.maskWidth;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={cn("pointer-events-none block overflow-visible", className)}
      style={{ width: `${width / 16}em`, height: `${height / 16}em` }}
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={-margin}
          y={-margin}
          width={width + 2 * margin}
          height={height + 2 * margin}
        >
          <path
            d={stroke.centerline}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth={stroke.maskWidth}
            strokeLinejoin="round"
            className={gesture ? "gesture gesture-draw" : undefined}
            style={gesture}
          />
        </mask>
      </defs>
      <path d={stroke.outline} fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
