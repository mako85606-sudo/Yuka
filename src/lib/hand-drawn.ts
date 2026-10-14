import { angles } from "@/lib/motion";
import { between, createRandom } from "@/lib/seeded-random";

/**
 * Géométrie « tracée à la main » : boucle au stylo rouge, coup de surligneur,
 * trait de note de marge, gouttes d'encre, inclinaison du tampon.
 *
 * Tout est déterministe : la même graine (l'identifiant de la ligne, du
 * problème ou de l'analyse) donne toujours le même tracé.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function format(point: Point): string {
  return `${round1(point.x)} ${round1(point.y)}`;
}

/** Courbe lisse passant par tous les points (Catmull-Rom → Bézier cubiques). */
export function smoothPath(points: readonly Point[]): string {
  const first = points[0];
  if (!first || points.length < 2) return "";
  const at = (index: number): Point =>
    points[Math.min(points.length - 1, Math.max(0, index))] ?? first;

  let d = `M${format(first)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${format(c1)} ${format(c2)} ${format(p2)}`;
  }
  return d;
}

export interface PenStroke {
  readonly d: string;
  readonly points: readonly Point[];
  /** Là où le stylo se pose (petit dépôt d'encre). */
  readonly start: Point;
  readonly end: Point;
}

/**
 * Boucle au stylo autour d'une boîte `width × height` (en px).
 *
 * Une superellipse plutôt qu'une ellipse parfaite : une main qui entoure une
 * ligne de texte trace un « stade » aux côtés plus plats. La boucle est
 * légèrement penchée, son rayon ondule, elle fait un peu plus d'un tour et ne
 * retombe pas exactement sur son point de départ.
 */
export function penLoop(seed: string, width: number, height: number): PenStroke {
  const random = createRandom(`pen-loop:${seed}`);
  const cx = width / 2 + between(random, -0.01, 0.01) * width;
  const cy = height / 2 + between(random, -0.04, 0.04) * height;
  const rx = (width / 2) * between(random, 0.97, 1.02);
  const ry = (height / 2) * between(random, 0.9, 1.05);
  const squareness = between(random, 2.5, 3.2);
  const tilt = between(random, -2, 2) * DEG;
  const startAngle = between(random, 165, 200) * DEG;
  const sweep = TAU + between(random, 0.3, 0.6);
  const drift = between(random, -0.015, 0.045);
  const waves = [1, 2, 3].map((harmonic) => ({
    harmonic,
    amplitude: between(random, 0.004, 0.016) / Math.sqrt(harmonic),
    phase: between(random, 0, TAU),
  }));

  const steps = 40;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    const theta = startAngle + sweep * progress;
    let radius = 1 + drift * progress;
    for (const wave of waves) {
      radius += wave.amplitude * Math.sin(wave.harmonic * theta + wave.phase);
    }
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const ex = rx * radius * Math.sign(cos) * Math.abs(cos) ** (2 / squareness);
    const ey = ry * radius * Math.sign(sin) * Math.abs(sin) ** (2 / squareness);
    points.push({
      x: cx + ex * Math.cos(tilt) - ey * Math.sin(tilt),
      y: cy + ex * Math.sin(tilt) + ey * Math.cos(tilt),
    });
  }

  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? start;
  return { d: smoothPath(points), points, start, end };
}

/** Repère du tracé de surligneur, étiré sur la ligne (preserveAspectRatio="none"). */
export const HIGHLIGHTER_VIEWBOX = { width: 100, height: 24 } as const;

/**
 * Coup de surligneur : bords haut et bas qui ondulent un peu, trait qui monte
 * ou descend légèrement, extrémités biseautées comme une pointe de feutre.
 */
