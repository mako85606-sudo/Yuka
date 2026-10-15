import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Le ton d'une pastille : erreur vérifiée (rouge), point d'attention
 * (orange), à confirmer (neutre), rappel (bleu), estimation (neutre),
 * bonne nouvelle (vert).
 */
export type TagTone = "error" | "warning" | "unconfirmed" | "reminder" | "estimate" | "ok";

const TONES: Record<TagTone, string> = {
  error: "bg-error-soft text-pen-red-strong",
  warning: "bg-warning-soft text-stamp-orange-strong",
  unconfirmed: "bg-paper-raised text-ink ring-1 ring-inset ring-rule-strong",
  reminder: "bg-mist text-annotation-blue",
  estimate: "bg-mist text-ink-muted",
  ok: "bg-brand-soft text-brand-strong",
};

const SIZES = {
  md: "px-2 py-0.5 text-xs leading-5",
  /** À l'échelle du texte voisin (écrans du téléphone, tout en em). */
  em: "px-[0.5em] py-[0.2em] text-[0.72em] leading-none",
} as const;

/** Une pastille : le type d'un constat, en quelques mots. */
export function Tag({
  tone,
  size = "md",
  children,
  className,
}: {
  readonly tone: TagTone;
  readonly size?: keyof typeof SIZES;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm font-semibold",
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
