import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ogColors } from "@/config/og";
import { site } from "@/config/site";
import { contrastRatio } from "@/lib/color";
import { durations } from "@/lib/motion";

/**
 * Garde-fous de l'identité claire : une page blanche, un vert vif pour les
 * aplats et un vert foncé pour le texte, des rouges et des oranges réservés
 * aux constats ; chaque couple encre/fond tient son contraste WCAG.
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

const root = hexTokens(blockAfter("\n:root"));

function token(name: string): string {
  const value = root[name];
  if (!value) throw new Error(`Token manquant : ${name}`);
  return value;
}

/** Les fichiers d'interface, pour vérifier comment les tokens y sont employés. */
function interfaceSources(): { readonly path: string; readonly text: string }[] {
  const base = fileURLToPath(new URL("../", import.meta.url));
  return readdirSync(base, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".tsx"))
    .map((path) => ({ path, text: readFileSync(join(base, path), "utf8") }));
}

describe("identité", () => {
  it("pose une page blanche, une encre presque noire et un vert vif", () => {
    expect(token("--paper")).toBe("#FFFFFF");
    expect(token("--paper-raised")).toBe("#FFFFFF");
    expect(token("--ink")).toBe("#0E1B16");
    expect(token("--brand")).toBe("#17C26B");
  });

  it("n'utilise jamais de noir pur", () => {
    expect(Object.values(root)).not.toContain("#000000");
  });

  it("n'a ni dégradé ni grain", () => {
    expect(css).not.toMatch(/gradient\(/i);
    expect(css).not.toMatch(/grain/i);
  });

  it("reste légèrement arrondie : 10 px au plus", () => {
    const radii = [...css.matchAll(/--radius-[a-z]+:\s*(\d+)px;/g)].map((match) => Number(match[1]));
    expect(radii.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...radii)).toBeLessThanOrEqual(10);
  });

  it("donne au navigateur la couleur de la page", () => {
    expect(site.themeColor).toBe(token("--paper"));
    expect(css).toMatch(/color-scheme:\s*light;/);
  });

  it("donne à l'image de partage les couleurs du site", () => {
    const names: Record<keyof typeof ogColors, string> = {
      page: "--mist",
      card: "--paper-raised",
      ink: "--ink",
      inkMuted: "--ink-muted",
      brand: "--brand",
      brandStrong: "--brand-strong",
      brandSoft: "--brand-soft",
      warningSoft: "--warning-soft",
      errorSoft: "--error-soft",
      verdictOk: "--verdict-ok",
      verdictNegotiate: "--verdict-negotiate",
      verdictAlert: "--verdict-alert",
    };
    for (const [key, name] of Object.entries(names)) {
      expect(ogColors[key as keyof typeof ogColors]).toBe(token(name));
    }
  });

  it("dessine l'icône du site aux couleurs du logo : tuile à l'encre, loupe blanche, coche verte", () => {
    const icon = source("./icon.svg").toUpperCase();
    expect(icon).toContain(`FILL="${token("--ink")}"`);
    expect(icon).toContain(`STROKE="${token("--paper")}"`);
    expect(icon).toContain(`STROKE="${token("--brand")}"`);
  });

  it("n'écrit aucune durée en dur dans le CSS : elles viennent de motion.ts", () => {
    // Sans le miroir de durations.micro ni les images en data URI (« %23s » n'est pas une durée).
    const withoutMirror = css.replace(/--duration-micro:\s*\d+ms;/, "").replace(/url\("data:[^"]*"\)/g, "");
    expect(withoutMirror).not.toMatch(/\b\d+(\.\d+)?m?s\b/);
  });

  it("reprend en CSS la durée des micro-interactions de motion.ts", () => {
    const match = /--duration-micro:\s*(\d+)ms;/.exec(css);
    expect(Number(match?.[1])).toBe(durations.micro * 1000);
  });

  it("n'écrit jamais de texte en vert vif (illisible sur blanc) : le texte vert est `brand-strong`", () => {
    for (const { path, text } of interfaceSources()) {
      expect(text, path).not.toMatch(/\btext-brand(?![-\w])/);
    }
  });
});

describe("contrastes", () => {
  const page = token("--paper");
  const mist = token("--mist");

  it("--ink se lit très confortablement sur tous les fonds (≥ 7:1)", () => {
    for (const ground of [page, mist, token("--brand-soft"), token("--error-soft"), token("--warning-soft")]) {
      expect(contrastRatio(token("--ink"), ground)).toBeGreaterThanOrEqual(7);
    }
  });

  it.each([
    ["--ink-muted", []],
    ["--brand-strong", ["--brand-soft"]],
    ["--pen-red-strong", ["--error-soft"]],
    ["--stamp-orange-strong", ["--warning-soft"]],
    ["--annotation-blue", []],
  ] as const)("%s tient 4,5:1 pour du petit texte, sur la page, le gris-vert et sa pastille", (name, tints) => {
    for (const ground of [page, mist, ...tints.map(token)]) {
      expect(contrastRatio(token(name), ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(["--pen-red", "--stamp-orange", "--verdict-ok", "--verdict-negotiate", "--verdict-alert"])(
    "%s tient 3:1 (pictogrammes, traits, gros texte)",
    (name) => {
      for (const ground of [page, mist]) {
        expect(contrastRatio(token(name), ground)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it("garde lisible un bouton principal, comme la tuile du logo (texte blanc et pictogramme vert sur l'encre)", () => {
    expect(contrastRatio(token("--paper"), token("--ink"))).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(token("--brand"), token("--ink"))).toBeGreaterThanOrEqual(4.5);
  });

  it("garde lisible l'encre posée sur le vert vif (coches, étapes terminées)", () => {
    expect(contrastRatio(token("--ink"), token("--brand"))).toBeGreaterThanOrEqual(4.5);
  });

  it("garde lisible un texte sélectionné ou une ligne surlignée", () => {
    for (const name of ["--ink", "--ink-muted"]) {
      expect(contrastRatio(token(name), token("--highlighter-mark"))).toBeGreaterThanOrEqual(name === "--ink" ? 7 : 4.5);
    }
  });

  it("garde lisibles les pastilles posées sur une ligne surlignée", () => {
    const pairs = [
      ["--pen-red-strong", "--error-soft"],
      ["--stamp-orange-strong", "--warning-soft"],
      ["--brand-strong", "--brand-soft"],
    ] as const;
    for (const [ink, ground] of pairs) {
      expect(contrastRatio(token(ink), token(ground))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("n'écrit plus à la main : ni police manuscrite, ni tampon", () => {
    expect(css).not.toMatch(/font-hand|belle-aurore|stamp-texture/i);
  });
});
