/**
 * Catégories de devis, unités et taxonomie des prestations.
 *
 * La taxonomie donne un identifiant stable à chaque prestation comparable
 * (« plomberie.chauffe-eau.remplacement.200l »). Le modèle range chaque ligne
 * lue dans l'une d'elles, ou dans aucune : les prix ne se comparent qu'entre
 * lignes du même identifiant. Elle est extensible : ajouter une entrée ne casse
 * rien, mais renommer un identifiant coupe la comparaison avec les lignes déjà
 * enregistrées sous l'ancien nom.
 *
 * Aucune donnée de prix ici : ce sont des catégories, pas des références.
 */

export const CATEGORIES = [
  "auto",
  "plomberie",
  "electricite",
  "chauffage",
  "travaux",
  "serrurerie",
  "demenagement",
  "sante",
  "autre",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  auto: "Garage",
  plomberie: "Plomberie",
  electricite: "Électricité",
  chauffage: "Chauffage",
  travaux: "Travaux",
  serrurerie: "Serrurerie",
  demenagement: "Déménagement",
  sante: "Santé",
  autre: "Autre",
};

/** Catégories que Loupe ne traite pas en V1 : ni analyse ni stockage. */
export const UNSUPPORTED_CATEGORIES: readonly Category[] = ["sante"];

export const QUOTE_UNITS = [
  "unite",
  "heure",
  "jour",
  "mois",
  "m2",
  "m3",
  "ml",
  "kg",
  "litre",
  "km",
  "forfait",
  "lot",
] as const;

export type QuoteUnit = (typeof QUOTE_UNITS)[number];

/** Unités telles qu'imprimées sur le devis reconstruit. */
export const UNIT_SYMBOLS: Record<QuoteUnit, string> = {
  unite: "u",
  heure: "h",
  jour: "j",
  mois: "mois",
  m2: "m²",
  m3: "m³",
  ml: "ml",
  kg: "kg",
  litre: "L",
  km: "km",
  forfait: "forfait",
  lot: "lot",
};

export interface TaxonomyItem {
  readonly id: string;
  readonly label: string;
  /** Unité dans laquelle cette prestation se compare. */
  readonly unit: QuoteUnit;
}

/**
 * « fourniture » : le matériel seul. « remplacement » ou « pose » : la
 * prestation complète (matériel et main-d'œuvre) quand le devis la facture
 * sur une seule ligne. Les identifiants `divers.*` valent pour toutes les
 * catégories.
 */
