import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { scanPdfForBombs } from "@/server/analysis/pdf-guard";

const enc = (text: string) => Buffer.from(text, "latin1");

/** PDF minimal portant un objet-flux `streamDict` + données `payload`. */
function pdfWithStream(streamDict: string, payload: Buffer, length = payload.length): Uint8Array {
  const head =
    "%PDF-1.7\n" +
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n" +
    `3 0 obj\n<< ${streamDict} /Length ${length} >>\nstream\n`;
  const tail = "\nendstream\nendobj\ntrailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF\n";
  return new Uint8Array(Buffer.concat([enc(head), payload, enc(tail)]));
}

/** Données deflate qui se décompressent en `bytes` octets d'espaces. */
const flate = (bytes: number) => deflateSync(Buffer.alloc(bytes, 0x20), { level: 9 });

const PER_STREAM = 1 * 1024 * 1024;
const TOTAL = 2 * 1024 * 1024;

describe("scanPdfForBombs", () => {
  it("accepte un PDF sans flux", () => {
    const pdf = enc("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: true });
  });

  it("ignore un flux de contenu de page (pas de /Type : jamais décompressé au chargement)", () => {
    const pdf = pdfWithStream("/Filter /FlateDecode", flate(8 * 1024 * 1024));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: true });
  });

  it("ignore une image (jamais décompressée au chargement)", () => {
    const pdf = pdfWithStream("/Type /XObject /Subtype /Image /Filter /DCTDecode", Buffer.alloc(4096, 0xab));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: true });
  });

  it("refuse un /ObjStm qui se décompresse au-delà du plafond par flux", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", flate(8 * 1024 * 1024));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bomb" });
  });

  it("refuse un /XRef qui se décompresse au-delà du plafond", () => {
    const pdf = pdfWithStream("/Type /XRef /W [1 2 1] /Filter /FlateDecode", flate(8 * 1024 * 1024));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bomb" });
  });

  it("accepte un /ObjStm sous le plafond", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", flate(100 * 1024));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: true });
  });

  it("refuse quand le total des flux décompressés dépasse le plafond global", () => {
    const one = `3 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length 0 >>\nstream\n`;
    const payload = flate(800 * 1024);
    const body = enc("%PDF-1.7\n");
    const parts: Buffer[] = [body];
    for (let i = 0; i < 4; i += 1) {
      parts.push(enc(one), payload, enc("\nendstream\nendobj\n"));
    }
    parts.push(enc("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));
    // 4 × 800 Ko = 3,2 Mo > 2 Mo, chacun sous le plafond par flux.
    expect(scanPdfForBombs(new Uint8Array(Buffer.concat(parts)), PER_STREAM, TOTAL)).toEqual({
      ok: false,
      reason: "bomb",
    });
  });

  it("compte au total un flux dont la somme Adler-32 est fausse (pdf-lib ne la vérifie pas)", () => {
    const badChecksum = Buffer.from(flate(800 * 1024));
    badChecksum[badChecksum.length - 1] = (badChecksum[badChecksum.length - 1] ?? 0) ^ 0xff;
    const one = `3 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length 0 >>\nstream\n`;
    const parts: Buffer[] = [enc("%PDF-1.7\n")];
    for (let i = 0; i < 4; i += 1) parts.push(enc(one), badChecksum, enc("\nendstream\nendobj\n"));
    parts.push(enc("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));
    expect(scanPdfForBombs(new Uint8Array(Buffer.concat(parts)), PER_STREAM, TOTAL)).toEqual({
      ok: false,
      reason: "bomb",
    });
  });

  it("ignore un /ObjStm sans en-tête zlib valide (pdf-lib n'en décompresse rien)", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", Buffer.alloc(64, 0));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: true });
  });

  it("refuse un /ObjStm aux données deflate invalides (taille décompressée inconnue)", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", Buffer.from([0x78, 0x9c, 0xff, 0xff, 0xff, 0xff]));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "corrupt" });
  });

  it("refuse un /ObjStm à filtre interdit (LZWDecode)", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /LZWDecode", Buffer.alloc(32, 0));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bad-filter" });
  });

  it("refuse une chaîne de filtres sur un /ObjStm", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter [/ASCII85Decode /FlateDecode]", Buffer.alloc(32, 0));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bad-filter" });
  });

  it("accepte un /ObjStm non compressé (aucun gonflement possible)", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 0 /First 2", enc("rien"));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: true });
  });

  it("traite un /Type indirect comme décompressé au chargement (filtre non Flate refusé)", () => {
    const pdf = pdfWithStream("/Type 9 0 R /Filter /LZWDecode", Buffer.alloc(32, 0));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bad-filter" });
  });

  it("décode les échappements de nom (#XX) avant de reconnaître /ObjStm", () => {
    // /Obj#53tm = /ObjStm (0x53 = 'S').
    const pdf = pdfWithStream("/Type /Obj#53tm /N 1 /First 4 /Filter /FlateDecode", flate(8 * 1024 * 1024));
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bomb" });
  });

  it("ne fait confiance ni à /Length ni à endstream (données réelles décompressées)", () => {
    // /Length ment (10) et un faux endstream est glissé dans les données.
    const payload = Buffer.concat([flate(8 * 1024 * 1024), enc("endstream fourbe")]);
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", payload, 10);
    expect(scanPdfForBombs(pdf, PER_STREAM, TOTAL)).toEqual({ ok: false, reason: "bomb" });
  });

  it("refuse vite une grosse bombe sans tout décompresser", () => {
    const pdf = pdfWithStream("/Type /ObjStm /N 1 /First 4 /Filter /FlateDecode", flate(200 * 1024 * 1024));
    const started = Date.now();
    expect(scanPdfForBombs(pdf)).toEqual({ ok: false, reason: "bomb" });
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("laisse passer les vrais devis fictifs", () => {
    for (const name of [
      "01-plomberie-chauffe-eau",
      "02-garage-freins",
      "03-electricite-tableau",
      "04-serrurerie-urgence",
      "05-chauffage-pac-domicile",
      "06-optique-sante",
    ]) {
      const pdf = readFileSync(join(process.cwd(), "src/fixtures/quotes", `${name}.pdf`));
      expect(scanPdfForBombs(new Uint8Array(pdf))).toEqual({ ok: true });
    }
  });
});
