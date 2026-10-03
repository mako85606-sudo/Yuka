import type { Category, QuoteUnit, TaxonomyId } from "@/config/taxonomy";
import type { ExtractedLine, Extraction, ExtractionIssuer } from "@/lib/extraction/schema";

/**
 * Devis fictifs du jeu de test, d'où sont générés les PDF
 * (`npm run fixtures:generate`) et leur vérité terrain JSON.
 *
 * Entreprises, clients, adresses, numéros et assureurs sont inventés
 * (téléphones dans les plages réservées à la fiction, e-mails en
 * `.example`). Chaque PDF porte la mention « exemple fictif ».
 *
 * Les montants imprimés sont recopiés tels quels dans la vérité terrain,
 * erreurs comprises : c'est ce que le modèle doit lire, pas ce qu'il aurait
 * fallu écrire. Les erreurs volontaires sont listées dans `knownIssues` et
 * gardées par `definitions.test.ts`.
 */

export interface FixtureLine {
  /** Désignation imprimée. */
  readonly label: string;
  readonly quantity: number;
  readonly unit: QuoteUnit;
  /** Unité telle qu'imprimée (« u », « h », « forfait », « ml »). */
  readonly printedUnit: string;
  readonly unitPriceHT: number;
  /** Total HT imprimé, éventuellement faux. */
  readonly totalHT: number;
  /** Prestation attendue dans la taxonomie, s'il y en a une. */
  readonly canonicalItem?: TaxonomyId;
}

export type KnownIssue =
  | { readonly kind: "line-calculation"; readonly line: number; readonly expected: number; readonly printed: number }
  | { readonly kind: "total-ht"; readonly expected: number; readonly printed: number }
  | { readonly kind: "total-ttc"; readonly expected: number; readonly printed: number }
  | { readonly kind: "missing-mention"; readonly mention: keyof ExtractionIssuer }
  | { readonly kind: "vague-line"; readonly line: number }
  | { readonly kind: "high-deposit"; readonly percent: number }
  | { readonly kind: "door-to-door" };

export type FixtureFont = "helvetica" | "times" | "courier";

export interface QuoteFixture {
  readonly id: string;
  readonly description: string;
  readonly category: Category;
  readonly style: { readonly font: FixtureFont; readonly accent: readonly [number, number, number] };
  readonly company: {
    readonly name: string;
    readonly legal?: string;
    readonly street?: string;
    readonly city: string;
    readonly phone?: string;
    readonly email?: string;
    readonly siret?: string;
    readonly vatNumber?: string;
    readonly insurance?: string;
    readonly qualification?: string;
  };
  readonly client: { readonly name: string; readonly street: string; readonly city: string };
  readonly worksite?: { readonly street: string; readonly city: string };
  /** Lignes d'information sous le client (véhicule, référence de dossier…). */
  readonly extraInfo?: readonly string[];
  readonly number: string;
  /** Date du devis, AAAA-MM-JJ. */
  readonly date: string;
  readonly validity?: { readonly days?: number; readonly until?: string };
  readonly subject: string;
  /** Taux de TVA de toutes les lignes, en pourcentage. */
  readonly vatRate: number;
  readonly lines: readonly FixtureLine[];
  /** Totaux imprimés, éventuellement faux. */
  readonly totals: { readonly totalHT: number; readonly totalVAT: number; readonly totalTTC: number };
  readonly deposit?: { readonly percent?: number; readonly amount: number };
  readonly paymentTerms?: string;
  readonly delay?: { readonly text: string; readonly days: number };
  /** Contrat conclu hors établissement : mention et bordereau de rétractation. */
  readonly doorToDoor?: boolean;
  /** Ajoute une page de conditions générales. */
  readonly conditionsPage?: boolean;
  /** Ce que Loupe doit faire de ce document. */
  readonly expectedOutcome: "extracted" | "health";
  readonly knownIssues: readonly KnownIssue[];
}

