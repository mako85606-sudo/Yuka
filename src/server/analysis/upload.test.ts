import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { decodePDFRawStream, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { sniffFileType } from "@/lib/analysis/file-type";
import { CONSENT_VALUE } from "@/lib/analysis/form";
import { ownForwardedHosts } from "@/lib/forwarded-hosts";
import type { QuoteDocument } from "@/server/extraction/prompt";
import { isSameOrigin, parseUpload, prepareDocuments, preparePdf } from "@/server/analysis/upload";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");
const latin1 = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

/** Un vrai PDF de `pages` pages, avec des propriétés qui nomment une personne. */
async function realPdf(pages: number): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) pdf.addPage([595, 842]);
  pdf.setTitle("Devis Dupont");
  pdf.setAuthor("Camille Dupont");
  pdf.setSubject("Chantier 12 rue des Lilas");
  pdf.setKeywords(["dupont"]);
  return new Uint8Array(await pdf.save());
}

function form(files: readonly File[], consent: string | null = CONSENT_VALUE): FormData {
  const data = new FormData();
  if (consent !== null) data.set("consent", consent);
  for (const file of files) data.append("files", file);
  return data;
}

const photo = (bytes: Uint8Array<ArrayBuffer> = JPEG, name = "page.jpg", type = "image/jpeg") =>
  new File([bytes], name, { type });

/** Charge un PDF préparé et renvoie tout son texte (dictionnaires + flux décodés). */
async function dumpPrepared(data: Uint8Array): Promise<{ text: string; pages: number; hasContent: boolean }> {
  const pdf = await PDFDocument.load(data, { updateMetadata: false });
  let text = "";
  for (const [, object] of pdf.context.enumerateIndirectObjects()) {
    text += `${object.toString()}\n`;
    if (object instanceof PDFRawStream) {
      try {
        text += `${latin1(decodePDFRawStream(object).decode())}\n`;
      } catch {
        // Flux non décodable : ses octets bruts sont déjà dans object.toString().
      }
    }
  }
  // La page garde-t-elle un flux de contenu (preuve qu'elle se rend) ?
  const hasContent = pdf.getPageCount() > 0 && pdf.getPage(0).node.get(PDFName.of("Contents")) !== undefined;
  return { text, pages: pdf.getPageCount(), hasContent };
}

describe("sniffFileType", () => {
  it("reconnaît les fichiers à leurs octets, pas à leur nom", () => {
    expect(sniffFileType(JPEG)).toBe("jpeg");
    expect(sniffFileType(PNG)).toBe("png");
    expect(sniffFileType(WEBP)).toBe("webp");
    expect(sniffFileType(PDF)).toBe("pdf");
    expect(sniffFileType(new TextEncoder().encode("<html>"))).toBeNull();
    expect(sniffFileType(new Uint8Array())).toBeNull();
  });
});

