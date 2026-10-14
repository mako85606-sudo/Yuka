/**
 * Le logo de Loupe : une tuile verte, une loupe à l'encre et une coche dans
 * le verre (« vérifié »). Une seule géométrie, dans un carré de 32 : le logo
 * de l'interface (`Logo`), l'image de partage et l'icône du site
 * (`src/app/icon.svg`, recopiée à la main ; tokens.test.ts vérifie ses
 * couleurs) la reprennent telle quelle.
 */
export const LOGO_VIEWBOX = 32;

export const logoMark = {
  /** La tuile : légèrement arrondie, comme les cartes. */
  tile: { size: 32, radius: 8 },
  /** Le verre de la loupe. */
  lens: { cx: 13.5, cy: 13.5, r: 7, strokeWidth: 2.6 },
  /** Le manche, en diagonale vers le coin bas droit. */
  handle: { d: "M18.9 18.9 24.6 24.6", strokeWidth: 3.4 },
  /** La coche, dans le verre. */
  tick: { d: "M10.4 13.9 12.7 16.1 16.7 11.6", strokeWidth: 2.2 },
} as const;
