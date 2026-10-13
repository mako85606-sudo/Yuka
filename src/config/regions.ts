/**
 * Régions administratives, pour comparer les prix entre devis d'une même
 * région (« région proche » du brief). « 20 » (Corse, quand seul le début du
 * code postal est connu) rejoint la Corse.
 */

export const REGIONS = {
  ARA: "Auvergne-Rhône-Alpes",
  BFC: "Bourgogne-Franche-Comté",
  BRE: "Bretagne",
  CVL: "Centre-Val de Loire",
  COR: "Corse",
  GES: "Grand Est",
  HDF: "Hauts-de-France",
  IDF: "Île-de-France",
  NOR: "Normandie",
  NAQ: "Nouvelle-Aquitaine",
  OCC: "Occitanie",
  PDL: "Pays de la Loire",
  PAC: "Provence-Alpes-Côte d'Azur",
  GUA: "Guadeloupe",
  MTQ: "Martinique",
  GUF: "Guyane",
  REU: "La Réunion",
  MAY: "Mayotte",
} as const;

export type RegionCode = keyof typeof REGIONS;

const MEMBERS: Record<RegionCode, readonly string[]> = {
  ARA: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  BFC: ["21", "25", "39", "58", "70", "71", "89", "90"],
  BRE: ["22", "29", "35", "56"],
  CVL: ["18", "28", "36", "37", "41", "45"],
  COR: ["20", "2A", "2B"],
  GES: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  HDF: ["02", "59", "60", "62", "80"],
  IDF: ["75", "77", "78", "91", "92", "93", "94", "95"],
  NOR: ["14", "27", "50", "61", "76"],
  NAQ: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  OCC: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  PDL: ["44", "49", "53", "72", "85"],
  PAC: ["04", "05", "06", "13", "83", "84"],
  GUA: ["971"],
  MTQ: ["972"],
  GUF: ["973"],
  REU: ["974"],
  MAY: ["976"],
};

const BY_DEPARTMENT = new Map<string, RegionCode>(
  (Object.entries(MEMBERS) as [RegionCode, readonly string[]][]).flatMap(([region, departments]) =>
    departments.map((department) => [department, region] as const),
  ),
);

export function regionOf(department: string | undefined): RegionCode | undefined {
  return department === undefined ? undefined : BY_DEPARTMENT.get(department);
}
