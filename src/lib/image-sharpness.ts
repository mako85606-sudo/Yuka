import { limits } from "@/config/limits";

/**
 * Netteté d'une photo de devis, mesurée dans le navigateur avant l'envoi : une
 * photo floue coûte une analyse pour rien. Mesure : la variance du laplacien
 * (les bords nets donnent de fortes variations d'un pixel à l'autre), calculée
 * zone par zone ; on retient les zones les plus nettes (90e centile) pour
 * qu'une page aux grandes marges blanches ne passe pas pour floue.
 */

const TILE = 48;
const PERCENTILE = 0.9;

/** Niveaux de gris (luminance) d'une image RGBA. */
export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    gray[index] = 0.299 * rgba[offset]! + 0.587 * rgba[offset + 1]! + 0.114 * rgba[offset + 2]!;
  }
  return gray;
}

/** Variance du laplacien (4 voisins) sur un rectangle de l'image. */
function tileVariance(gray: Float32Array, width: number, x0: number, y0: number, x1: number, y1: number): number {
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = Math.max(1, y0); y < y1; y += 1) {
    for (let x = Math.max(1, x0); x < x1; x += 1) {
      const center = gray[y * width + x]!;
      const laplacian =
        gray[(y - 1) * width + x]! + gray[(y + 1) * width + x]! + gray[y * width + x - 1]! + gray[y * width + x + 1]! - 4 * center;
      sum += laplacian;
      sumSquares += laplacian * laplacian;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSquares / count - mean * mean;
}

/** Netteté d'une image en niveaux de gris : 90e centile des variances par zone. */
export function sharpness(gray: Float32Array, width: number, height: number): number {
  const variances: number[] = [];
  for (let y = 0; y < height - 1; y += TILE) {
    for (let x = 0; x < width - 1; x += TILE) {
      variances.push(tileVariance(gray, width, x, y, Math.min(x + TILE, width - 1), Math.min(y + TILE, height - 1)));
    }
  }
  if (variances.length === 0) return 0;
  variances.sort((a, b) => a - b);
  return variances[Math.min(variances.length - 1, Math.floor(variances.length * PERCENTILE))]!;
}

export function isBlurry(score: number, threshold: number = limits.blurThreshold): boolean {
  return score < threshold;
}