describe("parseUpload", () => {
  it("accepte une à quatre photos, dans l'ordre", async () => {
    const result = await parseUpload(form([photo(), photo(PNG, "2.png", "image/png"), photo(WEBP)]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.documents.map((document) => (document.kind === "image" ? document.mediaType : "pdf"))).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("accepte un PDF seul, sans l'ouvrir (octets bruts, nettoyés plus tard)", async () => {
    const pdf = await realPdf(2);
    const result = await parseUpload(form([new File([pdf], "devis.pdf", { type: "application/pdf" })]));
    expect(result).toMatchObject({ ok: true, documents: [{ kind: "pdf" }] });
  });

  it("exige l'accord explicite", async () => {
    expect(await parseUpload(form([photo()], null))).toEqual({ ok: false, code: "consent-required" });
    expect(await parseUpload(form([photo()], "non"))).toEqual({ ok: false, code: "consent-required" });
  });

  it("exige au moins un fichier, et pas plus de quatre photos", async () => {
    expect(await parseUpload(form([]))).toEqual({ ok: false, code: "no-file" });
    const tooMany = Array.from({ length: limits.maxPhotos + 1 }, () => photo());
    expect(await parseUpload(form(tooMany))).toEqual({ ok: false, code: "too-many-files" });
  });

  it("refuse un PDF accompagné d'autres fichiers", async () => {
    const pdf = new File([await realPdf(1)], "devis.pdf", { type: "application/pdf" });
    expect(await parseUpload(form([pdf, photo()]))).toEqual({ ok: false, code: "too-many-files" });
  });

  it("refuse un faux fichier, même bien nommé", async () => {
    const fake = new File([new TextEncoder().encode("<script>")], "devis.jpg", { type: "image/jpeg" });
    expect(await parseUpload(form([fake]))).toEqual({ ok: false, code: "unsupported-file" });
  });

  it("refuse un envoi trop lourd", async () => {
    const big = new Uint8Array(limits.maxUploadBytes + 1);
    big.set(JPEG);
    expect(await parseUpload(form([photo(big)]))).toEqual({ ok: false, code: "too-large" });
  });
});

describe("prepareDocuments", () => {
  it("laisse les images inchangées", async () => {
    const result = await prepareDocuments([{ kind: "image", mediaType: "image/jpeg", data: JPEG }]);
    expect(result).toEqual({ ok: true, documents: [{ kind: "image", mediaType: "image/jpeg", data: JPEG }] });
  });

  it("nettoie un PDF et garde ses pages", async () => {
    const result = await prepareDocuments([{ kind: "pdf", data: await realPdf(2) }]);
    expect(result.ok).toBe(true);
    if (!result.ok || result.documents[0]?.kind !== "pdf") throw new Error("PDF attendu");
    const read = await PDFDocument.load(result.documents[0].data, { updateMetadata: false });
    expect(read.getPageCount()).toBe(2);
    expect(read.getAuthor() ?? "").toBe("");
  });

  it(`refuse un PDF de plus de ${limits.maxPdfPages} pages`, async () => {
    const pdf: QuoteDocument = { kind: "pdf", data: await realPdf(limits.maxPdfPages + 1) };
    expect(await prepareDocuments([pdf])).toEqual({ ok: false, code: "too-many-pages" });
  });

  it("refuse un faux PDF qui ne s'ouvre pas", async () => {
    expect(await prepareDocuments([{ kind: "pdf", data: PDF }])).toEqual({ ok: false, code: "unsupported-file" });
  });

  it("prépare les devis fictifs du jeu de test sans perdre de page ni de contenu", async () => {
    const folder = join(process.cwd(), "src/fixtures/quotes");
    const names = readdirSync(folder).filter((name) => name.endsWith(".pdf"));
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const original = new Uint8Array(readFileSync(join(folder, name)));
      const out = await preparePdf(original);
      if (!out.ok) throw new Error(`${name} refusé : ${out.code}`);
      const before = await PDFDocument.load(original, { updateMetadata: false });
      const dumped = await dumpPrepared(out.data);
      expect(dumped.pages).toBe(before.getPageCount());
      expect(dumped.hasContent).toBe(true);
    }
  });
});

describe("preparePdf : métadonnées retirées", () => {
  it("retire un flux de métadonnées XMP du catalogue, même non référencé ensuite", async () => {
    const pdf = await PDFDocument.create();
    // Un tracé : la page a un vrai flux de contenu, qui doit survivre au nettoyage.
    pdf.addPage([595, 842]).drawRectangle({ x: 50, y: 50, width: 100, height: 40 });
    const xmp = pdf.context.stream(
      "<x:xmpmeta><dc:creator>Camille Dupont, 12 rue des Lilas</dc:creator></x:xmpmeta>",
      { Type: "Metadata", Subtype: "XML" },
    );
    pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(xmp));
    const input = await pdf.save({ useObjectStreams: false });
    expect(latin1(input)).toMatch(/Camille Dupont/);

    const out = await preparePdf(input);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const dumped = await dumpPrepared(out.data);
    expect(dumped.text).not.toMatch(/Dupont|Lilas/);
    expect(dumped.pages).toBe(1);
    expect(dumped.hasContent).toBe(true);
  });

  it("retire un ancien dictionnaire Info laissé par une mise à jour incrémentale", async () => {
    const base = await PDFDocument.create();
    base.addPage([595, 842]);
    base.setAuthor("Camille Dupont");
    const v1 = await base.save({ useObjectStreams: false });
    const s = latin1(v1);
    const startxref = Number(/startxref\s+(\d+)/.exec(s)?.[1]);
    const size = Number(/\/Size (\d+)/.exec(s)?.[1]);
    const root = /\/Root (\d+ 0 R)/.exec(s)?.[1] ?? "";
    const off = v1.length;
    const obj = `${size} 0 obj\n<< /Producer (Camille Dupont) >>\nendobj\n`;
    const xref = `xref\n${size} 1\n${String(off).padStart(10, "0")} 00000 n \ntrailer\n<< /Size ${size + 1} /Root ${root} /Info ${size} 0 R /Prev ${startxref} >>\nstartxref\n${off + obj.length}\n%%EOF\n`;
    const v2 = new Uint8Array([...v1, ...new TextEncoder().encode(obj + xref)]);

    const out = await preparePdf(v2);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const read = await PDFDocument.load(out.data, { updateMetadata: false });
    expect(read.getAuthor() ?? "").toBe("");
    const dumped = await dumpPrepared(out.data);
    expect(dumped.text).not.toMatch(/Camille Dupont/);
  });

  it("refuse un PDF chiffré", async () => {
    // En-tête minimal avec /Encrypt dans le trailer : pdf-lib le voit chiffré.
    const body =
      "%PDF-1.7\n" +
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\n" +
      "4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O (0000000000000000) /U (0000000000000000) /P -1 >>\nendobj\n" +
      "trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>\n%%EOF\n";
    const out = await preparePdf(new TextEncoder().encode(body));
    expect(out).toEqual({ ok: false, code: "unsupported-file" });
  });
});

describe("preparePdf : garde anti-bombe", () => {
  it("refuse un objet-flux (/ObjStm) qui se décompresse au-delà du plafond", async () => {
    const payload = deflateSync(Buffer.alloc(200 * 1024 * 1024, 0x20), { level: 9 });
    const head =
      "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n" +
      `3 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length ${payload.length} >>\nstream\n`;
    const tail = "\nendstream\nendobj\ntrailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF\n";
    const file = Buffer.concat([Buffer.from(head, "latin1"), payload, Buffer.from(tail, "latin1")]);
    const started = Date.now();
    const out = await preparePdf(new Uint8Array(file));
    expect(out).toEqual({ ok: false, code: "unsupported-file" });
    // La bombe est refusée vite, sans tout décompresser.
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});

describe("isSameOrigin", () => {
  it("accepte une demande venue du site lui-même", () => {
    expect(isSameOrigin(new Headers({ origin: "https://loupe.fr", host: "loupe.fr" }))).toBe(true);
    expect(
      isSameOrigin(new Headers({ origin: "http://192.168.1.20:3000", host: "192.168.1.20:3000" })),
    ).toBe(true);
  });

  it("accepte l'adresse publique d'un codespace, et elle seule", () => {
    const codespace = ["octocat-loupe-3000.app.github.dev"];
    const headers = (origin: string) => new Headers({ origin, host: "localhost:3000" });
    expect(isSameOrigin(headers("https://octocat-loupe-3000.app.github.dev"), codespace)).toBe(true);
    expect(isSameOrigin(headers("https://autre-3000.app.github.dev"), codespace)).toBe(false);
  });

  it("accepte en développement une adresse de codespace inconnue du serveur (motif)", () => {
    const headers = new Headers({ origin: "https://octocat-loupe-3000.app.github.dev", host: "localhost:3000", "x-forwarded-host": "localhost:3000" });
    expect(isSameOrigin(headers, ["*.app.github.dev"])).toBe(true);
    expect(isSameOrigin(new Headers({ origin: "https://ailleurs.fr", host: "localhost:3000" }), ["*.app.github.dev"])).toBe(false);
  });

  it("accepte l'origine que le relais de Codespaces réécrit en localhost (adresse publique dans x-forwarded-host)", () => {
    const relayed = { origin: "http://localhost:3000", "x-forwarded-host": "octocat-loupe-3000.app.github.dev" };
    // Le relais garde `host: localhost:3000` : l'origine désigne l'hôte de la requête.
    expect(isSameOrigin(new Headers({ ...relayed, host: "localhost:3000" }), [])).toBe(true);
    // Sans lui, l'adresse locale vient des hôtes permis en développement.
    expect(isSameOrigin(new Headers(relayed), [])).toBe(false);
    expect(isSameOrigin(new Headers(relayed), ownForwardedHosts({}, "development"))).toBe(true);
    expect(isSameOrigin(new Headers(relayed), ownForwardedHosts({}, "production"))).toBe(false);
  });

  it("prend la première valeur d'un x-forwarded-host multiple", () => {
    const headers = new Headers({ origin: "https://loupe.fr", "x-forwarded-host": "loupe.fr, relais.interne" });
    expect(isSameOrigin(headers, [])).toBe(true);
  });

  it("croit le navigateur quand il annonce une demande de la même origine, quel que soit le relais", () => {
    const headers = new Headers({ "sec-fetch-site": "same-origin", origin: "http://localhost:3000", host: "loupe.fr" });
    expect(isSameOrigin(headers, [])).toBe(true);
    expect(isSameOrigin(new Headers({ "sec-fetch-site": "same-origin" }), [])).toBe(true);
  });

  it("refuse une demande venue d'ailleurs, ou sans origine", () => {
    expect(isSameOrigin(new Headers({ origin: "https://ailleurs.fr", host: "loupe.fr" }))).toBe(false);
    expect(isSameOrigin(new Headers({ "sec-fetch-site": "cross-site", origin: "https://ailleurs.fr", host: "loupe.fr" }))).toBe(false);
    expect(isSameOrigin(new Headers({ "sec-fetch-site": "same-site", origin: "https://www.loupe.fr", host: "loupe.fr" }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: "loupe.fr" }))).toBe(false);
    expect(isSameOrigin(new Headers({ origin: "pas une url", host: "loupe.fr" }))).toBe(false);
    expect(isSameOrigin(new Headers({ origin: "null", host: "loupe.fr" }))).toBe(false);
  });

  it("n'accepte pas d'adresse locale en production", () => {
    expect(isSameOrigin(new Headers({ origin: "http://localhost:3000", host: "loupe.fr" }))).toBe(false);
  });
});
