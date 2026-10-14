/**
 * Génère les devis PDF fictifs du jeu de test et leur vérité terrain JSON,
 * à partir de `src/fixtures/quotes/definitions.ts`.
 *
 *   npm run fixtures:generate
 *
 * Le rendu est déterministe (dates du document fixées) : relancer le script
 * sans changer les définitions redonne les mêmes fichiers.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  expectedExtraction,
  quoteFixtures,
  type FixtureFont,
  type QuoteFixture,
} from "@/fixtures/quotes/definitions";

const OUT_DIR = path.join(process.cwd(), "src", "fixtures", "quotes");
const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const RIGHT = PAGE_SIZE[0] - MARGIN;
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.78, 0.78, 0.78);
const NBSP = " ";

const FONT_FILES: Record<FixtureFont, readonly [StandardFonts, StandardFonts]> = {
  helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
  times: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
  courier: [StandardFonts.Courier, StandardFonts.CourierBold],
};

// Écriture des nombres à la française, comme un logiciel de devis.
function money(value: number): string {
  const [integer = "0", decimals = "00"] = value.toFixed(2).split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)},${decimals}`;
}

function number(value: number): string {
  return String(value).replace(".", ",");
}

function percent(value: number): string {
  return `${number(value)}${NBSP}%`;
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

interface TextOptions {
  readonly size?: number;
  readonly bold?: boolean;
  readonly color?: RGB;
  readonly align?: "left" | "right";
}

class Sheet {
  readonly page: PDFPage;
  readonly height: number;

  constructor(
    page: PDFPage,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = page;
    this.height = page.getHeight();
  }

  font(bold = false): PDFFont {
    return bold ? this.bold : this.regular;
  }

  width(text: string, size: number, bold = false): number {
    return this.font(bold).widthOfTextAtSize(text, size);
  }

  /** Écrit à `top` points du haut de la page. */
  text(text: string, x: number, top: number, options: TextOptions = {}) {
    const size = options.size ?? 9;
    const bold = options.bold ?? false;
    const left = options.align === "right" ? x - this.width(text, size, bold) : x;
    this.page.drawText(text, {
      x: left,
      y: this.height - top - size,
      size,
      font: this.font(bold),
      color: options.color ?? INK,
    });
  }

  wrap(text: string, maxWidth: number, size: number, bold = false): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && this.width(candidate, size, bold) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  /** Paragraphe replié ; renvoie la position sous le dernier rang. */
  paragraph(text: string, x: number, top: number, maxWidth: number, options: TextOptions = {}): number {
    const size = options.size ?? 9;
    let y = top;
    for (const line of this.wrap(text, maxWidth, size, options.bold)) {
      this.text(line, x, y, options);
      y += size + 3;
    }
    return y;
  }

  line(x1: number, top1: number, x2: number, top2: number, color: RGB = RULE, thickness = 0.6) {
    this.page.drawLine({
      start: { x: x1, y: this.height - top1 },
      end: { x: x2, y: this.height - top2 },
      thickness,
      color,
    });
  }

  box(x: number, top: number, width: number, height: number, options: { fill?: RGB; border?: RGB } = {}) {
    this.page.drawRectangle({
      x,
      y: this.height - top - height,
      width,
      height,
      color: options.fill,
      borderColor: options.border,
      borderWidth: options.border ? 0.6 : 0,
    });
  }
}

function footer(sheet: Sheet, pageNumber: number, pageCount: number) {
  sheet.line(MARGIN, 806, RIGHT, 806);
  sheet.text(
    "Exemple fictif · jeu de test de Loupe : entreprise, client et coordonnées sont inventés.",
    MARGIN,
    812,
    { size: 7, color: MUTED },
  );
  sheet.text(`Page ${pageNumber}/${pageCount}`, RIGHT, 812, { size: 7, color: MUTED, align: "right" });
}

