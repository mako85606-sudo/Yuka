import "server-only";
import { z } from "zod";
import { limits } from "@/config/limits";
import type { AnalysisErrorCode } from "@/lib/analysis/events";
import { sniffFileType } from "@/lib/analysis/file-type";
import { CONSENT_FIELD, CONSENT_VALUE, FILES_FIELD } from "@/lib/analysis/form";
import { hostMatches, ownForwardedHosts } from "@/lib/forwarded-hosts";
import { serverEnv } from "@/server/env";
import type { QuoteDocument } from "@/server/extraction/prompt";

/**
 * Lecture et contrôle de l'envoi : accord explicite, une à quatre photos ou
 * un seul PDF, `limits.maxUploadBytes` au plus (4 Mo), et de vrais fichiers
 * (reconnus à leurs octets).
 * Les fichiers restent en mémoire ; rien n'est écrit sur disque.
 */

const uploadSchema = z.object({
  consent: z.literal(CONSENT_VALUE),
  files: z.array(z.file()).min(1).max(limits.maxPhotos),
});

export type ParsedUpload =
  | { readonly ok: true; readonly documents: readonly QuoteDocument[]; readonly totalBytes: number }
  | { readonly ok: false; readonly code: AnalysisErrorCode };

function errorCode(error: z.ZodError): AnalysisErrorCode {
  const issue = error.issues[0];
  if (issue?.path[0] === "consent") return "consent-required";
  if (issue?.path[0] === "files" && issue.path.length === 1) {
    return issue.code === "too_big" ? "too-many-files" : "no-file";
  }
  return "unsupported-file";
}

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
    documents.push(
      type === "pdf" ? { kind: "pdf", data } : { kind: "image", mediaType: `image/${type}`, data },
    );
  }

  // Un PDF voyage seul : il contient déjà toutes les pages.
  const pdfs = documents.filter((document) => document.kind === "pdf").length;
  if (pdfs > 0 && documents.length > 1) return { ok: false, code: "too-many-files" };

  return { ok: true, documents, totalBytes };
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
