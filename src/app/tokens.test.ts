import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { site } from "@/config/site";
import { contrastRatio } from "@/lib/color";

/**
 * Garde-fous de la direction artistique : les tokens du brief n'ont pas
 * bougé, les deux blocs du mode sombre sont identiques, et chaque couple
 * texte/fond tient son contraste WCAG dans les deux thèmes.
 */

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8").replace(
  /\r\n/g,
  "\n",
);

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

const light = hexTokens(blockAfter("\n:root"));
const darkSystem = hexTokens(blockAfter(':root:not([data-theme="light"])'));
const darkForced = hexTokens(blockAfter(':root[data-theme="dark"]'));

const themes = { clair: light, sombre: darkSystem } as const;

function token(theme: Record<string, string>, name: string): string {
  const value = theme[name];
  if (!value) throw new Error(`Token manquant : ${name}`);
  return value;
}

describe("tokens du brief", () => {
  it("reprennent exactement les valeurs du mode clair", () => {
    expect(light).toMatchObject({
      "--paper": "#F6F3EC",
      "--paper-raised": "#FFFDF8",
      "--ink": "#16140F",
      "--ink-muted": "#6B655A",
      "--pen-red": "#D7372B",
      "--highlighter": "#FFE45C",
      "--stamp-green": "#1E7F4A",
      "--stamp-orange": "#D9822B",
      "--annotation-blue": "#2C4E9B",
    });
  });

  it("ont un équivalent pour le bureau de nuit, défini à l'identique deux fois", () => {
    expect(Object.keys(darkSystem).sort()).toEqual(Object.keys(light).sort());
    expect(darkForced).toEqual(darkSystem);
  });

  it("n'utilisent jamais de noir pur pour le fond de nuit", () => {
    expect(token(darkSystem, "--paper")).not.toBe("#000000");
    expect(token(darkSystem, "--paper-raised")).not.toBe("#000000");
  });

  it("donnent au navigateur la même couleur de fond que le bureau", () => {
    expect(site.themeColor.light).toBe(token(light, "--paper"));
    expect(site.themeColor.dark).toBe(token(darkSystem, "--paper"));
  });

  it("gardent un grain papier à 4 % d'opacité au plus", () => {
    const opacities = [...css.matchAll(/opacity='([\d.]+)'/g)].map((match) => Number(match[1]));
    expect(opacities.length).toBeGreaterThan(0);
    expect(Math.max(...opacities)).toBeLessThanOrEqual(0.04);
  });
});

describe.each(Object.entries(themes))("contrastes, thème %s", (_name, theme) => {
  const backgrounds = [token(theme, "--paper"), token(theme, "--paper-raised")];

  it.each(["--ink"])("%s se lit très confortablement (≥ 7:1)", (name) => {
    for (const background of backgrounds) {
      expect(contrastRatio(token(theme, name), background)).toBeGreaterThanOrEqual(7);
    }
  });

  it.each([
    "--ink-muted",
    "--pen-red-strong",
    "--stamp-green-strong",
    "--stamp-orange-strong",
    "--annotation-blue",
  ])("%s tient 4,5:1 pour du petit texte", (name) => {
    for (const background of backgrounds) {
      expect(contrastRatio(token(theme, name), background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(["--verdict-ok", "--verdict-negotiate", "--verdict-alert", "--pen-red"])(
    "%s tient 3:1 (gros texte du tampon, traits porteurs de sens)",
    (name) => {
      for (const background of backgrounds) {
        expect(contrastRatio(token(theme, name), background)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it("garde le texte lisible sur une ligne surlignée", () => {
    expect(
      contrastRatio(token(theme, "--ink"), token(theme, "--highlighter-mark")),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