export const quoteFixtures: readonly QuoteFixture[] = [
  {
    id: "01-plomberie-chauffe-eau",
    category: "plomberie",
    description: "Plomberie, remplacement d'un chauffe-eau : devis correct et complet.",
    style: { font: "helvetica", accent: [0.13, 0.33, 0.6] },
    company: {
      name: "Plomberie Ravel & Fils",
      legal: "SARL au capital de 8 000 €",
      street: "14 rue des Tanneurs",
      city: "69007 Lyon",
      phone: "04 65 71 20 14",
      email: "contact@plomberie-ravel.example",
      siret: "900 123 456 00017",
      vatNumber: "FR 27 900123456",
      insurance:
        "Assurance décennale : Mutuelle Artisane du Rhône, contrat n° MAR-55120, couverture France métropolitaine.",
    },
    client: { name: "M. Julien Morel", street: "8 impasse des Lilas", city: "69003 Lyon" },
    number: "D-2026-0917",
    date: "2026-09-14",
    validity: { days: 30 },
    subject: "Remplacement d'un chauffe-eau électrique 200 L",
    vatRate: 10,
    lines: [
      {
        label: "Chauffe-eau électrique vertical 200 L, classe C",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 689,
        totalHT: 689,
        canonicalItem: "plomberie.chauffe-eau.fourniture.200l",
      },
      {
        label: "Groupe de sécurité NF 3/4\"",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 42.5,
        totalHT: 42.5,
        canonicalItem: "plomberie.groupe-securite",
      },
      {
        label: "Raccords, flexibles et petites fournitures",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 35,
        totalHT: 35,
        canonicalItem: "divers.fournitures",
      },
      {
        label: "Main-d'œuvre : dépose de l'ancien appareil, pose et mise en service",
        quantity: 3,
        unit: "heure",
        printedUnit: "h",
        unitPriceHT: 58,
        totalHT: 174,
        canonicalItem: "plomberie.main-oeuvre",
      },
      {
        label: "Déplacement",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 30,
        totalHT: 30,
        canonicalItem: "plomberie.deplacement",
      },
      {
        label: "Évacuation et recyclage de l'ancien chauffe-eau",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 25,
        totalHT: 25,
        canonicalItem: "divers.evacuation-dechets",
      },
    ],
    totals: { totalHT: 995.5, totalVAT: 99.55, totalTTC: 1095.05 },
    deposit: { percent: 30, amount: 328.52 },
    paymentTerms: "Solde à la fin des travaux, par virement ou par chèque.",
    delay: { text: "Intervention sous 10 jours après acceptation du devis.", days: 10 },
    expectedOutcome: "extracted",
    knownIssues: [],
  },
  {
    id: "02-garage-freins",
    category: "auto",
    description:
      "Garage, freins avant : une ligne mal calculée et un total TTC faux (erreurs volontaires).",
    style: { font: "courier", accent: [0.55, 0.1, 0.1] },
    company: {
      name: "Garage du Pont de Pierre",
      legal: "SAS au capital de 15 000 €",
      street: "27 avenue Thiers",
      city: "33100 Bordeaux",
      phone: "05 36 49 12 34",
      email: "atelier@garage-pontdepierre.example",
      siret: "900 234 567 00012",
      vatNumber: "FR 61 900234567",
    },
    client: { name: "Mme Claire Fontaine", street: "5 rue Sainte-Catherine", city: "33000 Bordeaux" },
    extraInfo: ["Véhicule : Peugeot 308 1.2 PureTech", "Immatriculation : AB-123-CD · 98 450 km"],
    number: "G-26-0388",
    date: "2026-09-22",
    validity: { days: 15 },
    subject: "Remplacement des freins avant",
    vatRate: 20,
    lines: [
      {
        label: "Plaquettes de frein avant (jeu)",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 54.9,
        totalHT: 54.9,
        canonicalItem: "auto.freinage.plaquettes.avant",
      },
      {
        label: "Disques de frein avant (paire)",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 189.9,
        totalHT: 198.9,
        canonicalItem: "auto.freinage.disques.avant",
      },
      {
        label: "Purge et remplacement du liquide de frein",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 39,
        totalHT: 39,
        canonicalItem: "auto.freinage.liquide",
      },
      {
        label: "Main-d'œuvre atelier",
        quantity: 1.5,
        unit: "heure",
        printedUnit: "h",
        unitPriceHT: 72,
        totalHT: 108,
        canonicalItem: "auto.main-oeuvre",
      },
      {
        label: "Ingrédients et produits d'atelier",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 9.8,
        totalHT: 9.8,
        canonicalItem: "auto.ingredients",
      },
    ],
    totals: { totalHT: 410.6, totalVAT: 82.12, totalTTC: 502.72 },
    paymentTerms: "Paiement à la restitution du véhicule.",
    expectedOutcome: "extracted",
    knownIssues: [
      { kind: "line-calculation", line: 2, expected: 189.9, printed: 198.9 },
      { kind: "total-ttc", expected: 492.72, printed: 502.72 },
    ],
  },
  {
    id: "03-electricite-tableau",
    category: "electricite",
    description: "Électricité, tableau et prises : devis correct, validité en date, acompte en euros.",
    style: { font: "times", accent: [0.2, 0.2, 0.2] },
    company: {
      name: "Électricité Lemoine",
      legal: "Entrepreneur individuel",
      street: "3 rue de la Fosse",
      city: "44000 Nantes",
      phone: "02 61 91 44 03",
      email: "lemoine.elec@exemple.example",
      siret: "900 345 678 00025",
      insurance:
        "Garantie décennale souscrite auprès de l'Assurance des Bâtisseurs de l'Ouest, police n° ABO-2291-E.",
    },
    client: { name: "M. et Mme Bernard", street: "17 boulevard Guist'hau", city: "44000 Nantes" },
    number: "2026-118",
    date: "2026-09-30",
    validity: { until: "2026-10-30" },
    subject: "Remplacement du tableau électrique et ajout de prises",
    vatRate: 10,
    lines: [
      {
        label: "Tableau électrique 3 rangées équipé (interrupteurs différentiels 30 mA, disjoncteurs)",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 620,
        totalHT: 620,
        canonicalItem: "electricite.tableau.fourniture",
      },
      {
        label: "Main-d'œuvre : dépose de l'ancien tableau, pose et raccordement",
        quantity: 6,
        unit: "heure",
        printedUnit: "h",
        unitPriceHT: 52,
        totalHT: 312,
        canonicalItem: "electricite.main-oeuvre",
      },
      {
        label: "Création de prises de courant 16 A",
        quantity: 4,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 68,
        totalHT: 272,
        canonicalItem: "electricite.prise.creation",
      },
      {
        label: "Câble R2V 3G2,5 mm²",
        quantity: 25,
        unit: "ml",
        printedUnit: "ml",
        unitPriceHT: 2.4,
        totalHT: 60,
        canonicalItem: "electricite.cable",
      },
      {
        label: "Goulotte PVC 40 × 16",
        quantity: 12,
        unit: "ml",
        printedUnit: "ml",
        unitPriceHT: 4.5,
        totalHT: 54,
        canonicalItem: "electricite.goulotte",
      },
      {
        label: "Attestation de conformité (Consuel)",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 180,
        totalHT: 180,
      },
      {
        label: "Déplacement",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 35,
        totalHT: 35,
        canonicalItem: "electricite.deplacement",
      },
    ],
    totals: { totalHT: 1533, totalVAT: 153.3, totalTTC: 1686.3 },
    deposit: { amount: 300 },
    paymentTerms: "Acompte à la commande, solde à réception de la facture.",
    delay: { text: "Début des travaux sous 3 semaines après accord.", days: 21 },
    expectedOutcome: "extracted",
    knownIssues: [],
  },
  {
    id: "04-serrurerie-urgence",
    category: "serrurerie",
    description:
      "Serrurerie d'urgence : une ligne mal calculée, un total HT qui ne correspond pas aux lignes, SIRET et validité absents, une ligne vague (erreurs volontaires).",
    style: { font: "helvetica", accent: [0.1, 0.1, 0.1] },
    company: {
      name: "Serrurerie Express Provence",
      street: "48 boulevard National",
      city: "13003 Marseille",
      phone: "04 65 71 56 78",
    },
    client: { name: "Mme Sofia Haddad", street: "9 rue Paradis", city: "13001 Marseille" },
    number: "SE-1453",
    date: "2026-09-27",
    subject: "Ouverture de porte et remplacement du cylindre",
    vatRate: 20,
    lines: [
      {
        label: "Ouverture de porte claquée (sans dégât)",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 149,
        totalHT: 149,
        canonicalItem: "serrurerie.ouverture.claquee",
      },
      {
        label: "Cylindre de sécurité européen A2P 1 étoile",
        quantity: 2,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 64.5,
        totalHT: 139,
        canonicalItem: "serrurerie.cylindre",
      },
      {
        label: "Déplacement urgence",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 79,
        totalHT: 79,
        canonicalItem: "serrurerie.deplacement",
      },
      {
        label: "Majoration intervention de nuit (après 20 h)",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 60,
        totalHT: 60,
        canonicalItem: "serrurerie.majoration",
      },
      {
        label: "Forfait divers",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 45,
        totalHT: 45,
      },
    ],
    totals: { totalHT: 462, totalVAT: 92.4, totalTTC: 554.4 },
    paymentTerms: "Paiement comptant à l'intervention.",
    expectedOutcome: "extracted",
    knownIssues: [
      { kind: "line-calculation", line: 2, expected: 129, printed: 139 },
      { kind: "total-ht", expected: 472, printed: 462 },
      { kind: "missing-mention", mention: "hasSiret" },
      { kind: "missing-mention", mention: "hasValidityDate" },
      { kind: "vague-line", line: 5 },
    ],
  },
  {
    id: "05-chauffage-pac-domicile",
    category: "chauffage",
    description:
      "Chauffage, pompe à chaleur vendue à domicile : calculs justes, acompte de 50 %, bordereau de rétractation en page 2.",
    style: { font: "helvetica", accent: [0.12, 0.45, 0.28] },
    company: {
      name: "ThermiConfort Occitanie",
      legal: "SAS au capital de 20 000 €",
      street: "8 allée Jean-Jaurès",
      city: "31000 Toulouse",
      phone: "05 36 49 77 10",
      email: "devis@thermiconfort.example",
      siret: "900 456 789 00031",
      vatNumber: "FR 09 900456789",
      insurance:
        "Assurance responsabilité civile et décennale : Garantie Sud Construction, contrat n° GSC-71-4410.",
      qualification: "Entreprise qualifiée RGE QualiPAC (certificat fictif n° 00-0000).",
    },
    client: { name: "M. Paul Girard", street: "22 chemin de la Ramée", city: "31170 Tournefeuille" },
    number: "TC-2026-0571",
    date: "2026-09-18",
    validity: { days: 60 },
    subject: "Installation d'une pompe à chaleur air/eau",
    vatRate: 5.5,
    lines: [
      {
        label: "Fourniture et pose d'une pompe à chaleur air/eau 8 kW (unité extérieure et module hydraulique)",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 9850,
        totalHT: 9850,
        canonicalItem: "chauffage.pac.air-eau",
      },
      {
        label: "Dépose de la chaudière fioul existante",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 650,
        totalHT: 650,
      },
      {
        label: "Ballon tampon 50 L",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 420,
        totalHT: 420,
      },
      {
        label: "Désembouage du circuit de chauffage",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 380,
        totalHT: 380,
        canonicalItem: "chauffage.desembouage",
      },
      {
        label: "Thermostat d'ambiance connecté",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 189,
        totalHT: 189,
        canonicalItem: "chauffage.thermostat",
      },
      {
        label: "Mise en service et réglages",
        quantity: 1,
        unit: "forfait",
        printedUnit: "forfait",
        unitPriceHT: 250,
        totalHT: 250,
        canonicalItem: "chauffage.mise-en-service",
      },
    ],
    totals: { totalHT: 11739, totalVAT: 645.65, totalTTC: 12384.65 },
    deposit: { percent: 50, amount: 6192.33 },
    paymentTerms: "Acompte de 50 % à la signature, solde à la mise en service.",
    delay: { text: "Installation sous 6 semaines après la signature.", days: 42 },
    doorToDoor: true,
    conditionsPage: true,
    expectedOutcome: "extracted",
    knownIssues: [{ kind: "high-deposit", percent: 50 }, { kind: "door-to-door" }],
  },
  {
    id: "06-optique-sante",
    category: "sante",
    description: "Optique (santé) : pas pris en charge en V1, doit être refusé sans analyse.",
    style: { font: "times", accent: [0.25, 0.2, 0.45] },
    company: {
      name: "Optique du Capitole",
      legal: "SARL au capital de 10 000 €",
      street: "2 rue Saint-Rome",
      city: "31000 Toulouse",
      phone: "05 36 49 30 30",
      siret: "900 567 890 00044",
    },
    client: { name: "Mme Inès Laurent", street: "40 rue des Filatiers", city: "31000 Toulouse" },
    extraInfo: ["Prescription du 02/09/2026 · Sécurité sociale et complémentaire santé"],
    number: "OPT-2026-2210",
    date: "2026-09-25",
    validity: { days: 90 },
    subject: "Équipement optique : lunettes à verres progressifs",
    vatRate: 20,
    lines: [
      {
        label: "Monture acétate, réf. MA-112",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 120,
        totalHT: 120,
      },
      {
        label: "Verres progressifs organiques 1,6 traitement antireflet (paire)",
        quantity: 1,
        unit: "unite",
        printedUnit: "u",
        unitPriceHT: 380,
        totalHT: 380,
      },
    ],
    totals: { totalHT: 500, totalVAT: 100, totalTTC: 600 },
    paymentTerms: "Tiers payant sur la part remboursée, reste à charge à la livraison.",
    expectedOutcome: "health",
    knownIssues: [],
  },
];

