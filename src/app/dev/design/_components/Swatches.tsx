"use client";

import { useSyncExternalStore } from "react";
import { contrastRatio } from "@/lib/color";

interface TokenSpec {
  readonly name: string;
  readonly usage: string;
  /** Fond : on mesure l'encre posée dessus. Sinon : la couleur sur le fond de sa surface. */
  readonly surface?: boolean;
}

const TOKENS: readonly TokenSpec[] = [
  { name: "--paper", usage: "La page", surface: true },
  { name: "--mist", usage: "Fond de section, panneau", surface: true },
  { name: "--ink", usage: "Texte" },
  { name: "--ink-muted", usage: "Texte secondaire" },
  { name: "--brand", usage: "Aplats : bouton principal (encre dessus)", surface: true },
  { name: "--brand-strong", usage: "Texte vert : l'économie" },
  { name: "--brand-soft", usage: "Fond vert pâle", surface: true },
  { name: "--pen-red-strong", usage: "Petit texte d'erreur" },
  { name: "--error-soft", usage: "Fond de pastille d'erreur", surface: true },
  { name: "--stamp-orange-strong", usage: "Petit texte « à négocier »" },
  { name: "--warning-soft", usage: "Fond de pastille d'attention", surface: true },
  { name: "--annotation-blue", usage: "Focus, rappels" },
  { name: "--highlighter-mark", usage: "Ligne surlignée", surface: true },
];

const noSubscription = () => () => {};

/** Valeur d'un token lue sur la page. */
function useToken(name: string): string {
  return useSyncExternalStore(
    noSubscription,
    () => getComputedStyle(document.body).getPropertyValue(name).trim().toUpperCase(),
    () => "",
  );
}

/** Les couleurs de l'identité, avec leur contraste mesuré sur la page (ou celui de l'encre posée dessus). */
export function Swatches() {
  return (
    <ul className="grid gap-x-8 gap-y-5 rounded-lg border border-rule p-6 sm:grid-cols-2 lg:grid-cols-3">
      {TOKENS.map((token) => (
        <Swatch key={token.name} token={token} />
      ))}
    </ul>
  );
}

function Swatch({ token }: { readonly token: TokenSpec }) {
  const value = useToken(token.name);
  const ink = useToken("--ink");
  const ground = useToken("--paper");
  const ratio =
    value.startsWith("#") && ink && ground ? (token.surface ? contrastRatio(ink, value) : contrastRatio(value, ground)) : null;

  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="size-11 shrink-0 rounded-md border border-rule"
        style={{ backgroundColor: `var(${token.name})` }}
      />
      <div className="min-w-0 text-sm">
        <p className="font-mono text-[0.8rem] text-ink">{token.name}</p>
        <p className="text-ink-muted">{token.usage}</p>
        <p className="font-mono text-xs tabular-nums text-ink-muted">
          {value || "…"}
          {ratio ? ` · ${token.surface ? "encre dessus" : "sur la page"} ${ratio.toFixed(1)}:1` : ""}
        </p>
      </div>
    </li>
  );
}
