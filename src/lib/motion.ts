import type { Transition } from "motion/react";
import type { CSSProperties } from "react";

/**
 * Langage de mouvement de Loupe.
 *
 * Toutes les durées (en secondes), courbes, springs, distances et angles
 * vivent ici. Aucun composant ne code une valeur d'animation en dur.
 *
 * Règles du brief :
 * - on n'anime que transform, opacity et pathLength (SVG) ;
 * - micro-interactions entre 150 et 250 ms ;
 * - une séquence ne dépasse pas 1,2 s par bloc ;
 * - en mouvement réduit, tout devient un fondu de 150 ms (ni secousse, ni balayage).
 */

export const durations = {
  /** Le seul fondu utilisé en mouvement réduit. */
  reducedFade: 0.15,
  /** Apparition quasi instantanée d'un trait d'encre (début du surligneur, du cercle). */
  appear: 0.08,
  /** Micro-interactions : survol, appui, retour « Copié ». */
  micro: 0.18,
  microSlow: 0.25,
  /** Une ligne extraite qui apparaît sur la feuille. */
  lineReveal: 0.22,
  /** Le surligneur balaie la ligne. */
  highlight: 0.28,
  /** Le stylo rouge entoure la ligne. */
  circle: 0.45,
  /** La note de marge et son trait courbe. */
  note: 0.22,
  /** Plafond du compteur de prix. */
  counter: 0.6,
  /** Un passage du faisceau de scan, du haut au bas de la feuille. */
  scanPass: 1.1,
  /** Micro-secousse de la feuille au coup de tampon. */
  shake: 0.12,
  /** Éclat d'encre autour du tampon. */
  inkBurst: 0.32,
  /** Le message de négociation s'affiche d'un bloc. */
  message: 0.3,
  /** Une demi-respiration de l'étape en cours (aller ou retour). */
  pulse: 0.9,
  /** Changement d'étape dans « Comment ça marche ». */
  storyStep: 0.35,
  /** Éclair de l'appareil photo, dans « Comment ça marche ». */
  flash: 0.3,
  /** Plafond d'une séquence, par bloc. */
  blockMax: 1.2,
} as const;

export type CubicBezier = readonly [number, number, number, number];

export const easings = {
  /** Le geste ralentit en arrivant : stylo, surligneur, apparitions. */
  out: [0.33, 1, 0.68, 1],
  /** Départ franc puis atterrissage long : compteurs. */
  outStrong: [0.16, 1, 0.3, 1],
  /** Accélère puis freine : faisceau de scan. */
  inOut: [0.65, 0, 0.35, 1],
  /** Vitesse constante : secousse, fondus en mouvement réduit. */
  linear: [0, 0, 1, 1],
  /** Accélère jusqu'à l'impact : le tampon qui s'abat. */
  fall: [0.55, 0, 1, 0.45],
  /** Main qui écrit : départ net, vitesse presque régulière. */
  write: [0.3, 0.2, 0.55, 1],
} as const satisfies Record<string, CubicBezier>;

/**
 * Springs nommés. `visualDuration` est le temps pour atteindre visuellement la
 * cible ; `bounce` règle le dépassement.
 */
export const springs = {
  /** Dépôt de la feuille sur le bureau. */
  gentle: { type: "spring", visualDuration: 0.6, bounce: 0.15 },
  /** Retours d'interface (boutons, bascules). */
  snappy: { type: "spring", visualDuration: 0.22, bounce: 0.1 },
  /** Le tampon : rigide, avec un léger dépassement (échelle mini ≈ 0,97). */
  stamp: { type: "spring", visualDuration: 0.22, bounce: 0.3 },
} as const satisfies Record<"gentle" | "snappy" | "stamp", Transition>;

/**
 * Instant (en s après le départ du tampon) où il touche la feuille : premier
 * passage du spring `stamp` à l'échelle 1. Vérifié par simulation dans
 * `motion.test.ts`. La secousse et l'éclat d'encre partent à ce moment.
 */
export const STAMP_IMPACT = 0.14;

/** Fractions d'un geste à partir desquelles le geste suivant démarre. */
export const beats = {
  /** La note de marge part quand le cercle est tracé aux quatre cinquièmes. */
  noteAfterCircle: 0.8,
  /** La pointe du trait de note apparaît quand le trait arrive à la ligne. */
  noteArrow: 0.75,
  /** La lecture commence quand la feuille a fait les trois quarts de son dépôt. */
  readingAfterDrop: 0.75,
} as const;

