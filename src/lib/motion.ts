import type { Transition } from "motion/react";

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
  /** Une pièce qui tombe du devis jusqu'au compteur d'économie. */
  coinFall: 0.72,
  /** Le cercle d'encre qui s'élargit sous le tampon (démo de la landing). */
  inkRing: 0.42,
  /** Un mot du message de la démo qui apparaît. */
  wordReveal: 0.22,
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
  /** Accélère comme une chute : les pièces qui tombent. */
  fall: [0.55, 0, 1, 0.45],
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

/** Boucle de démo de la landing. */
export const demoLoop = {
  /** Temps laissé pour lire le devis corrigé avant de passer au suivant (s). */
  hold: 3.6,
  /** Pièces qui tombent au plus, pour un devis à négocier. */
  coins: 8,
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
  /** La feuille de la démo arrive d'un peu plus haut, comme lancée sur le bureau. */
  sheetTossY: -36,
  /** Petit rebond d'une pièce avant sa chute. */
  coinHopY: -14,
  /** Dérive latérale maximale d'une pièce pendant sa chute. */
  coinDriftX: 14,
  /** Le visuel de « Comment ça marche » glisse légèrement entre deux étapes. */
  storyShiftY: 10,
} as const;

/** Échelles. */
export const scales = {
  /** La feuille lancée arrive un peu plus près, puis se pose. */
  sheetToss: 1.06,
  /** Cercle d'encre sous le tampon : de 0,6 à 1,9 fois sa taille. */
  inkRingFrom: 0.6,
  inkRingTo: 1.9,
  /** Le compteur d'économie se gonfle quand la dernière pièce arrive. */
  pocketPop: 1.06,
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
  /** La feuille lancée tourne de 9° avant de se poser. */
  sheetToss: 9,
  /** Une pièce tourne sur elle-même en tombant. */
  coinSpin: 220,
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
  /** Entre deux pièces qui tombent. */
  coins: 0.06,
  /** Entre deux mots du message de la démo. */
  words: 0.025,
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
  /** Une pièce : petit rebond, puis chute accélérée ; elle disparaît en arrivant. */
  coinFall: (delay = 0): Transition => ({
    x: { duration: durations.coinFall, ease: easings.out, delay },
    y: { duration: durations.coinFall, ease: [easings.out, easings.fall], times: [0, 0.25, 1], delay },
    rotate: { duration: durations.coinFall, ease: easings.linear, delay },
    opacity: { duration: durations.coinFall, ease: easings.linear, times: [0, 0.08, 0.96, 1], delay },
  }),
  /** Le cercle s'élargit en s'effaçant, puis reprend sa taille, invisible (rien ne déborde). */
  inkRing: (delay = 0): Transition => ({
    scale: { duration: durations.inkRing, ease: easings.out, times: [0, 0.98, 1], delay },
    opacity: { duration: durations.inkRing, ease: easings.out, times: [0, 0.3, 0.98, 1], delay },
  }),
  word: (delay = 0): Transition => ({
    duration: durations.wordReveal,
    ease: easings.out,
    delay,
  }),
  /** Le stylo souligne le montant de l'économie. */
  underline: (delay = 0): Transition => ({
    pathLength: { duration: durations.highlight, ease: easings.out, delay },
    opacity: { duration: durations.appear, ease: easings.linear, delay },
  }),
  /** Aller-retour d'échelle (trois valeurs) : une tween, un spring n'en accepte que deux. */
  pocketPop: (delay = 0): Transition => ({ duration: durations.microSlow, ease: easings.out, delay }),
  storyStep: { duration: durations.storyStep, ease: easings.out } satisfies Transition,
  flash: (delay = 0): Transition => ({
    duration: durations.flash,
    ease: easings.out,
    times: [0, 0.2, 1],
    delay,
  }),
} as const;
