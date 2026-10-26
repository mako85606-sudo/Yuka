import "server-only";
import { PDFDocument, PDFName } from "pdf-lib";
import { z } from "zod";
import { limits } from "@/config/limits";
import type { AnalysisErrorCode } from "@/lib/analysis/events";
import { sniffFileType } from "@/lib/analysis/file-type";
import { CONSENT_FIELD, CONSENT_VALUE, FILES_FIELD } from "@/lib/analysis/form";
import { hostMatches, ownForwardedHosts } from "@/lib/forwarded-hosts";
import { scanPdfForBombs } from "@/server/analysis/pdf-guard";
import { serverEnv } from "@/server/env";
import type { QuoteDocument } from "@/server/extraction/prompt";

/**
 * Lecture et contrôle de l'envoi, en deux temps.
 *
 * `parseUpload` ne fait que les contrôles qui ne coûtent rien : accord
 * explicite, une à quatre photos ou un seul PDF, `limits.maxUploadBytes` au
 * plus (4 Mo), et de vrais fichiers (reconnus à leurs octets). Il n'ouvre pas
 * les PDF : un fichier piégé ne doit rien coûter avant que le quota et la
 * réservation de budget ne soient pris.
 *
 * `prepareDocuments` traite ensuite les PDF (une fois le quota pris) : garde
 * anti-bombe, contrôle du nombre de pages, refus d'un PDF chiffré, puis
 * reconstruction sans aucune métadonnée. Les fichiers restent en mémoire ; rien
 * n'est écrit sur disque.
 */

const uploadSchema = z.object({
  consent: z.literal(CONSENT_VALUE),
  files: z.array(z.file()).min(1).max(limits.maxPhotos),
});

export type ParsedUpload =
  | { readonly ok: true; readonly documents: readonly QuoteDocument[]; readonly totalBytes: number }
  | { readonly ok: false; readonly code: AnalysisErrorCode };

export type PreparedUpload =
  | { readonly ok: true; readonly documents: readonly QuoteDocument[] }
  | { readonly ok: false; readonly code: AnalysisErrorCode };

function errorCode(error: z.ZodError): AnalysisErrorCode {
  const issue = error.issues[0];
  if (issue?.path[0] === "consent") return "consent-required";
  if (issue?.path[0] === "files" && issue.path.length === 1) {
    return issue.code === "too_big" ? "too-many-files" : "no-file";
  }
  return "unsupported-file";
}

/**
 * Contrôles bon marché de l'envoi, sans ouvrir les PDF. Les PDF ressortent avec
 * leurs octets bruts : `prepareDocuments` les nettoie plus tard.
 */
export async function parseUpload(formData: FormData): Promise<ParsedUpload> {
  const parsed = uploadSchema.safeParse({
    consent: formData.get(CONSENT_FIELD),
    files: formData.getAll(FILES_FIELD),
  });
  if (!parsed.success) return { ok: false, code: errorCode(parsed.error) };

  const { files } = parsed.data;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > limits.maxUploadBytes) return { ok: false, code: "too-large" };

  const documents: QuoteDocument[] = [];
  for (const file of files) {
    const data = new Uint8Array(await file.arrayBuffer());
    const type = sniffFileType(data);
    if (!type) return { ok: false, code: "unsupported-file" };
    if (type === "pdf") {
      documents.push({ kind: "pdf", data });
    } else {
      documents.push({ kind: "image", mediaType: `image/${type}`, data });
    }
  }

  // Un PDF voyage seul : il contient déjà toutes les pages.
  const pdfs = documents.filter((document) => document.kind === "pdf").length;
  if (pdfs > 0 && documents.length > 1) return { ok: false, code: "too-many-files" };

  return { ok: true, documents, totalBytes };
}

/**
 * Nettoie les PDF de l'envoi : garde anti-bombe, nombre de pages, refus d'un
 * PDF chiffré, puis reconstruction sans métadonnées. Les images passent telles
 * quelles. À appeler après la prise du quota (un PDF refusé ici est la faute du
 * client : pas de remboursement).
 */
export async function prepareDocuments(documents: readonly QuoteDocument[]): Promise<PreparedUpload> {
  const prepared: QuoteDocument[] = [];
  for (const document of documents) {
    if (document.kind !== "pdf") {
      prepared.push(document);
      continue;
    }
    const pdf = await preparePdf(document.data);
    if (!pdf.ok) return pdf;
    prepared.push({ kind: "pdf", data: pdf.data });
  }
  return { ok: true, documents: prepared };
}

