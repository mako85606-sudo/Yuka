import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ogColors } from "@/config/og";
import { site } from "@/config/site";
import { contrastRatio, parseHex } from "@/lib/color";
import { durations } from "@/lib/motion";

/**
 * Garde-fous de la direction artistique : un bureau sombre, des feuilles
 * crème, pas de vert, et chaque couple encre/fond tient son contraste WCAG
 * sur la surface où il est posé.
 */

function source(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
}

const css = source("./globals.css");

/** Contenu du premier bloc `{ … }` qui suit le sélecteur donné. */
function blockAfter(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Bloc introuvable : ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  throw new Error(`Bloc non fermé : ${selector}`);
}

/** Tokens dont la valeur est une couleur hexadécimale. */
function hexTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    const [, name, value] = match;
    if (name && value) tokens[name] = value.toUpperCase();
  }
  return tokens;
}

const desk = hexTokens(blockAfter("\n:root"));
/** Une feuille hérite du bureau ce qu'elle ne redéfinit pas. */
const sheet = { ...desk, ...hexTokens(blockAfter(".surface-paper")) };

function token(surface: Record<string, string>, name: string): string {
  const value = surface[name];
  if (!value) throw new Error(`Token manquant : ${name}`);
  return value;
}

/** Couleur obtenue par un surligneur en mode « produit » (multiply) sur un fond. */
function multiply(top: string, bottom: string): string {
  const a = parseHex(top);
  const b = parseHex(bottom);
  return `#${a.map((channel, index) => Math.round((channel * (b[index] ?? 0)) / 255).toString(16).padStart(2, "0")).join("")}`;
}

describe("identité", () => {
  it("pose des feuilles crème sur un bureau sombre", () => {
    expect(token(desk, "--paper")).toBe("#221E19");
    expect(token(desk, "--paper-raised")).toBe("#F2ECDD");
    expect(token(sheet, "--paper-raised")).toBe("#F2ECDD");
    expect(token(sheet, "--ink")).toBe("#2B2119");
    expect(token(sheet, "--pen-red")).toBe("#D63A2B");
  });

  it("n'a plus de vert", () => {
    expect(css).not.toMatch(/green/i);
  });

  it("n'utilise jamais de noir pur", () => {
    for (const surface of [desk, sheet]) {
      expect(Object.values(surface)).not.toContain("#000000");
    }
  });

  it("n'a qu'un seul rouge sur le bureau, clair, pour le texte", () => {
    expect(token(desk, "--pen-red-strong")).toBe(token(desk, "--pen-red"));
    expect(token(desk, "--verdict-alert")).toBe(token(desk, "--pen-red"));
  });

  it("garde le jaune du surligneur, mélangé au papier", () => {
    expect(token(sheet, "--highlighter-mark")).toBe("#FFE45C");
    expect(source("../components/signature/HighlighterMark.tsx")).toContain("mix-blend-multiply");
  });

  it("donne au navigateur la couleur du bureau", () => {
    expect(site.themeColor).toBe(token(desk, "--paper"));
    expect(css).toMatch(/color-scheme:\s*dark;/);
  });

  it("donne à l'image de partage le bureau et les encres de la feuille", () => {
    const names: Record<keyof typeof ogColors, [Record<string, string>, string]> = {
      desk: [desk, "--paper"],
      paperRaised: [sheet, "--paper-raised"],
      ink: [sheet, "--ink"],
      inkMuted: [sheet, "--ink-muted"],
      penRed: [sheet, "--pen-red"],
      verdictOk: [sheet, "--verdict-ok"],
      verdictNegotiate: [sheet, "--verdict-negotiate"],
      verdictAlert: [sheet, "--verdict-alert"],
    };
    for (const [key, [surface, name]] of Object.entries(names)) {
      expect(ogColors[key as keyof typeof ogColors]).toBe(token(surface, name));
    }
  });

  it("n'écrit aucune durée en dur dans les gestes CSS : elles viennent de motion.ts", () => {
    const gestures = css.slice(css.indexOf("@keyframes ink-draw"));
    expect(gestures).not.toMatch(/\d+(\.\d+)?m?s\b/);
  });

  it("reprend en CSS la durée des micro-interactions de motion.ts", () => {
    const match = /--duration-micro:\s*(\d+)ms;/.exec(css);
    expect(Number(match?.[1])).toBe(durations.micro * 1000);
  });

  it("garde un grain à 4 % d'opacité au plus, sur le bureau comme sur la feuille", () => {
    const opacities = [...css.matchAll(/ opacity='([\d.]+)'/g)].map((match) => Number(match[1]));
    expect(opacities.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...opacities)).toBeLessThanOrEqual(0.04);
  });
});

describe("contrastes sur le bureau", () => {
  const ground = token(desk, "--paper");

  it("--ink se lit très confortablement (≥ 7:1)", () => {
    expect(contrastRatio(token(desk, "--ink"), ground)).toBeGreaterThanOrEqual(7);
  });

  it.each(["--ink-muted", "--pen-red", "--pen-red-strong", "--stamp-orange-strong", "--annotation-blue"])(
    "%s tient 4,5:1 pour du texte (AA)",
    (name) => {
      expect(contrastRatio(token(desk, name), ground)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(["--verdict-ok", "--verdict-negotiate", "--verdict-alert"])("%s tient 3:1 (gros texte)", (name) => {
    expect(contrastRatio(token(desk, name), ground)).toBeGreaterThanOrEqual(3);
  });

  it("garde lisible le texte d'un bouton principal (fond encre, texte bureau)", () => {
    expect(contrastRatio(token(desk, "--paper"), token(desk, "--ink"))).toBeGreaterThanOrEqual(7);
  });

  it("garde lisible un texte sélectionné (surligné, encre imprimée)", () => {
    expect(contrastRatio(token(desk, "--sheet-ink"), token(desk, "--highlighter"))).toBeGreaterThanOrEqual(7);
  });
});

describe("contrastes sur la feuille", () => {
  // La feuille, et son creux (champs, encadrés).
  const grounds = [token(sheet, "--paper-raised"), token(sheet, "--paper")];

  it("--ink se lit très confortablement (≥ 7:1)", () => {
    for (const ground of grounds) {
      expect(contrastRatio(token(sheet, "--ink"), ground)).toBeGreaterThanOrEqual(7);
    }
  });

  it.each(["--ink-muted", "--pen-red-strong", "--stamp-orange-strong", "--annotation-blue"])(
    "%s tient 4,5:1 pour du petit texte",
    (name) => {
      for (const ground of grounds) {
        expect(contrastRatio(token(sheet, name), ground)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it.each(["--pen-red", "--verdict-ok", "--verdict-negotiate", "--verdict-alert"])(
    "%s tient 3:1 (gros texte du tampon, traits porteurs de sens)",
    (name) => {
      for (const ground of grounds) {
        expect(contrastRatio(token(sheet, name), ground)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it("garde le texte lisible sous le surligneur", () => {
    const marked = multiply(token(sheet, "--highlighter-mark"), token(sheet, "--paper-raised"));
    expect(contrastRatio(token(sheet, "--ink"), marked)).toBeGreaterThanOrEqual(7);
  });

  it("garde lisible le texte d'un bouton posé sur la feuille", () => {
    expect(contrastRatio(token(sheet, "--paper"), token(sheet, "--ink"))).toBeGreaterThanOrEqual(7);
  });
});
