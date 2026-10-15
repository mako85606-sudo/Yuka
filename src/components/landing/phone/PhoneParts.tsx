import type { ReactNode } from "react";
import { Tag, type TagTone } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { DemoQuote } from "@/lib/demo-outcome";
import { formatAmount } from "@/lib/format";
import { FINDING_TAGS, type PhoneFinding } from "@/lib/phone-demo";

/**
 * Les pièces des écrans d'application du haut de page et de « Comment ça
 * marche » : le téléphone, la barre d'état, le devis photographié, les cartes
 * de constats. Tout est en em : la taille du texte du parent règle la taille
 * de l'ensemble. Décoratif : le texte voisin, ou une phrase pour les lecteurs
 * d'écran, porte le sens.
 */

/** Un téléphone : cadre à l'encre, écran blanc, îlot en haut. */
export function PhoneFrame({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn("relative h-[45.7em] w-[22.3em] rounded-[3.2em] bg-ink p-[0.6em] elevation-2", className)}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2.65em] bg-paper">
        {children}
        <span className="absolute left-1/2 top-[0.75em] h-[1.65em] w-[6.4em] -translate-x-1/2 rounded-[1em] bg-ink" />
      </div>
    </div>
  );
}

/** La barre d'état : l'heure, le réseau, la batterie. `inverted` : sur fond sombre (viseur). */
export function StatusBar({ inverted = false }: { readonly inverted?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[3.1em] shrink-0 items-center justify-between px-[2.1em] pt-[0.3em] text-[0.95em] font-semibold",
        inverted ? "text-paper" : "text-ink",
      )}
    >
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-[0.35em]">
        <span className="flex items-end gap-[0.12em]">
          {[0.35, 0.5, 0.65, 0.8].map((height) => (
            <span key={height} className="w-[0.2em] rounded-[0.05em] bg-current" style={{ height: `${height}em` }} />
          ))}
        </span>
        <span className="relative h-[0.75em] w-[1.5em] rounded-[0.22em] border-[0.09em] border-current p-[0.1em]">
          <span className="block h-full w-[70%] rounded-[0.08em] bg-current" />
        </span>
      </span>
    </div>
  );
}

/** Le devis papier, tel que photographié : en-tête, lignes et total, en tout petit. */
export function QuotePaper({ quote, className }: { readonly quote: DemoQuote; readonly className?: string }) {
  return (
    <div className={cn("rounded-[0.25em] bg-paper-raised px-[1em] pb-[1.1em] pt-[0.9em] text-ink elevation-1", className)}>
      <div className="flex items-start justify-between gap-[1em]">
        <div>
          <p className="text-[0.62em] font-bold tracking-[0.18em]">DEVIS</p>
          <p className="mt-[0.2em] text-[0.5em] text-ink-muted">{quote.title}</p>
        </div>
        <span className="h-[1.6em] w-[3.4em] rounded-[0.15em] bg-mist" />
      </div>
      <div className="mt-[0.8em] space-y-[0.32em] border-t border-rule pt-[0.5em] font-mono text-[0.5em] tabular-nums">
        {quote.lines.map((line) => (
          <p key={line.id} className="flex justify-between gap-[1em]">
            <span className="truncate">{line.label}</span>
            <span>{formatAmount(line.totalHT)}</span>
          </p>
        ))}
      </div>
      <p className="mt-[0.6em] flex justify-between border-t border-rule pt-[0.4em] font-mono text-[0.55em] font-semibold tabular-nums">
        <span>Total TTC</span>
        <span>{formatAmount(quote.totals.totalTTC)}</span>
      </p>
    </div>
  );
}

/** Les quatre coins verts du cadrage, autour de la feuille. */
export function FrameCorners({ className }: { readonly className?: string }) {
  const corner = "absolute size-[1.6em] border-brand";
  return (
    <span className={cn("pointer-events-none absolute", className)}>
      <span className={cn(corner, "left-0 top-0 rounded-tl-[0.35em] border-l-[0.2em] border-t-[0.2em]")} />
      <span className={cn(corner, "right-0 top-0 rounded-tr-[0.35em] border-r-[0.2em] border-t-[0.2em]")} />
      <span className={cn(corner, "bottom-0 left-0 rounded-bl-[0.35em] border-b-[0.2em] border-l-[0.2em]")} />
      <span className={cn(corner, "bottom-0 right-0 rounded-br-[0.35em] border-b-[0.2em] border-r-[0.2em]")} />
    </span>
  );
}

const TAG_TONES = {
  calculation: "error",
  "vague-line": "warning",
  price: "warning",
  estimate: "estimate",
} as const satisfies Record<keyof typeof FINDING_TAGS, TagTone>;

/** Une pastille : le type du constat (en em, à l'échelle du téléphone). */
export function FindingTag({ kind }: { readonly kind: keyof typeof TAG_TONES }) {
  return (
    <Tag tone={TAG_TONES[kind]} size="em">
      {FINDING_TAGS[kind]}
    </Tag>
  );
}

/**
 * Un constat, sur une carte : la pastille et le montant, puis la ligne en
 * cause. Une erreur de calcul montre le montant imprimé barré et le bon à côté.
 */
export function FindingCard({ finding, className }: { readonly finding: PhoneFinding; readonly className?: string }) {
  const tag = finding.kind === "price" && finding.estimate ? "estimate" : finding.kind;
  return (
    <div className={cn("rounded-lg border border-rule bg-paper-raised px-[0.9em] py-[0.75em]", className)}>
      <div className="flex items-center justify-between gap-[0.6em]">
        <FindingTag kind={tag} />
        <FindingAmount finding={finding} />
      </div>
      <p className="mt-[0.5em] truncate text-[0.82em] leading-tight text-ink">
        {finding.label}
        <span className="text-ink-muted">{` · ${findingDetail(finding)}`}</span>
      </p>
    </div>
  );
}

function findingDetail(finding: PhoneFinding): string {
  if (finding.kind === "calculation") return finding.operation;
  if (finding.kind === "vague-line") return finding.note;
  return finding.shortSource;
}

function FindingAmount({ finding }: { readonly finding: PhoneFinding }) {
  const mono = "font-mono text-[0.85em] tabular-nums whitespace-nowrap";
  if (finding.kind === "calculation") {
    return (
      <span className={mono}>
        <s className="text-ink-muted decoration-pen-red decoration-[0.12em]">{finding.printed}</s>{" "}
        <span className="font-semibold text-ink">{finding.corrected}</span>
      </span>
    );
  }
  if (finding.kind === "vague-line") return <span className={cn(mono, "text-ink")}>{finding.amount}</span>;
  return (
    <span className={cn(mono, "font-semibold", finding.estimate ? "text-ink-muted" : "text-stamp-orange-strong")}>
      {finding.delta}
    </span>
  );
}