export const TAXONOMY = [
  // Garage
  { id: "auto.vidange.huile-filtre", label: "Vidange moteur avec filtre à huile", unit: "forfait" },
  { id: "auto.huile-moteur", label: "Huile moteur, au litre", unit: "litre" },
  { id: "auto.filtre.air", label: "Filtre à air", unit: "unite" },
  { id: "auto.filtre.habitacle", label: "Filtre d'habitacle", unit: "unite" },
  { id: "auto.filtre.carburant", label: "Filtre à carburant", unit: "unite" },
  { id: "auto.freinage.plaquettes.avant", label: "Jeu de plaquettes de frein avant", unit: "unite" },
  { id: "auto.freinage.plaquettes.arriere", label: "Jeu de plaquettes de frein arrière", unit: "unite" },
  { id: "auto.freinage.disques.avant", label: "Paire de disques de frein avant", unit: "unite" },
  { id: "auto.freinage.disques.arriere", label: "Paire de disques de frein arrière", unit: "unite" },
  { id: "auto.freinage.liquide", label: "Purge et liquide de frein", unit: "forfait" },
  { id: "auto.distribution.kit", label: "Kit de distribution (avec ou sans pompe à eau)", unit: "unite" },
  { id: "auto.embrayage.kit", label: "Kit d'embrayage", unit: "unite" },
  { id: "auto.volant-moteur", label: "Volant moteur (bimasse ou rigide)", unit: "unite" },
  { id: "auto.batterie", label: "Batterie", unit: "unite" },
  { id: "auto.pneu", label: "Pneu, à l'unité", unit: "unite" },
  { id: "auto.geometrie", label: "Contrôle et réglage de la géométrie", unit: "forfait" },
  { id: "auto.amortisseurs", label: "Paire d'amortisseurs", unit: "unite" },
  { id: "auto.climatisation.recharge", label: "Recharge de climatisation", unit: "forfait" },
  { id: "auto.diagnostic", label: "Diagnostic électronique", unit: "forfait" },
  { id: "auto.main-oeuvre", label: "Main-d'œuvre atelier", unit: "heure" },
  { id: "auto.ingredients", label: "Ingrédients et petites fournitures d'atelier", unit: "forfait" },

  // Plomberie
  {
    id: "plomberie.chauffe-eau.remplacement.100l",
    label: "Remplacement complet d'un chauffe-eau électrique 100 L",
    unit: "forfait",
  },
  {
    id: "plomberie.chauffe-eau.remplacement.150l",
    label: "Remplacement complet d'un chauffe-eau électrique 150 L",
    unit: "forfait",
  },
  {
    id: "plomberie.chauffe-eau.remplacement.200l",
    label: "Remplacement complet d'un chauffe-eau électrique 200 L",
    unit: "forfait",
  },
  {
    id: "plomberie.chauffe-eau.remplacement.300l",
    label: "Remplacement complet d'un chauffe-eau électrique 300 L",
    unit: "forfait",
  },
  { id: "plomberie.chauffe-eau.fourniture.100l", label: "Chauffe-eau électrique 100 L, matériel seul", unit: "unite" },
  { id: "plomberie.chauffe-eau.fourniture.150l", label: "Chauffe-eau électrique 150 L, matériel seul", unit: "unite" },
  { id: "plomberie.chauffe-eau.fourniture.200l", label: "Chauffe-eau électrique 200 L, matériel seul", unit: "unite" },
  { id: "plomberie.chauffe-eau.fourniture.300l", label: "Chauffe-eau électrique 300 L, matériel seul", unit: "unite" },
  { id: "plomberie.chauffe-eau.thermodynamique", label: "Chauffe-eau thermodynamique, matériel seul", unit: "unite" },
  { id: "plomberie.chauffe-eau.pose", label: "Pose d'un chauffe-eau (sans le matériel)", unit: "forfait" },
  { id: "plomberie.groupe-securite", label: "Groupe de sécurité", unit: "unite" },
  { id: "plomberie.wc.fourniture", label: "WC complet, matériel seul", unit: "unite" },
  { id: "plomberie.wc.remplacement", label: "Remplacement complet d'un WC", unit: "forfait" },
  { id: "plomberie.wc.mecanisme", label: "Mécanisme de chasse d'eau", unit: "unite" },
  { id: "plomberie.mitigeur", label: "Mitigeur ou robinet, matériel seul", unit: "unite" },
  { id: "plomberie.robinet-arret", label: "Robinet d'arrêt ou vanne", unit: "unite" },
  { id: "plomberie.fuite.recherche", label: "Recherche de fuite", unit: "forfait" },
  { id: "plomberie.fuite.reparation", label: "Réparation de fuite", unit: "forfait" },
  { id: "plomberie.debouchage", label: "Débouchage de canalisation", unit: "forfait" },
  { id: "plomberie.tuyauterie", label: "Tuyauterie (cuivre, PER, multicouche, PVC), au mètre", unit: "ml" },
  { id: "plomberie.main-oeuvre", label: "Main-d'œuvre plomberie", unit: "heure" },
  { id: "plomberie.deplacement", label: "Déplacement plomberie", unit: "forfait" },

  // Électricité
  { id: "electricite.tableau.remplacement", label: "Remplacement complet d'un tableau électrique", unit: "forfait" },
  { id: "electricite.tableau.fourniture", label: "Tableau électrique équipé, matériel seul", unit: "unite" },
  { id: "electricite.disjoncteur", label: "Disjoncteur divisionnaire", unit: "unite" },
  { id: "electricite.interrupteur-differentiel", label: "Interrupteur différentiel", unit: "unite" },
  { id: "electricite.prise.creation", label: "Création d'une prise de courant", unit: "unite" },
  { id: "electricite.prise.remplacement", label: "Remplacement d'une prise de courant", unit: "unite" },
  { id: "electricite.interrupteur", label: "Interrupteur ou va-et-vient", unit: "unite" },
  { id: "electricite.point-lumineux", label: "Création d'un point lumineux", unit: "unite" },
  { id: "electricite.cable", label: "Câble ou fil électrique, au mètre", unit: "ml" },
  { id: "electricite.goulotte", label: "Goulotte ou gaine, au mètre", unit: "ml" },
  { id: "electricite.mise-en-conformite", label: "Mise en conformité de l'installation", unit: "forfait" },
  { id: "electricite.depannage", label: "Recherche de panne ou dépannage", unit: "forfait" },
  { id: "electricite.main-oeuvre", label: "Main-d'œuvre électricité", unit: "heure" },
  { id: "electricite.deplacement", label: "Déplacement électricité", unit: "forfait" },

  // Chauffage
  { id: "chauffage.chaudiere.entretien", label: "Entretien annuel de chaudière", unit: "forfait" },
  { id: "chauffage.chaudiere.remplacement", label: "Remplacement complet d'une chaudière", unit: "forfait" },
  { id: "chauffage.chaudiere.fourniture", label: "Chaudière, matériel seul", unit: "unite" },
  { id: "chauffage.pac.air-eau", label: "Pompe à chaleur air/eau, installation complète", unit: "forfait" },
  { id: "chauffage.pac.air-air", label: "Climatisation réversible air/air, installation complète", unit: "forfait" },
  { id: "chauffage.radiateur.eau", label: "Radiateur à eau chaude", unit: "unite" },
  { id: "chauffage.radiateur.electrique", label: "Radiateur électrique", unit: "unite" },
  { id: "chauffage.robinet-thermostatique", label: "Robinet thermostatique", unit: "unite" },
  { id: "chauffage.thermostat", label: "Thermostat d'ambiance", unit: "unite" },
  { id: "chauffage.desembouage", label: "Désembouage du circuit", unit: "forfait" },
  { id: "chauffage.mise-en-service", label: "Mise en service", unit: "forfait" },
  { id: "chauffage.main-oeuvre", label: "Main-d'œuvre chauffage", unit: "heure" },
  { id: "chauffage.deplacement", label: "Déplacement chauffage", unit: "forfait" },

  // Serrurerie
  { id: "serrurerie.ouverture.claquee", label: "Ouverture de porte claquée", unit: "forfait" },
  { id: "serrurerie.ouverture.verrouillee", label: "Ouverture de porte fermée à clé", unit: "forfait" },
  { id: "serrurerie.cylindre", label: "Cylindre (barillet)", unit: "unite" },
  { id: "serrurerie.serrure.multipoints", label: "Serrure multipoints", unit: "unite" },
  { id: "serrurerie.serrure.simple", label: "Serrure en applique ou à larder", unit: "unite" },
  { id: "serrurerie.blindage", label: "Blindage de porte", unit: "forfait" },
  { id: "serrurerie.main-oeuvre", label: "Main-d'œuvre serrurerie", unit: "heure" },
  { id: "serrurerie.deplacement", label: "Déplacement serrurerie", unit: "forfait" },
  { id: "serrurerie.majoration", label: "Majoration de nuit, week-end ou urgence", unit: "forfait" },

  // Travaux
  { id: "travaux.peinture.murs", label: "Peinture des murs", unit: "m2" },
  { id: "travaux.peinture.plafond", label: "Peinture de plafond", unit: "m2" },
  { id: "travaux.enduit", label: "Enduit, ratissage ou préparation des supports", unit: "m2" },
  { id: "travaux.carrelage.sol", label: "Pose de carrelage au sol", unit: "m2" },
  { id: "travaux.faience", label: "Pose de faïence murale", unit: "m2" },
  { id: "travaux.parquet", label: "Pose de parquet ou de sol stratifié", unit: "m2" },
  { id: "travaux.cloison", label: "Cloison en plaques de plâtre", unit: "m2" },
  { id: "travaux.isolation", label: "Isolation (combles, murs, rampants)", unit: "m2" },
  { id: "travaux.demolition", label: "Démolition ou dépose", unit: "forfait" },
  { id: "travaux.salle-de-bain", label: "Rénovation complète de salle de bain", unit: "forfait" },
  { id: "travaux.main-oeuvre", label: "Main-d'œuvre travaux", unit: "heure" },

  // Déménagement
  { id: "demenagement.volume", label: "Déménagement, au mètre cube", unit: "m3" },
  { id: "demenagement.forfait", label: "Déménagement au forfait", unit: "forfait" },
  { id: "demenagement.monte-meuble", label: "Monte-meuble", unit: "forfait" },
  { id: "demenagement.emballage", label: "Emballage, cartons et protections", unit: "forfait" },
  { id: "demenagement.demontage", label: "Démontage et remontage du mobilier", unit: "forfait" },
  { id: "demenagement.garde-meuble", label: "Garde-meuble, par mois", unit: "mois" },
  { id: "demenagement.stationnement", label: "Autorisation de stationnement", unit: "forfait" },
  { id: "demenagement.assurance", label: "Assurance complémentaire", unit: "forfait" },

  // Toutes catégories
  { id: "divers.fournitures", label: "Petites fournitures et consommables", unit: "forfait" },
  { id: "divers.evacuation-dechets", label: "Évacuation des déchets ou gravats", unit: "forfait" },
  { id: "divers.remise", label: "Remise ou geste commercial", unit: "forfait" },
] as const satisfies readonly TaxonomyItem[];

export type TaxonomyId = (typeof TAXONOMY)[number]["id"];

export const TAXONOMY_IDS = TAXONOMY.map((item) => item.id) as [TaxonomyId, ...TaxonomyId[]];

const BY_ID = new Map<string, TaxonomyItem>(TAXONOMY.map((item) => [item.id, item]));

export function isTaxonomyId(value: string): value is TaxonomyId {
  return BY_ID.has(value);
}

export function taxonomyItem(id: TaxonomyId): TaxonomyItem {
  const item = BY_ID.get(id);
  if (!item) throw new Error(`Prestation inconnue : ${id}`);
  return item;
}