/**
 * Contrôle et nettoie un PDF avant lecture :
 * - garde anti-bombe sur les octets bruts (`scanPdfForBombs`), avant pdf-lib ;
 * - il doit s'ouvrir et compter de 1 à `limits.maxPdfPages` pages ;
 * - un PDF chiffré est refusé (on ne saurait ni le nettoyer ni garantir sa
 *   lecture) ;
 * - il est reconstruit à partir de ses seules pages (`create` + `copyPages`) :
 *   plus de métadonnées XMP du catalogue, plus d'ancien dictionnaire Info laissé
 *   par une mise à jour incrémentale, et les métadonnées de page (`/Metadata`,
 *   `/PieceInfo`, `/LastModified`), qui peuvent nommer une personne, sont
 *   retirées. Un vrai `save()` réécrit tout : c'est la seule façon de ne pas
 *   laisser passer un objet non référencé.
 */
export async function preparePdf(
  data: Uint8Array,
): Promise<{ readonly ok: true; readonly data: Uint8Array } | { readonly ok: false; readonly code: AnalysisErrorCode }> {
  if (!scanPdfForBombs(data).ok) return { ok: false, code: "unsupported-file" };

  let source: PDFDocument;
  let pages: number;
  try {
    source = await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
    // pdf-lib ouvre parfois un fichier sans pages ni catalogue : il n'est pas lisible.
    pages = source.getPageCount();
  } catch {
    return { ok: false, code: "unsupported-file" };
  }
  if (pages === 0) return { ok: false, code: "unsupported-file" };
  if (pages > limits.maxPdfPages) return { ok: false, code: "too-many-pages" };
  // Un PDF chiffré : ni nettoyage fiable ni lecture garantie.
  if (source.isEncrypted) return { ok: false, code: "unsupported-file" };

  let clean: PDFDocument;
  try {
    clean = await PDFDocument.create();
    const copied = await clean.copyPages(source, source.getPageIndices());
    for (const page of copied) {
      // Métadonnées attachées à la page elle-même (les seules recopiées).
      page.node.delete(PDFName.of("Metadata"));
      page.node.delete(PDFName.of("PieceInfo"));
      page.node.delete(PDFName.of("LastModified"));
      clean.addPage(page);
    }
  } catch {
    return { ok: false, code: "unsupported-file" };
  }
  // Champs Info vidés (pdf-lib en pose quelques-uns à la création).
  clean.setTitle("");
  clean.setAuthor("");
  clean.setSubject("");
  clean.setKeywords([]);
  clean.setCreator("");
  clean.setProducer("");
  return { ok: true, data: await clean.save({ updateFieldAppearances: false }) };
}

/** Statut HTTP de chaque refus avant analyse. */
export function statusFor(code: AnalysisErrorCode): number {
  switch (code) {
    case "too-large":
    case "too-many-pages":
      return 413;
    case "unsupported-file":
      return 415;
    case "forbidden-origin":
      return 403;
    case "rate-limited":
      return 429;
    case "not-configured":
    case "paused":
      return 503;
    case "reading-failed":
    case "server-error":
      return 500;
    default:
      return 400;
  }
}

/**
 * La demande vient-elle d'une page de Loupe ? Cela empêche un autre site de
 * faire analyser des devis à nos frais. Deux preuves, posées par le navigateur
 * et qu'une page ne peut pas imiter :
 * - `Sec-Fetch-Site: same-origin`, calculé d'après l'adresse que le navigateur
 *   affiche : aucun relais ne le fausse ;
 * - sinon l'en-tête `Origin`, envoyé avec tout POST : il doit désigner l'hôte
 *   de la requête (`x-forwarded-host` ou `host`) ou l'un des nôtres derrière un
 *   relais (`ownForwardedHosts` : en développement, le codespace et l'adresse
 *   locale que son relais met dans `Origin`).
 */
export function isSameOrigin(
  headers: Headers,
  extraHosts: readonly string[] = ownForwardedHosts(serverEnv(), process.env.NODE_ENV),
): boolean {
  if (headers.get("sec-fetch-site") === "same-origin") return true;
  const origin = headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHosts = [forwardedHost, headers.get("host")].filter((host): host is string => Boolean(host));
  return (
    requestHosts.some((host) => host.toLowerCase() === originHost) ||
    extraHosts.some((pattern) => hostMatches(originHost, pattern))
  );
}
