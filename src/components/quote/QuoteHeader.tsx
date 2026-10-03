import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";

interface QuoteHeaderProps {
  readonly category: string;
  readonly department: string;
  readonly title: string;
  readonly issuedAt: Date;
  readonly validityDays: number;
  /** Ce qui occupe le cadre réservé : le tampon, une fois le verdict rendu. */
  readonly stamp?: ReactNode;
  /** Version resserrée, pour la démo de la landing. */
  readonly compact?: boolean;
}

/**
 * En-tête du devis reconstruit. Jamais de nom d'entreprise, d'adresse ni de
 * numéro : uniquement la catégorie, le département et les dates.
 *
 * Comme sur un formulaire administratif, un « cadre réservé au correcteur »
 * (« visa du correcteur » en version compacte) attend le tampon : il a sa
 * place, il ne recouvre jamais le texte.
 */
export function QuoteHeader({
  category,
  department,
  title,
  issuedAt,
  validityDays,
  stamp,
  compact = false,
}: QuoteHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-rule",
        compact ? "px-5 pb-4 pt-4 sm:px-6 sm:pt-5" : "px-5 pb-5 pt-6 sm:px-8 sm:pt-8",
      )}
    >
      <div
        className={cn(
          "flex",
          compact
            ? "items-start justify-between gap-3"
            : "flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8",
        )}
      >
        <div className="min-w-0">
          <p className="font-mono text-label uppercase text-ink-muted">Devis reconstruit</p>
          <p className={cn("mt-1.5 text-ink", compact ? "text-[0.8125rem]" : "text-sm")}>
            {category} · {department}
          </p>
          <p className={cn("mt-0.5 text-ink-muted", compact ? "text-[0.8125rem]" : "text-sm")}>
            Daté du {formatShortDate(issuedAt)}
            {compact ? null : <> · valable {validityDays} jours</>}
          </p>
        </div>
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-[2px] border border-rule",
            compact ? "h-[5.75rem] w-[10rem] sm:w-[12rem]" : "h-28 sm:w-[17rem]",
          )}
        >
          <span
            className={cn(
              "absolute left-2 top-1.5 whitespace-nowrap font-mono text-label uppercase leading-tight text-ink-muted",
              compact && "tracking-[0.1em]",
            )}
          >
            {compact ? "Visa du correcteur" : "Cadre réservé au correcteur"}
          </span>
          {stamp}
        </div>
      </div>
      <h3
        className={cn(
          "font-display text-ink",
          compact ? "mt-3 text-[1.5rem] leading-[1.05] sm:text-[1.75rem]" : "mt-5 text-title",
        )}
      >
        {title}
      </h3>
    </header>
  );
}
