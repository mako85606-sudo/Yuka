"use client";

import { useSyncExternalStore } from "react";
import { contrastRatio } from "@/lib/color";

interface TokenSpec {
  readonly name: string;
  readonly usage: string;
  readonly origin: "brief" | "dérivé";
  /** Fond : on mesure l'encre posée dessus. Sinon : la couleur sur la feuille. */
  readonly surface?: boolean;
}

const TOKENS: readonly TokenSpec[] = [
  { name: "--paper", usage: "Fond, le bureau", origin: "brief", surface: true },
  { name: "--paper-raised", usage: "La feuille", origin: "brief", surface: true },
  { name: "--ink", usage: "Texte", origin: "brief" },
  { name: "--ink-muted", usage: "Texte secondaire", origin: "brief" },
  { name: "--pen-red", usage: "Erreurs, cercles", origin: "brief" },
  { name: "--highlighter", usage: "Lignes suspectes", origin: "brief", surface: true },
  { name: "--stamp-green", usage: "Verdict OK", origin: "brief" },
  { name: "--stamp-orange", usage: "Verdict à négocier", origin: "brief" },
  { name: "--annotation-blue", usage: "Notes de marge", origin: "brief" },
  { name: "--pen-red-strong", usage: "Petit texte d'erreur", origin: "dérivé" },
  { name: "--stamp-green-strong", usage: "Petit texte positif", origin: "dérivé" },
  { name: "--stamp-orange-strong", usage: "Petit texte « à négocier »", origin: "dérivé" },
  { name: "--verdict-negotiate", usage: "Encre du tampon orange", origin: "dérivé" },
  { name: "--highlighter-mark", usage: "Fond surligné (tamisé la nuit)", origin: "dérivé", surface: true },
];

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  media.addEventListener("change", onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

/** Valeur actuelle d'un token (elle change avec le thème). */
function useToken(name: string): string {
  return useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim().toUpperCase(),
    () => "",
  );
}

export function Swatches() {
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {TOKENS.map((token) => (
        <Swatch key={token.name} token={token} />
      ))}
    </ul>
  );
}

function Swatch({ token }: { readonly token: TokenSpec }) {
  const value = useToken(token.name);
  const ink = useToken("--ink");
  const sheet = useToken("--paper-raised");
  const ratio =
    value && ink && sheet
      ? token.surface
        ? contrastRatio(ink, value)
        : contrastRatio(value, sheet)
      : null;

  return (
    <li className="flex items-center gap-4">
      <span
        aria-hidden
        className="size-12 shrink-0 rounded-[4px] border border-rule"
        style={{ backgroundColor: `var(${token.name})` }}
      />
      <div className="min-w-0 text-sm">
        <p className="font-mono text-[0.8rem] text-ink">{token.name}</p>
        <p className="text-ink-muted">
          {token.usage} · <span className="italic">{token.origin}</span>
        </p>
        <p className="font-mono text-xs tabular-nums text-ink-muted">
          {value || "…"}
          {ratio ? ` · ${token.surface ? "encre dessus" : "sur la feuille"} ${ratio.toFixed(1)}:1` : ""}
        </p>
      </div>
    </li>
  );
}