export function highlighterShape(seed: string): string {
  const random = createRandom(`highlighter:${seed}`);
  const { width, height } = HIGHLIGHTER_VIEWBOX;
  const segments = 6;
  const left = between(random, 0.5, 2);
  const right = width - between(random, 0.5, 2.5);
  const chiselLeft = between(random, 1.5, 4);
  const chiselRight = between(random, -2.5, 2.5);
  const topBase = between(random, 2, 4);
  const bottomBase = height - between(random, 1.5, 3.5);
  const climb = between(random, -1.2, 1.2);

  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const progress = i / segments;
    const x = left + (right - left) * progress;
    const slope = climb * (progress - 0.5);
    const isFirst = i === 0;
    const isLast = i === segments;
    top.push({
      x: isFirst ? x + chiselLeft : isLast ? x + chiselRight : x,
      y: topBase + slope + between(random, -0.9, 0.9),
    });
    bottom.push({
      x: isLast ? x - chiselRight : x,
      y: bottomBase + slope + between(random, -0.9, 0.9),
    });
  }

  const bottomBack = smoothPath([...bottom].reverse()).replace(/^M/, "L");
  return `${smoothPath(top)} ${bottomBack} Z`;
}

export interface Connector {
  /** Le trait courbe. */
  readonly d: string;
  /** La petite pointe ouverte à l'arrivée. */
  readonly arrow: string;
}

/**
 * Trait courbe d'une note de marge vers sa ligne, terminé par une pointe
 * ouverte. `bend` choisit de quel côté la courbe se creuse.
 */
export function connectorPath(
  seed: string,
  from: Point,
  to: Point,
  bend: 1 | -1 = 1,
): Connector {
  const random = createRandom(`connector:${seed}`);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bow = length * between(random, 0.18, 0.3) * bend;
  const c1 = { x: from.x + dx * 0.25 + nx * bow, y: from.y + dy * 0.25 + ny * bow };
  const c2 = {
    x: from.x + dx * 0.7 + nx * bow * 0.7,
    y: from.y + dy * 0.7 + ny * bow * 0.7,
  };

  const tx = to.x - c2.x;
  const ty = to.y - c2.y;
  const tangent = Math.hypot(tx, ty) || 1;
  const ux = tx / tangent;
  const uy = ty / tangent;
  const size = Math.min(7, Math.max(4, length * 0.18));
  const spread = between(random, 0.42, 0.58);
  const wing = (angle: number): Point => ({
    x: to.x - size * (ux * Math.cos(angle) - uy * Math.sin(angle)),
    y: to.y - size * (uy * Math.cos(angle) + ux * Math.sin(angle)),
  });

  return {
    d: `M${format(from)} C${format(c1)} ${format(c2)} ${format(to)}`,
    arrow: `M${format(wing(spread))} L${format(to)} L${format(wing(-spread))}`,
  };
}

export interface InkDroplet {
  /** Position horizontale, en demi-largeurs du tampon depuis son centre. */
  readonly u: number;
  /** Position verticale, en demi-hauteurs du tampon depuis son centre. */
  readonly v: number;
  /** Rayon en px. */
  readonly r: number;
  /** Projection vers l'extérieur, en px. */
  readonly dx: number;
  readonly dy: number;
}

/** Gouttes d'encre projetées tout autour du tampon au moment de l'impact. */
function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function inkSplatter(seed: string, count: number): InkDroplet[] {
  const random = createRandom(`ink:${seed}`);
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * TAU + between(random, -0.3, 0.3);
    const reach = between(random, 0.95, 1.12);
    const travel = between(random, 4, 12);
    // Arrondis : ces valeurs finissent en styles en ligne, identiques au rendu serveur et client.
    return {
      u: roundTo(Math.cos(angle) * reach, 4),
      v: roundTo(Math.sin(angle) * reach, 4),
      r: roundTo(between(random, 1, 3.2), 2),
      dx: roundTo(Math.cos(angle) * travel, 2),
      dy: roundTo(Math.sin(angle) * travel, 2),
    };
  });
}

/** Inclinaison du tampon, entre −12° et −8°, stable pour une même graine. */
export function stampTilt(seed: string): number {
  return roundTo(between(createRandom(`stamp:${seed}`), angles.stampMin, angles.stampMax), 2);
}

