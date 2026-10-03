import { after } from "next/server";
import { limits } from "@/config/limits";
import {
  NDJSON_CONTENT_TYPE,
  type AnalysisErrorCode,
  type AnalyzeErrorBody,
} from "@/lib/analysis/events";
import { ERROR_MESSAGES } from "@/lib/analysis/messages";
import { clientIp } from "@/lib/client-ip";
import { createAnalysisStream } from "@/server/analysis/analysis-stream";
import { isSameOrigin, parseUpload, statusFor } from "@/server/analysis/upload";
import { getAnthropicClient, getExtractionModel } from "@/server/anthropic";
import {
  consumeAnalysisQuota,
  purgeExpiredQuotas,
  refundAnalysisQuota,
  type QuotaCheck,
} from "@/server/rate-limit";

/**
 * POST /api/analyze : reçoit un devis (photos ou PDF) et streame les étapes
 * réelles de son analyse, en NDJSON.
 *
 * Le devis reste en mémoire le temps de la requête : il n'est écrit ni sur
 * disque, ni en base, ni dans les journaux.
 */

// Deux tentatives de lecture au plus (50 s chacune), plus la marge.
// TODO: vérifier — la durée maximale accordée dépend du plan Vercel (et de
// Fluid compute) ; 120 s doit y être autorisé.
export const maxDuration = 120;

/** Marge pour l'enveloppe multipart autour des fichiers. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function errorResponse(code: AnalysisErrorCode): Response {
  const body: AnalyzeErrorBody = { error: { code, message: ERROR_MESSAGES[code] } };
  return Response.json(body, {
    status: statusFor(code),
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request.headers)) return errorResponse("forbidden-origin");

  const client = getAnthropicClient();
  if (!client) {
    console.warn("[analyse] ANTHROPIC_API_KEY n'est pas définie : l'analyse est fermée.");
    return errorResponse("not-configured");
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > limits.maxUploadBytes + MULTIPART_OVERHEAD_BYTES) {
    return errorResponse("too-large");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("invalid-request");
  }
  const upload = await parseUpload(formData);
  if (!upload.ok) return errorResponse(upload.code);

  let quota: QuotaCheck;
  try {
    quota = await consumeAnalysisQuota(clientIp(request.headers));
  } catch (error) {
    // Sans compteur, pas d'analyse : la limite quotidienne protège aussi le coût.
    console.error("[analyse] compteur quotidien indisponible", error);
    return errorResponse("server-error");
  }
  if (quota.kind === "unavailable") {
    console.warn(
      quota.reason === "no-database"
        ? "[analyse] DATABASE_URL n'est pas définie : sans limite quotidienne, l'analyse reste fermée en production."
        : "[analyse] IP_HASH_SECRET manque ou fait moins de 32 caractères : l'analyse reste fermée en production.",
    );
    return errorResponse("not-configured");
  }
  if (quota.kind === "limited") return errorResponse("rate-limited");

  after(async () => {
    try {
      await purgeExpiredQuotas();
    } catch (error) {
      console.error("[analyse] nettoyage des compteurs impossible", error);
    }
  });

  const stream = createAnalysisStream({
    client,
    model: getExtractionModel(),
    documents: upload.documents,
    remaining: quota.remaining,
    refund: async () => {
      try {
        await refundAnalysisQuota(quota.ticket);
        return true;
      } catch (error) {
        console.error("[analyse] remboursement impossible", error);
        return false;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": NDJSON_CONTENT_TYPE,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      // Pas de mise en tampon par un proxy : chaque étape doit arriver tout de suite.
      "x-accel-buffering": "no",
    },
  });
}
