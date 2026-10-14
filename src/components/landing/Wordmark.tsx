import { PenRing } from "@/components/signature/PenRing";
import { cn } from "@/lib/cn";

interface WordmarkProps {
  readonly className?: string;
}

/** Le logo : « Loupe », entouré au stylo rouge comme une correction. Toujours le même coup de stylo. */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={cn("relative inline-flex items-center px-3 py-1.5", className)}>
      <span className="font-display text-[1.65rem] leading-none text-ink">Loupe</span>
      <PenRing seed="loupe-logo" className="inset-0" />
    </span>
  );
}
