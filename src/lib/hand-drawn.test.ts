import { describe, expect, it } from "vitest";
import {
  connectorPath,
  HIGHLIGHTER_VIEWBOX,
  highlighterShape,
  inkSplatter,
  penLoop,
  smoothPath,
  stampTilt,
} from "@/lib/hand-drawn";

function numbersIn(path: string): number[] {
  return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe("smoothPath", () => {
  it("part du premier point et finit sur le dernier", () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d.endsWith("20 0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it("renvoie un chemin vide s'il manque des points", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 1, y: 1 }])).toBe("");
  });
});

describe("penLoop", () => {
  it("trace exactement la même boucle pour le même identifiant", () => {
    expect(penLoop("ligne-3", 320, 48).d).toBe(penLoop("ligne-3", 320, 48).d);
  });

  it("trace une boucle différente pour un autre identifiant", () => {
    expect(penLoop("ligne-3", 320, 48).d).not.toBe(penLoop("ligne-4", 320, 48).d);
  });

  it("reste autour de la boîte, avec un léger débord", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const { points } = penLoop(seed, 300, 44);
      for (const point of points) {
        expect(point.x).toBeGreaterThan(-0.12 * 300);
        expect(point.x).toBeLessThan(1.12 * 300);
        expect(point.y).toBeGreaterThan(-0.4 * 44);
        expect(point.y).toBeLessThan(1.4 * 44);
      }
    }
  });

  it("fait un peu plus d'un tour sans se refermer pile sur son départ", () => {
    const { start, end, points } = penLoop("ligne-7", 300, 44);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    expect(points.length).toBeGreaterThan(30);
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(0.45 * 300);
  });

  it("commence côté gauche, là où une main pose le stylo", () => {
    const { start } = penLoop("ligne-9", 300, 44);
    expect(start.x).toBeLessThan(0.2 * 300);
  });
});

describe("highlighterShape", () => {
  it("est stable pour une même graine et varie d'une ligne à l'autre", () => {
    expect(highlighterShape("x")).toBe(highlighterShape("x"));
    expect(highlighterShape("x")).not.toBe(highlighterShape("y"));
  });

  it("forme une surface fermée dans son repère", () => {
    const d = highlighterShape("forfait-divers");
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    const values = numbersIn(d);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(HIGHLIGHTER_VIEWBOX.width + 1);
    }
  });
});

describe("connectorPath", () => {
  it("relie bien la note à la ligne", () => {
    const { d, arrow } = connectorPath("note-1", { x: 30, y: 12 }, { x: 2, y: 8 });
    expect(d.startsWith("M30 12")).toBe(true);
    expect(d.endsWith("2 8")).toBe(true);
    expect(arrow).toContain("L2 8");
  });
});

describe("inkSplatter", () => {
  it("projette le nombre demandé de gouttes, toujours les mêmes", () => {
    const drops = inkSplatter("analyse-1", 8);
    expect(drops).toHaveLength(8);
    expect(inkSplatter("analyse-1", 8)).toEqual(drops);
    for (const drop of drops) {
      expect(drop.r).toBeGreaterThanOrEqual(1);
      expect(drop.r).toBeLessThan(3.2);
      expect(Math.hypot(drop.u, drop.v)).toBeGreaterThan(0.9);
      expect(Math.hypot(drop.dx, drop.dy)).toBeLessThanOrEqual(12);
    }
  });
});

describe("stampTilt", () => {
  it("penche le tampon entre −12° et −8°, toujours pareil pour un même id", () => {
    for (let i = 0; i < 200; i += 1) {
      const tilt = stampTilt(`analyse-${i}`);
      expect(tilt).toBeGreaterThanOrEqual(-12);
      expect(tilt).toBeLessThanOrEqual(-8);
      expect(stampTilt(`analyse-${i}`)).toBe(tilt);
    }
  });
});
