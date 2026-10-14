import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { VERDICT_LABELS, type Verdict } from "@/lib/scene-quote";

/** Ce que porte le tampon : une ou deux lignes, en majuscules. */
const STAMP_LINES: Record<Verdict, readonly string[]> = {
  ok: ["CORRECT"],
  negotiate: ["À NÉGOCIER"],
  alert: ["À VÉRIFIER", "SÉRIEUSEMENT"],
};

const INK: Record<Verdict, string> = {
  ok: "text-verdict-ok",
  negotiate: "text-verdict-negotiate",
  alert: "text-verdict-alert",
};

/** Repère du tampon (unités SVG) ; il s'étire à la largeur donnée par `className`. */
const BOX = { width: 200, height: 72 } as const;

interface InkStampProps {
  readonly verdict: Verdict;
  /** Le coup de tampon (`cssGesture`, avec `--tilt` et `--from`) : sans lui, il est déjà posé. */
  readonly gesture?: CSSProperties;
  readonly className?: string;
}

/**
 * Tampon encré du verdict : double bordure, majuscules, encre irrégulière.
 * La texture est un vrai filtre SVG : un bruit (feTurbulence) déforme à peine
 * les bords (feDisplacementMap) et un second bruit creuse des manques d'encre.
 * L'encre se mélange au papier (multiply). Il tombe d'un seul coup, sans rebond.
 */
export function InkStamp({ verdict, gesture, className }: InkStampProps) {
  const filterId = `tampon-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lines = STAMP_LINES[verdict];
  const twoLines = lines.length > 1;
  return (
    <svg
      role="img"
      aria-label={`Verdict : ${VERDICT_LABELS[verdict]}`}
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      className={cn("block overflow-visible mix-blend-multiply", INK[verdict], gesture && "gesture gesture-slam", className)}
      style={gesture}
    >
      <defs>
        <filter id={filterId} x="-4%" y="-8%" width="108%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.7" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.22 0.5" numOctaves="3" seed="3" result="spots" />
          <feColorMatrix in="spots" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 4.45" result="ink" />
          <feComposite in="rough" in2="ink" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`} fill="none" stroke="currentColor">
        <rect x="3" y="3" width={BOX.width - 6} height={BOX.height - 6} rx="8" strokeWidth="4.5" />
        <rect x="10" y="10" width={BOX.width - 20} height={BOX.height - 20} rx="4" strokeWidth="1.8" />
        {lines.map((line, index) => (
          <text
            key={line}
            x={BOX.width / 2}
            y={twoLines ? 33 + index * 21 : 46}
            textAnchor="middle"
            textLength={twoLines ? (index === 0 ? 132 : 150) : 150}
            lengthAdjust="spacingAndGlyphs"
            fill="currentColor"
            stroke="none"
            className="font-mono font-bold"
            fontSize={twoLines ? (index === 0 ? 20 : 16) : 27}
          >
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}