/** Épaisseur d'un trait de stylo, en px. */
export interface InkWidth {
  readonly min: number;
  readonly max: number;
}

/** Un trait de stylo à largeur variable, et de quoi le dévoiler dans l'ordre du geste. */
export interface InkStroke {
  /** Contour rempli du trait. */
  readonly outline: string;
  /** Ligne médiane : le masque qui dévoile le trait la parcourt (pathLength = 1). */
  readonly centerline: string;
  /** Largeur du masque : de quoi couvrir le trait le plus épais. */
  readonly maskWidth: number;
}

/**
 * Trait de stylo à largeur variable le long des points donnés : fin quand le
 * stylo se pose, plein au milieu, effilé quand il se lève, avec une légère
 * ondulation de la pression. Le trait est un contour rempli (un `stroke` SVG
 * a une épaisseur constante).
 */
export function inkStroke(seed: string, points: readonly Point[], width: InkWidth): InkStroke {
  const random = createRandom(`ink-width:${seed}`);
  const phase = between(random, 0, TAU);
  const wobble = between(random, 0.08, 0.18);
  const count = points.length;
  const left: Point[] = [];
  const right: Point[] = [];
  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)] ?? point;
    const next = points[Math.min(count - 1, index + 1)] ?? point;
    const tx = next.x - previous.x;
    const ty = next.y - previous.y;
    const length = Math.hypot(tx, ty) || 1;
    const t = count > 1 ? index / (count - 1) : 0;
    // Pression : monte vite quand le stylo se pose, retombe quand il se lève.
    const pressure = Math.min(1, t / 0.12) ** 0.7 * Math.min(1, (1 - t) / 0.22) ** 0.8;
    const ripple = 1 + wobble * Math.sin(TAU * 2.5 * t + phase);
    const half = Math.max(width.min * 0.3, (width.min + (width.max - width.min) * pressure) * ripple) / 2;
    const nx = (-ty / length) * half;
    const ny = (tx / length) * half;
    left.push({ x: point.x + nx, y: point.y + ny });
    right.push({ x: point.x - nx, y: point.y - ny });
  });
  const back = smoothPath(right.reverse()).replace(/^M/, "L");
  return {
    outline: `${smoothPath(left)} ${back} Z`,
    centerline: smoothPath(points),
    maskWidth: round1(width.max * 1.6 + 2),
  };
}

/**
 * Soulignement au stylo sous une boîte `width × height` : un trait qui ondule
 * à peine, monte un peu, et se termine par un petit crochet.
 */
export function penUnderline(seed: string, width: number, height: number): Point[] {
  const random = createRandom(`underline:${seed}`);
  const climb = between(random, -0.12, 0.06) * height;
  const phase = between(random, 0, TAU);
  const steps = 9;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      x: width * (0.03 + 0.94 * t),
      y: height * 0.55 + climb * t + Math.sin(TAU * t + phase) * height * 0.08,
    });
  }
  const last = points[points.length - 1] ?? { x: width, y: height / 2 };
  points.push({ x: last.x + width * 0.012, y: last.y - height * between(random, 0.18, 0.3) });
  return points;
}

/** Coche au stylo dans une boîte `width × height` : petite descente, longue remontée. */
export function penTick(seed: string, width: number, height: number): Point[] {
  const random = createRandom(`tick:${seed}`);
  const jitter = () => between(random, -0.03, 0.03);
  return [
    { x: width * (0.06 + jitter()), y: height * (0.5 + jitter()) },
    { x: width * (0.2 + jitter()), y: height * (0.66 + jitter()) },
    { x: width * 0.36, y: height * (0.9 + jitter()) },
    { x: width * (0.52 + jitter()), y: height * (0.6 + jitter()) },
    { x: width * (0.74 + jitter()), y: height * (0.3 + jitter()) },
    { x: width * (0.96 + jitter()), y: height * (0.05 + jitter()) },
  ];
}
