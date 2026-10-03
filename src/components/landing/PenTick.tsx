import { cn } from "@/lib/cn";

/** Petite coche tracée au stylo vert : « vérifié ». Décorative. */
export function PenTick({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0 overflow-visible", className)}
      fill="none"
    >
      <path
        d="M2.6 8.6c1.2.9 2.2 2 3 3.4 1.6-3.6 4.2-6.8 7.6-9.2"
        className="stroke-stamp-green-strong"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