/** Département attendu : celui du lieu d'intervention, à défaut celui du client. */
export function expectedDepartment(fixture: QuoteFixture): string {
  const city = fixture.worksite?.city ?? fixture.client.city;
  const postal = /\b(\d{5})\b/.exec(city)?.[1] ?? "";
  return postal.startsWith("97") ? postal.slice(0, 3) : postal.slice(0, 2);
}

function hasTravelFees(fixture: QuoteFixture): boolean {
  return fixture.lines.some((line) => /déplacement/i.test(line.label));
}

/** Vérité terrain : ce que la lecture doit produire pour ce devis. */
export function expectedExtraction(fixture: QuoteFixture): Extraction {
  const lines: ExtractedLine[] = fixture.lines.map((line) => ({
    label: line.label,
    confidence: "high",
    quantity: line.quantity,
    unit: line.unit,
    unitPriceHT: line.unitPriceHT,
    totalHT: line.totalHT,
    vatRate: fixture.vatRate,
    ...(line.canonicalItem ? { canonicalItem: line.canonicalItem } : {}),
  }));
  return {
    documentKind: "devis",
    category: fixture.category,
    readability: "good",
    subject: fixture.subject,
    issuer: {
      hasCompanyName: true,
      hasSiret: fixture.company.siret !== undefined,
      hasAddress: fixture.company.street !== undefined,
      hasInsuranceMention: fixture.company.insurance !== undefined,
      hasValidityDate: fixture.validity !== undefined,
      hasTravelFees: hasTravelFees(fixture),
      hasClientIdentity: true,
      hasPaymentTerms: fixture.paymentTerms !== undefined,
    },
    meta: {
      isDoorToDoorSale: fixture.doorToDoor ?? false,
      quoteDate: fixture.date,
      ...(fixture.validity?.days !== undefined ? { validityDays: fixture.validity.days } : {}),
      ...(fixture.validity?.until !== undefined ? { validUntil: fixture.validity.until } : {}),
      ...(fixture.deposit?.percent !== undefined ? { depositPercent: fixture.deposit.percent } : {}),
      ...(fixture.deposit ? { depositAmount: fixture.deposit.amount } : {}),
      ...(fixture.delay ? { executionDelayDays: fixture.delay.days } : {}),
      department: expectedDepartment(fixture),
    },
    lines,
    totals: { ...fixture.totals },
    confidence: {
      category: "high",
      issuer: "high",
      quoteDate: "high",
      validity: "high",
      deposit: "high",
      executionDelay: "high",
      department: "high",
      doorToDoorSale: "high",
      totals: "high",
    },
  };
}