function drawFirstPage(sheet: Sheet, fixture: QuoteFixture, accent: RGB, pageCount: number) {
  const { company, client } = fixture;

  // Émetteur
  let top = MARGIN;
  sheet.text(company.name, MARGIN, top, { size: 16, bold: true, color: accent });
  top += 22;
  const issuerLines = [
    company.legal,
    company.street,
    company.city,
    [company.phone && `Tél. ${company.phone}`, company.email].filter(Boolean).join(" · ") || undefined,
    company.siret && `SIRET ${company.siret}`,
    company.vatNumber && `TVA intracommunautaire ${company.vatNumber}`,
  ].filter((line): line is string => Boolean(line));
  for (const line of issuerLines) {
    sheet.text(line, MARGIN, top, { size: 8.5, color: MUTED });
    top += 11.5;
  }

  // Titre et références
  sheet.text("DEVIS", RIGHT, MARGIN, { size: 22, bold: true, color: accent, align: "right" });
  sheet.text(`N° ${fixture.number}`, RIGHT, MARGIN + 28, { size: 9, align: "right" });
  sheet.text(`Date : ${shortDate(fixture.date)}`, RIGHT, MARGIN + 40, { size: 9, align: "right" });
  if (fixture.validity?.days) {
    sheet.text(`Validité : ${fixture.validity.days} jours`, RIGHT, MARGIN + 52, { size: 9, align: "right" });
  } else if (fixture.validity?.until) {
    sheet.text(`Offre valable jusqu'au ${shortDate(fixture.validity.until)}`, RIGHT, MARGIN + 52, {
      size: 9,
      align: "right",
    });
  }

  // Client
  const clientTop = Math.max(top, 140) + 8;
  const clientX = 330;
  sheet.box(clientX - 10, clientTop - 8, RIGHT - clientX + 10, 62, { border: RULE });
  sheet.text("Client", clientX, clientTop - 2, { size: 7.5, color: MUTED });
  sheet.text(client.name, clientX, clientTop + 10, { size: 10, bold: true });
  sheet.text(client.street, clientX, clientTop + 24, { size: 9 });
  sheet.text(client.city, clientX, clientTop + 36, { size: 9 });

  let infoTop = clientTop;
  if (fixture.worksite) {
    sheet.text("Lieu d'intervention", MARGIN, infoTop, { size: 7.5, color: MUTED });
    sheet.text(fixture.worksite.street, MARGIN, infoTop + 12, { size: 9 });
    sheet.text(fixture.worksite.city, MARGIN, infoTop + 24, { size: 9 });
    infoTop += 40;
  }
  for (const info of fixture.extraInfo ?? []) {
    sheet.text(info, MARGIN, infoTop, { size: 9 });
    infoTop += 12;
  }

  // Objet
  top = clientTop + 76;
  sheet.text(`Objet : ${fixture.subject}`, MARGIN, top, { size: 10.5, bold: true });
  top += 24;

  // Tableau des lignes
  const columns = {
    label: MARGIN + 4,
    labelWidth: 236,
    quantity: 334,
    unit: 342,
    unitPrice: 448,
    vat: 486,
    total: RIGHT - 4,
  };
  sheet.box(MARGIN, top, RIGHT - MARGIN, 18, { fill: rgb(0.94, 0.94, 0.94) });
  const header = { size: 8, bold: true };
  sheet.text("Désignation", columns.label, top + 5, header);
  sheet.text("Qté", columns.quantity, top + 5, { ...header, align: "right" });
  sheet.text("Unité", columns.unit, top + 5, header);
  sheet.text("P.U. HT", columns.unitPrice, top + 5, { ...header, align: "right" });
  sheet.text("TVA", columns.vat, top + 5, { ...header, align: "right" });
  sheet.text("Total HT", columns.total, top + 5, { ...header, align: "right" });
  top += 24;

  for (const line of fixture.lines) {
    const wrapped = sheet.wrap(line.label, columns.labelWidth, 9);
    wrapped.forEach((part, index) => sheet.text(part, columns.label, top + index * 12, { size: 9 }));
    sheet.text(number(line.quantity), columns.quantity, top, { size: 9, align: "right" });
    sheet.text(line.printedUnit, columns.unit, top, { size: 9 });
    sheet.text(money(line.unitPriceHT), columns.unitPrice, top, { size: 9, align: "right" });
    sheet.text(percent(fixture.vatRate), columns.vat, top, { size: 9, align: "right" });
    sheet.text(money(line.totalHT), columns.total, top, { size: 9, align: "right" });
    top += wrapped.length * 12 + 6;
    sheet.line(MARGIN, top - 3, RIGHT, top - 3);
  }

  // Totaux
  top += 10;
  const labelX = 380;
  const rows: Array<[string, string, boolean]> = [
    ["Total HT", `${money(fixture.totals.totalHT)} €`, false],
    [`TVA ${percent(fixture.vatRate)}`, `${money(fixture.totals.totalVAT)} €`, false],
    ["Total TTC", `${money(fixture.totals.totalTTC)} €`, true],
  ];
  for (const [label, amount, strong] of rows) {
    if (strong) {
      top += 4;
      sheet.line(labelX, top - 5, RIGHT, top - 5, INK, 0.8);
    }
    sheet.text(label, labelX, top, { size: strong ? 10.5 : 9.5, bold: strong });
    sheet.text(amount, RIGHT - 4, top, { size: strong ? 10.5 : 9.5, bold: strong, align: "right" });
    top += strong ? 18 : 14;
  }

  // Conditions
  top += 10;
  const notes: string[] = [];
  if (fixture.deposit) {
    notes.push(
      fixture.deposit.percent !== undefined
        ? `Acompte de ${percent(fixture.deposit.percent)} à la commande, soit ${money(fixture.deposit.amount)} €.`
        : `Acompte à la commande : ${money(fixture.deposit.amount)} €.`,
    );
  }
  if (fixture.paymentTerms) notes.push(`Conditions de paiement : ${fixture.paymentTerms}`);
  if (fixture.delay) notes.push(`Délai : ${fixture.delay.text}`);
  if (company.insurance) notes.push(company.insurance);
  if (company.qualification) notes.push(company.qualification);
  if (fixture.doorToDoor) {
    notes.push(
      "Contrat conclu hors établissement (démarchage à domicile). Vous disposez d'un délai de rétractation : voir le formulaire en page 2.",
    );
  }
  for (const note of notes) {
    top = sheet.paragraph(note, MARGIN, top, RIGHT - MARGIN, { size: 8.5 }) + 3;
  }

  // Signature
  const signatureTop = Math.min(Math.max(top + 14, 660), 720);
  sheet.box(330, signatureTop, RIGHT - 330, 70, { border: RULE });
  sheet.text("Bon pour accord", 340, signatureTop + 8, { size: 8.5, bold: true });
  sheet.text("Date et signature du client", 340, signatureTop + 20, { size: 8, color: MUTED });

  footer(sheet, 1, pageCount);
}