/**
 * Les illustrations sous la ligne de flottaison ne sont montées qu'à cette
 * distance de l'écran : la page s'affiche et répond plus vite au chargement.
 */
export const LAZY_MOUNT_MARGIN = "600px 0px";

/**
 * La feuille du hero : une seule séquence d'environ 3,5 s, jouée en CSS (elle
 * tourne sans JavaScript). Les lignes se tapent, le stylo entoure le montant
 * faux, la correction et la note s'écrivent, puis le tampon tombe.
 */
export const hero = {
  /** La page vient de s'afficher : la machine commence à taper. */
  start: 0.3,
  /** Une frappe : un caractère. */
  keystroke: 0.016,
  /** Plafond d'une ligne tapée. */
  typeMax: 0.42,
  /** Entre le début de deux lignes : elles se chevauchent, comme une imprimante pressée. */
  lineGap: 0.12,
  /** Le libellé, le détail et le montant d'une même ligne partent à quelques frappes d'écart. */
  columnGap: 0.06,
  /** Le stylo entoure le montant. */
  circle: 0.55,
  /** Fraction du cercle tracée quand la correction commence. */
  correctionAfterCircle: 0.85,
  /** Le chiffre corrigé, écrit à la main. */
  correction: 0.32,
  /** La note de marge part un peu après la correction. */
  noteAfterCorrection: 0.18,
  /** La note de marge, écrite à la main. */
  note: 0.55,
  /** Un temps entre deux gestes du correcteur. */
  breath: 0.12,
  /** Le correcteur relit avant de tamponner. */
  beforeStamp: 0.3,
  /** Le tampon s'abat : un seul impact, sans rebond. */
  stamp: 0.16,
  /**
   * Sur petit écran, les lignes sont déjà imprimées : la correction commence
   * dès que la ligne fautive est à l'écran, après ce court délai.
   */
  narrowStart: 0.25,
  /** Une ligne choisie au doigt ou à la souris : le stylo part aussitôt. */
  pickStart: 0.05,
} as const;

/** Retours qui restent affichés un moment, en secondes. */
export const holds = {
  /** « Copié » reste sur le bouton, puis il redevient « Copier ». */
  copied: 2,
} as const;

/** Distances en pixels. */
export const offsets = {
  sheetDropY: 40,
  /** La feuille corrigée est retirée vers le haut. */
  sheetExitY: -16,
  lineRiseY: 6,
  noteShiftX: -6,
  shakeX: 2,
  stampFromScale: 1.6,
  /** Le visuel de « Comment ça marche » glisse légèrement entre deux étapes. */
  storyShiftY: 10,
} as const;

/** Échelles. */
export const scales = {
  /** Le tampon du hero tombe d'un peu plus haut : de 1,3 fois sa taille à 1. */
  heroStampFrom: 1.3,
  /** Le devis vu dans le viseur, un peu plus loin. */
  storyPhoto: 0.94,
  /** Le devis recule pour laisser la place au message, l'erreur entourée restant visible. */
  storyMessage: 0.8,
} as const;

/** Angles en degrés. */
export const angles = {
  sheetDrop: 3,
  sheetRest: -0.6,
  sheetExit: -1.5,
  /** La feuille du hero, posée de travers sur le bureau. */
  heroSheet: 2.5,
  /** Le tampon du hero. */
  heroStamp: -6,
  /** Un chiffre corrigé, écrit à la main, un peu penché. */
  handNote: -4,
  /** Le devis tenu devant l'appareil photo, un peu de travers (« Comment ça marche »). */
  storyPhoto: 2.5,
  stampMin: -12,
  stampMax: -8,
} as const;

/** Décalages entre éléments d'une même séquence, en secondes. */
export const stagger = {
  lines: 0.05,
  linesMin: 0.04,
  linesMax: 0.06,
  prices: 0.12,
} as const;

/** Positions successives de la micro-secousse (px). */
export const shakeKeyframes: readonly number[] = [
  0,
  -offsets.shakeX,
  offsets.shakeX,
  -offsets.shakeX / 2,
  offsets.shakeX / 2,
  0,
];

/**
 * Mouvement réduit : un fondu de 150 ms pour l'opacité, tout le reste
 * (transform, pathLength) arrive directement à destination.
 */
