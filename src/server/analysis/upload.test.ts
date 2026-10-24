import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { limits } from "@/config/limits";
import { sniffFileType } from "@/lib/analysis/file-type";
import { CONSENT_VALUE } from "@/lib/analysis/form";
import { ownForwardedHosts } from "@/lib/forwarded-hosts";
import { isSameOrigin, parseUpload } from "@/server/analysis/upload";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const PDF = new TextEncoder().encode("%PDF-1.7\n");

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

  it("accepte un PDF seul, sans ses propriétés", async () => {
    const pdf = await realPdf(2);
    const result = await parseUpload(form([new File([pdf], "devis.pdf", { type: "application/pdf" })]));
    expect(result).toMatchObject({ ok: true, documents: [{ kind: "pdf" }] });
    if (!result.ok || result.documents[0]?.kind !== "pdf") throw new Error("PDF attendu");
    const read = await PDFDocument.load(result.documents[0].data, { updateMetadata: false });
    expect(read.getPageCount()).toBe(2);
    expect(read.getAuthor() ?? "").toBe("");
    expect(read.getTitle() ?? "").toBe("");
    expect(new TextDecoder("latin1").decode(result.documents[0].data)).not.toMatch(/Dupont|Lilas/);
  });

  it(`refuse un PDF de plus de ${limits.maxPdfPages} pages`, async () => {
    const pdf = await realPdf(limits.maxPdfPages + 1);
    expect(await parseUpload(form([new File([pdf], "devis.pdf", { type: "application/pdf" })]))).toEqual({
      ok: false,
      code: "too-many-pages",
    });
  });

  it("refuse un faux PDF qui ne s'ouvre pas", async () => {
    expect(await parseUpload(form([new File([PDF], "devis.pdf", { type: "application/pdf" })]))).toEqual({
      ok: false,
      code: "unsupported-file",
    });
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
