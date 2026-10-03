import { cn } from "@/lib/cn";

/** Pictogrammes au trait, décoratifs (le texte voisin porte le sens). */

export function CameraGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-5 fill-none stroke-current", className)}
      strokeWidth={1.6}
    >
      <path
        d="M3 6.5h2.6l1.3-2h6.2l1.3 2H17a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="3" />
    </svg>
  );
}

export function DocumentGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-5 fill-none stroke-current", className)}
      strokeWidth={1.6}
    >
      <path d="M5 2.5h6.5L15.5 6.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
      <path d="M11.5 2.5v4h4M7.5 10.5h5M7.5 13.5h5" strokeLinecap="round" />
    </svg>
  );
}

export function CloseGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={cn("size-4 fill-none stroke-current", className)}
      strokeWidth={1.8}
    >
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  );
}
