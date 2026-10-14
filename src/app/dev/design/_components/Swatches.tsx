"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { contrastRatio } from "@/lib/color";

interface TokenSpec {
  readonly name: string;
  readonly usage: string;
  /** Fond : on mesure l'encre posée dessus. Sinon : la couleur sur le fond de sa surface. */
  readonly surface?: boolean;
}

const DESK_TOKENS: readonly TokenSpec[] = [
  { name: "--paper", usage: "Le bureau", surface: true },
  { name: "--ink", usage: "Texte" },
  { name: "--ink-muted", usage: "Texte secondaire" },
  { name: "--pen-red", usage: "Le seul rouge du bureau (titre)" },
  { name: "--stamp-orange", usage: "« À négocier »" },
  { name: "--annotation-blue", usage: "Focus, notes" },
];

const SHEET_TOKENS: readonly TokenSpec[] = [
  { name: "--paper-raised", usage: "La feuille", surface: true },
  { name: "--paper", usage: "Creux de la feuille (champ, encadré)", surface: true },
  { name: "--ink", usage: "Encre imprimée" },
  { name: "--ink-muted", usage: "Encre secondaire" },
  { name: "--pen-red", usage: "Stylo rouge : cercles, traits" },
  { name: "--pen-red-strong", usage: "Petit texte d'erreur" },
  { name: "--stamp-orange-strong", usage: "Petit texte « à négocier »" },
  { name: "--verdict-negotiate", usage: "Encre du tampon orange" },
  { name: "--annotation-blue", usage: "Notes de marge" },
  { name: "--highlighter-mark", usage: "Surligneur (mode produit)", surface: true },
];

const noSubscription = () => () => {};

/** Valeur d'un token lue sur le premier élément qui répond au sélecteur (le bureau, ou une feuille). */
function useToken(selector: string, name: string): string {
  return useSyncExternalStore(
    noSubscription,
    () => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).getPropertyValue(name).trim().toUpperCase() : "";
    },
    () => "",
  );
}

/** Les encres du bureau et celles de la feuille, avec leur contraste mesuré. */
export function Swatches() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <SwatchGroup title="Sur le bureau" tokens={DESK_TOKENS} />
      <SwatchGroup title="Sur la feuille" tokens={SHEET_TOKENS} sheet />
    </div>
  );
}

function SwatchGroup({
  title,
  tokens,
  sheet = false,
}: {
  readonly title: string;
  readonly tokens: readonly TokenSpec[];
  readonly sheet?: boolean;
}) {
  return (
    <div className={cn("rounded-[3px] p-5", sheet ? "surface-paper sheet-shadow-rest" : "border border-rule")}>
      <p className="font-mono text-label uppercase text-ink-muted">{title}</p>
      <ul className="mt-4 grid gap-y-4 sm:grid-cols-2 sm:gap-x-6">
        {tokens.map((token) => (
          <Swatch key={`${title}-${token.name}`} token={token} sheet={sheet} />
        ))}
      </ul>
    </div>
  );
}

function Swatch({ token, sheet }: { readonly token: TokenSpec; readonly sheet: boolean }) {
  const selector = sheet ? ".surface-paper" : "body";
  const value = useToken(selector, token.name);
  const ink = useToken(selector, "--ink");
  const ground = useToken(selector, sheet ? "--paper-raised" : "--paper");
  const ratio =
    value.startsWith("#") && ink && ground
      ? token.surface
        ? contrastRatio(ink, value)
        : contrastRatio(value, ground)
      : null;

  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={cn("size-10 shrink-0 rounded-[3px] border border-rule", token.name === "--highlighter-mark" && "mix-blend-multiply")}
        style={{ backgroundColor: `var(${token.name})` }}
      />
      <div className="min-w-0 text-sm">
        <p className="font-mono text-[0.8rem] text-ink">{token.name}</p>
        <p className="text-ink-muted">{token.usage}</p>
        <p className="font-mono text-xs tabular-nums text-ink-muted">
          {value || "…"}
          {ratio ? ` · ${token.surface ? "encre dessus" : "sur le fond"} ${ratio.toFixed(1)}:1` : ""}
        </p>
      </div>
    </li>
  );
}
