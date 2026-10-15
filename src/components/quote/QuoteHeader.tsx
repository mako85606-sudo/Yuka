import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";

interface QuoteHeaderProps {
  readonly category: string;
  /** Département lisible (« Rhône (69) »), s'il est connu. */
  readonly department?: string | null;
  readonly title: string;
  readonly issuedAt?: Date | null;
  readonly validityDays?: number | null;
  /** Faux : pas de ligne de dates (page de partage). */
  readonly showDates?: boolean;
  /** À droite du titre : le verdict, une fois rendu (sa place est réservée). */
  readonly verdict?: ReactNode;
  /** Version resserrée, pour une petite carte. */
  readonly compact?: boolean;
  /** Niveau du titre : `h2` sous le titre d'une page, `h3` dans une section. */
  readonly titleAs?: "h2" | "h3";
}

/** « Daté du 12/09/2026 · valable 30 jours », ou ce qu'on en a lu. */
function datesLine(issuedAt: Date | null, validityDays: number | null): string {
  const parts = [
    issuedAt ? `Daté du ${formatShortDate(issuedAt)}` : "Date non lue",
    validityDays ? `valable ${validityDays} jours` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/**
 * En-tête du devis lu. Jamais de nom d'entreprise, d'adresse ni de numéro :
 * uniquement la catégorie, le département, l'objet et les dates. Le verdict
 * a sa place à droite, réservée dès le départ.
 */
export function QuoteHeader({
  category,
  department,
  title,
  issuedAt,
  validityDays,
  showDates = true,
  verdict,
  compact = false,
  titleAs: Title = "h3",
}: QuoteHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-4", compact ? "px-5 pt-5" : "px-5 pt-6 sm:px-7")}>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{department ? `${category} · ${department}` : category}</p>
        <Title className={cn("mt-1 font-semibold leading-snug text-ink", compact ? "text-lg" : "text-xl sm:text-[1.375rem]")}>
          {title}
        </Title>
        {showDates ? (
          <p className="mt-1 text-sm text-ink-muted">{datesLine(issuedAt ?? null, compact ? null : (validityDays ?? null))}</p>
        ) : null}
      </div>
      {verdict ? <div className="shrink-0 pt-0.5">{verdict}</div> : null}
    </header>
  );
}