export function reducedFade(delay = 0): Transition {
  return {
    default: { duration: 0, delay },
    opacity: { duration: durations.reducedFade, ease: easings.linear, delay },
  };
}

/** Transitions prêtes à l'emploi, une par geste de la chorégraphie. */
export const transitions = {
  sheetDrop: (delay = 0): Transition => ({
    default: { ...springs.gentle, delay },
    opacity: { duration: durations.micro, ease: easings.out, delay },
  }),
  sheetExit: { duration: durations.microSlow, ease: easings.inOut } satisfies Transition,
  sheetShadow: (delay = 0): Transition => ({
    duration: springs.gentle.visualDuration,
    ease: easings.out,
    delay,
  }),
  lineReveal: (delay = 0): Transition => ({
    duration: durations.lineReveal,
    ease: easings.out,
    delay,
  }),
  highlight: (delay = 0): Transition => ({
    scaleX: { duration: durations.highlight, ease: easings.out, delay },
    opacity: { duration: durations.appear, ease: easings.linear, delay },
  }),
  circle: (delay = 0): Transition => ({
    pathLength: { duration: durations.circle, ease: easings.out, delay },
    opacity: { duration: durations.appear, ease: easings.linear, delay },
  }),
  note: (delay = 0): Transition => ({
    default: { duration: durations.note, ease: easings.out, delay },
    pathLength: { duration: durations.note, ease: easings.out, delay },
  }),
  stamp: (delay = 0): Transition => ({
    scale: { ...springs.stamp, delay },
    opacity: { duration: durations.appear, ease: easings.linear, delay },
  }),
  inkBurst: (delay = 0): Transition => ({
    duration: durations.inkBurst,
    ease: easings.out,
    delay,
  }),
  counter: (delay = 0) => ({
    duration: durations.counter,
    ease: easings.outStrong,
    delay,
  }),
  shake: { duration: durations.shake, ease: easings.linear } satisfies Transition,
  scan: {
    duration: durations.scanPass,
    ease: easings.inOut,
    repeat: Infinity,
    repeatDelay: durations.micro,
  } satisfies Transition,
  message: (delay = 0): Transition => ({
    duration: durations.message,
    ease: easings.out,
    delay,
  }),
  micro: { duration: durations.micro, ease: easings.out } satisfies Transition,
  /** L'étape en cours respire : opacité seulement, en boucle. */
  pulse: {
    duration: durations.pulse,
    ease: easings.inOut,
    repeat: Infinity,
    repeatType: "reverse",
  } satisfies Transition,
  /** Quand une annotation s'insère, les lignes suivantes glissent (transform). */
  reflow: springs.snappy,
  fadeIn: (delay = 0): Transition => ({
    duration: durations.micro,
    ease: easings.out,
    delay,
  }),
  storyStep: { duration: durations.storyStep, ease: easings.out } satisfies Transition,
  flash: (delay = 0): Transition => ({
    duration: durations.flash,
    ease: easings.out,
    times: [0, 0.2, 1],
    delay,
  }),
} as const;

/** Une courbe de motion.ts écrite pour le CSS. */
export function cssEase(ease: CubicBezier): string {
  return `cubic-bezier(${ease.join(", ")})`;
}

/** Un geste joué en CSS : départ, durée et courbe, en variables (`--t`, `--d`, `--e`). */
export interface CssGesture {
  readonly start: number;
  readonly duration: number;
  readonly ease?: CubicBezier;
  /** Départ sur petit écran, s'il diffère (la feuille du hero n'y tape pas ses lignes). */
  readonly narrowStart?: number;
  /** Nombre de frappes, pour un texte tapé (`--steps`). */
  readonly steps?: number;
}

/**
 * Variables CSS d'un geste, lues par les animations de globals.css : les
 * durées restent écrites ici, jamais en dur dans une feuille de style.
 */
export function cssGesture({ start, duration, ease = easings.out, narrowStart, steps }: CssGesture): CSSProperties {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    "--t": `${round(start)}s`,
    "--d": `${round(duration)}s`,
    "--e": cssEase(ease),
    ...(narrowStart === undefined ? {} : { "--tn": `${round(narrowStart)}s` }),
    ...(steps === undefined ? {} : { "--steps": String(Math.max(1, Math.round(steps))) }),
  } as CSSProperties;
}
