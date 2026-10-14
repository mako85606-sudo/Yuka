import { describe, expect, it } from "vitest";
import { isBlurry, sharpness, toGrayscale } from "./image-sharpness";

const WIDTH = 400;
const HEIGHT = 560;

/** Une « page » : fond blanc, grandes marges, quelques lignes de « texte » noir net. */
function page(): Float32Array {
  const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4).fill(255);
  for (let line = 0; line < 12; line += 1) {
    const top = 80 + line * 30;
    for (let x = 60; x < 340; x += 1) {
      // Des « lettres » : traits verticaux de 2 px, espacés irrégulièrement.
      if (x % 7 > 1 && (x * 13 + line * 5) % 11 > 3) continue;
      for (let y = top; y < top + 10; y += 1) {
        const offset = (y * WIDTH + x) * 4;
        rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 20;
      }
    }
  }
  return toGrayscale(rgba, WIDTH, HEIGHT);
}

/** Flou de boîte, appliqué `passes` fois (s'approche d'un flou gaussien). */
function blur(gray: Float32Array, radius: number, passes = 2): Float32Array {
  let current = gray;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Float32Array(current.length);
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const sx = x + dx;
            const sy = y + dy;
            if (sx < 0 || sy < 0 || sx >= WIDTH || sy >= HEIGHT) continue;
            sum += current[sy * WIDTH + sx]!;
            count += 1;
          }
        }
        next[y * WIDTH + x] = sum / count;
      }
    }
    current = next;
  }
  return current;
}

describe("sharpness", () => {
  it("trouve nette une page de texte, même entourée de grandes marges blanches", () => {
    const score = sharpness(page(), WIDTH, HEIGHT);
    expect(isBlurry(score)).toBe(false);
  });

  it("trouve floue la même page, bougée ou mal mise au point", () => {
    const score = sharpness(blur(page(), 3), WIDTH, HEIGHT);
    expect(isBlurry(score)).toBe(true);
    expect(score).toBeLessThan(sharpness(blur(page(), 1), WIDTH, HEIGHT));
  });

  it("trouve « floue » une page vide : il n'y a rien à lire", () => {
    const blank = toGrayscale(new Uint8ClampedArray(WIDTH * HEIGHT * 4).fill(255), WIDTH, HEIGHT);
    expect(sharpness(blank, WIDTH, HEIGHT)).toBe(0);
    expect(isBlurry(0)).toBe(true);
  });
});
