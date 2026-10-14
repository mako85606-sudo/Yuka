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

export function CopyGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-5 fill-none stroke-current", className)}
      strokeWidth={1.6}
    >
      <rect x="7" y="7" width="10" height="10.5" rx="1.2" />
      <path d="M13 4.5V3.7a1.2 1.2 0 0 0-1.2-1.2H4.2A1.2 1.2 0 0 0 3 3.7v8.6a1.2 1.2 0 0 0 1.2 1.2H5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-5 fill-none stroke-current", className)}
      strokeWidth={1.8}
    >
      <path d="M4 10.5 8.2 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-5 fill-none stroke-current", className)}
      strokeWidth={1.8}
    >
      <path d="M4 10h11.5M11 5.5 15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("size-6 fill-none stroke-current", className)}
      strokeWidth={1.7}
    >
      <path d="M12 3 5 5.8v5.5c0 4.4 2.9 8.2 7 9.7 4.1-1.5 7-5.3 7-9.7V5.8L12 3Z" strokeLinejoin="round" />
      <path d="m8.8 12 2.3 2.3 4.3-4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("size-6 fill-none stroke-current", className)}
      strokeWidth={1.7}
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.5v2.5" strokeLinecap="round" />
    </svg>
  );
}

export function EraseGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={cn("size-6 fill-none stroke-current", className)}
      strokeWidth={1.7}
    >
      <path d="M6 3.5h8.5L19 8v12a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
      <path d="M14.5 3.5V8H19M9.8 12.2l4.4 4.4M14.2 12.2l-4.4 4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
