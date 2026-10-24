import { after } from "next/server";
import { MAX_EVENT_BYTES, parseTrackedEvent } from "@/lib/events";
import { limits } from "@/config/limits";
import { clientIp } from "@/lib/client-ip";
import { readBodyCapped } from "@/server/analysis/body";
import { isSameOrigin } from "@/server/analysis/upload";
import { getDb } from "@/server/db/client";
import { developmentFallbacksAllowed } from "@/server/env";
import { getPostHog } from "@/server/events/posthog";
import { recordEvent } from "@/server/events/record";
import { consumeNamedQuota } from "@/server/rate-limit";

/**
 * POST /api/events : un événement de mesure, envoyé par le navigateur.
 * Seulement depuis le site, seulement les événements de la liste fermée,
 * seulement leurs propriétés permises, `limits.eventsPerDay` par jour et par
 * adresse au plus (au-delà, rien n'est gardé). La réponse part tout de suite ;
 * l'enregistrement se fait après.
 */
function status(code: number): Response {
  return new Response(null, { status: code, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request.headers)) return status(403);
  // Rien n'est lu au-delà de la taille permise, même si la taille annoncée manque ou ment.
  const read = await readBodyCapped(request, MAX_EVENT_BYTES);
  if (!read.ok) return status(read.reason === "too-large" ? 413 : 400);
  const body = new TextDecoder().decode(read.bytes);

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return status(400);
  }
  const event = parseTrackedEvent(value);
  if (!event) return status(400);

  const sinks = { db: getDb(), posthog: getPostHog() };
  if (!sinks.db && !sinks.posthog && developmentFallbacksAllowed()) {
    console.info(`[mesure] ${event.name} ${JSON.stringify(event.props)} (ni base ni PostHog : rien n'est gardé)`);
  }
  const ip = clientIp(request.headers);
  after(async () => {
    // Au-delà du quota du jour, on répond pareil mais on ne garde rien.
    if (!(await consumeNamedQuota("events", ip, limits.eventsPerDay))) return;
    await recordEvent(event, sinks);
  });
  return status(204);
}
