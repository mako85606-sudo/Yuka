import type { ReactNode } from "react";
import { formatShortDate } from "@/lib/format";

interface QuoteHeaderProps {
  readonly category: string;
  readonly department: string;
  readonly title: string;
  readonly issuedAt: Date;
  readonly validityDays: number;
  /** Ce qui occupe le cadre réservé : le tampon, une fois le verdict rendu. */
  readonly stamp?: ReactNode;
}

/**
 * En-tête du devis reconstruit. Jamais de nom d'entreprise, d'adresse ni de
 * numéro : uniquement la catégorie, le département et les dates.
 *
 * Comme sur un formulaire administratif, un « cadre réservé au correcteur »
 * attend le tampon : il a sa place, il ne recouvre jamais le texte.
 */
export function QuoteHeader({
  category,
  department,
  title,
  issuedAt,
  validityDays,
  stamp,
}: QuoteHeaderProps) {
  return (
    <header className="border-b border-rule px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <p className="font-mono text-label uppercase text-ink-muted">Devis reconstruit</p>
          <p className="mt-1.5 text-sm text-ink">
            {category} · {department}
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">
            Daté du {formatShortDate(issuedAt)} · valable {validityDays} jours
          </p>
        </div>
        <div className="relative flex h-28 items-center justify-center rounded-[2px] border border-rule sm:w-[17rem] sm:shrink-0">
          <span className="absolute left-2 top-1.5 font-mono text-label uppercase text-ink-muted">
            Cadre réservé au correcteur
          </span>
          {stamp}
        </div>
      </div>
      <h3 className="mt-5 font-display text-title text-ink">{title}</h3>
    </header>
  );
}
