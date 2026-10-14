import { cn } from "@/lib/cn";
import { penLoop } from "@/lib/hand-drawn";

/** La boucle du logo, calculée une fois : toujours le même coup de crayon. */
const LOOP = penLoop("loupe-logo", 100, 44);

interface WordmarkProps {
  readonly className?: string;
}

/** Le logo : « Loupe », entouré au stylo rouge comme une correction. */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={cn("relative inline-flex items-center px-3 py-1.5", className)}>
      <span className="font-display text-[1.65rem] leading-none text-ink">Loupe</span>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d={LOOP.d}
          className="stroke-pen-red"
          strokeWidth={1.8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