function drawConditionsPage(sheet: Sheet, fixture: QuoteFixture, accent: RGB, pageCount: number) {
  let top = MARGIN;
  sheet.text("Conditions générales de vente", MARGIN, top, { size: 13, bold: true, color: accent });
  top += 26;
  const paragraphs = [
    `1. Le présent devis est gratuit. Il devient un contrat dès sa signature par le client, précédée de la mention «${NBSP}Bon pour accord${NBSP}».`,
    "2. Les travaux non prévus au devis feront l'objet d'un devis complémentaire, soumis à l'accord écrit du client avant toute exécution.",
    "3. Le matériel reste la propriété de l'entreprise jusqu'au paiement intégral du prix.",
    "4. En cas de retard de paiement, des pénalités pourront être appliquées dans les limites prévues par la loi.",
  ];
  for (const text of paragraphs) top = sheet.paragraph(text, MARGIN, top, RIGHT - MARGIN, { size: 9 }) + 6;

  if (fixture.doorToDoor) {
    top += 16;
    sheet.box(MARGIN, top, RIGHT - MARGIN, 190, { border: INK });
    let inner = top + 12;
    sheet.text("Formulaire de rétractation", MARGIN + 12, inner, { size: 11, bold: true });
    inner += 20;
    const lines = [
      "Contrat conclu hors établissement. Complétez et renvoyez ce formulaire uniquement si vous souhaitez vous rétracter du contrat.",
      `À l'attention de ${fixture.company.name}, ${fixture.company.street ?? ""}, ${fixture.company.city}.`,
      `Je vous notifie par la présente ma rétractation du contrat portant sur : ${fixture.subject.toLowerCase()} (devis n°${NBSP}${fixture.number}).`,
      "Commandé le : ............................   Nom du client : ..........................................",
      "Adresse du client : ...............................................................................................",
      "Date et signature : ..............................",
    ];
    for (const text of lines) inner = sheet.paragraph(text, MARGIN + 12, inner, RIGHT - MARGIN - 24, { size: 9 }) + 8;
  }

  footer(sheet, 2, pageCount);
}

async function renderPdf(fixture: QuoteFixture): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const fixedDate = new Date(`${fixture.date}T09:00:00Z`);
  document.setTitle(`Devis ${fixture.number} (exemple fictif)`);
  document.setAuthor(fixture.company.name);
  document.setProducer("Loupe, jeu de test");
  document.setCreator("scripts/generate-fixtures.ts");
  document.setCreationDate(fixedDate);
  document.setModificationDate(fixedDate);

  const [regularFont, boldFont] = FONT_FILES[fixture.style.font];
  const regular = await document.embedFont(regularFont);
  const bold = await document.embedFont(boldFont);
  const accent = rgb(...fixture.style.accent);
  const pageCount = fixture.conditionsPage ? 2 : 1;

  drawFirstPage(new Sheet(document.addPage(PAGE_SIZE), regular, bold), fixture, accent, pageCount);
  if (fixture.conditionsPage) {
    drawConditionsPage(new Sheet(document.addPage(PAGE_SIZE), regular, bold), fixture, accent, pageCount);
  }
  return document.save({ useObjectStreams: false });
}

function truth(fixture: QuoteFixture) {
  return {
    id: fixture.id,
    description: fixture.description,
    expectedOutcome: fixture.expectedOutcome,
    extraction: fixture.expectedOutcome === "extracted" ? expectedExtraction(fixture) : null,
    knownIssues: fixture.knownIssues,
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const fixture of quoteFixtures) {
    const pdf = await renderPdf(fixture);
    await writeFile(path.join(OUT_DIR, `${fixture.id}.pdf`), pdf);
    await writeFile(
      path.join(OUT_DIR, `${fixture.id}.truth.json`),
      `${JSON.stringify(truth(fixture), null, 2)}\n`,
    );
    console.log(`✓ ${fixture.id} (${Math.round(pdf.byteLength / 1024)} Ko)`);
  }
  console.log(`\n${quoteFixtures.length} devis écrits dans ${path.relative(process.cwd(), OUT_DIR)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
