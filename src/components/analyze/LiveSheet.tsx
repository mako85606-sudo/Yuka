"use client";

import { GhostLines } from "@/components/quote/GhostLines";
import { QuoteHeader } from "@/components/quote/QuoteHeader";
import { QuoteLine } from "@/components/quote/QuoteLine";
import { QuoteTotals } from "@/components/quote/QuoteTotals";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { CATEGORY_LABELS } from "@/config/taxonomy";
import { isRunning, type LiveState } from "@/lib/analysis/live-state";
import { commonVatRate, printedLine, printedTotals } from "@/lib/analysis/printed";
import { departmentLabel } from "@/lib/department";
import { fr } from "@/lib/typography";

/**
 * Le devis reconstruit pendant qu'il est lu : l'en-tête puis chaque ligne
 * apparaissent quand le modèle les a lus, pas avant. Le faisceau de scan
 * tourne tant que dure l'étape de lecture réelle.
 */
export function LiveSheet({ state }: { readonly state: LiveState }) {
  const running = isRunning(state);
  const { header, extraction } = state;

  return (
    <PaperSheet
      scanning={running && state.step === "reading"}
      label={running ? "Devis en cours de lecture" : "Devis reconstruit"}
    >
      {header ? (
        <QuoteHeader
          category={CATEGORY_LABELS[header.category]}
          department={header.department ? departmentLabel(header.department) : null}
          title={fr(header.subject)}
          issuedAt={header.quoteDate ? new Date(header.quoteDate) : null}
          validityDays={header.validityDays ?? null}
        />
      ) : (
        <HeaderPlaceholder />
      )}

      <div className="relative [--margin-col:10rem] lg:[--margin-col:12rem]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[calc(2rem+var(--margin-col)+0.875rem)] hidden w-px bg-margin-rule sm:block"
        />
        <div className="px-5 pt-4 sm:px-8">
          <div className="flex justify-between font-mono text-label uppercase text-ink-muted sm:mr-[calc(var(--margin-col)+1.75rem)]">
            <span>Désignation</span>
            <span>Montant HT</span>
          </div>
          {state.lines.length > 0 ? (
            <ol className="divide-y divide-rule">
              {state.lines.map((entry) => (
                <QuoteLine key={entry.index} line={printedLine(entry)} />
              ))}
            </ol>
          ) : null}
          {running ? <GhostLines count={state.lines.length > 0 ? 1 : 4} /> : null}
          {!running && state.lines.length === 0 ? (
            <p className="py-6 text-sm text-ink-muted">Aucune ligne lue.</p>
          ) : null}
        </div>
        {extraction ? (
          <QuoteTotals
            totals={printedTotals(extraction.totals)}
            vatRate={commonVatRate(extraction.lines)}
          />
        ) : (
          <div className="h-6" />
        )}
      </div>
    </PaperSheet>
  );
}

/** En-tête encore illisible, à la place de celui qui arrive. */
function HeaderPlaceholder() {
  return (
    <header aria-hidden className="border-b border-rule px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 flex-1 space-y-3 pt-1">
          <span className="block h-2 w-28 rounded-full bg-rule" />
          <span className="block h-2 w-44 rounded-full bg-rule" />
          <span className="block h-2 w-36 rounded-full bg-rule" />
        </div>
        <div className="h-28 shrink-0 rounded-[2px] border border-rule sm:w-[17rem]" />
      </div>
      <span className="mt-6 block h-4 w-3/4 rounded-full bg-rule" />
    </header>
  );
}
