import { after } from "next/server";
import { limits } from "@/config/limits";
import {
  NDJSON_CONTENT_TYPE,
  type AnalysisErrorCode,
  type AnalyzeErrorBody,
} from "@/lib/analysis/events";
import { ERROR_MESSAGES, MISSING_API_KEY_DEV_MESSAGE } from "@/lib/analysis/messages";
import { clientIp } from "@/lib/client-ip";
import { createAnalysisStream } from "@/server/analysis/analysis-stream";
import { readBodyCapped } from "@/server/analysis/body";
import { releaseSpend, reserveSpend, settleSpend } from "@/server/analysis/spend";
import { isSameOrigin, parseUpload, prepareDocuments, statusFor } from "@/server/analysis/upload";
import { getAnthropicClient, getExtractionModel } from "@/server/anthropic";
import { getDb } from "@/server/db/client";
import { errorSummary } from "@/server/log";
import { runPurges } from "@/server/maintenance";
import { consumeAnalysisQuota, refundAnalysisQuota, type QuotaCheck } from "@/server/rate-limit";

/**
 * POST /api/analyze : reçoit un devis (photos ou PDF) et streame les étapes
 * réelles de son analyse, en NDJSON.
 *
 * Le devis reste en mémoire le temps de la requête : il n'est écrit ni sur
 * disque, ni en base, ni dans les journaux.
 */

// Deux tentatives de lecture au plus (50 s chacune), puis l'estimation des
// prix dans le temps restant (`limits.analysisBudgetMs`, 110 s en tout).
// TODO: vérifier — la durée maximale accordée dépend du plan Vercel (et de
// Fluid compute) ; 120 s doit y être autorisé.
export const maxDuration = 120;

/** Marge pour l'enveloppe multipart autour des fichiers. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function errorResponse(code: AnalysisErrorCode, message: string = ERROR_MESSAGES[code]): Response {
  const body: AnalyzeErrorBody = { error: { code, message } };
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
    // En développement, on dit quoi faire ; le site en ligne garde le message public.
    return process.env.NODE_ENV === "development"
      ? errorResponse("not-configured", MISSING_API_KEY_DEV_MESSAGE)
      : errorResponse("not-configured");
  }

  // Jamais plus que la limite en mémoire, même si la taille annoncée manque ou ment.
  const body = await readBodyCapped(request, limits.maxUploadBytes + MULTIPART_OVERHEAD_BYTES);
  if (!body.ok) return errorResponse(body.reason === "too-large" ? "too-large" : "invalid-request");

  let formData: FormData;
  try {
    formData = await new Response(body.bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return errorResponse("invalid-request");
  }
  // Contrôles bon marché seulement : on n'ouvre aucun PDF avant d'avoir pris le
  // quota et réservé le budget (un PDF piégé ne doit rien coûter d'abord).
  const upload = await parseUpload(formData);
  if (!upload.ok) return errorResponse(upload.code);

  const db = getDb();

  // Quota par adresse IP (avant la réservation de budget).
  let quota: QuotaCheck;
  try {
    quota = await consumeAnalysisQuota(clientIp(request.headers));
  } catch (error) {
    // Sans compteur, pas d'analyse : la limite quotidienne protège aussi le coût.
    console.error(`[analyse] compteur quotidien indisponible : ${errorSummary(error)}`);
    return errorResponse("server-error");
  }
  if (quota.kind === "unavailable") {
    console.warn(
      quota.reason === "no-database"
        ? "[analyse] DATABASE_URL n'est pas définie : sans limite quotidienne, l'analyse reste fermée hors développement."
        : "[analyse] IP_HASH_SECRET manque ou fait moins de 32 caractères : l'analyse reste fermée hors développement.",
    );
    return errorResponse("not-configured");
  }
  if (quota.kind === "limited") return errorResponse("rate-limited");

  const refundQuota = async () => {
    try {
      await refundAnalysisQuota(quota.ticket);
      return true;
    } catch (error) {
      console.error(`[analyse] remboursement impossible : ${errorSummary(error)}`);
      return false;
    }
  };

  // Réservation atomique du budget du jour, après le quota. Refusée = plafond
  // atteint : l'analyse est en pause et le quota est rendu (pas la faute du
  // visiteur). Sans base, pas de plafond (développement).
  const reservationUsd = db ? limits.llmSpendReservationUsd : 0;
  // Le solde se fait sur le jour de la réservation, même si l'analyse finit après minuit.
  const reservedAt = new Date();
  if (db) {
    try {
      if (!(await reserveSpend(db, reservationUsd, reservedAt))) {
        console.warn("[analyse] plafond de dépense du jour atteint : analyses en pause jusqu'à demain.");
        await refundQuota();
        return errorResponse("paused");
      }
    } catch (error) {
      console.error(`[analyse] réservation de budget impossible : ${errorSummary(error)}`);
      await refundQuota();
      return errorResponse("server-error");
    }
  }

  // Nettoyage des PDF (garde anti-bombe, pages, chiffrement, métadonnées), une
  // fois le quota pris. Un fichier refusé ici est la faute du client : le quota
  // n'est pas rendu, mais la réservation de budget l'est.
  const prepared = await prepareDocuments(upload.documents);
  if (!prepared.ok) {
    if (db) {
      try {
        await releaseSpend(db, reservationUsd, reservedAt);
      } catch (error) {
        console.error(`[analyse] réservation de budget non rendue : ${errorSummary(error)}`);
      }
    }
    return errorResponse(prepared.code);
  }

  after(async () => {
    await runPurges(db);
  });

  const stream = createAnalysisStream({
    client,
    model: getExtractionModel(),
    documents: prepared.documents,
    db,
    remaining: quota.remaining,
    refund: refundQuota,
    settleSpend: db
      ? async (actualUsd, trusted) => {
          try {
            await settleSpend(db, reservationUsd, actualUsd, trusted, reservedAt);
          } catch (error) {
            console.error(`[analyse] réservation de budget non soldée : ${errorSummary(error)}`);
          }
        }
      : undefined,
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
