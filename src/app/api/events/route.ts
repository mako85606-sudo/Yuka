import { after } from "next/server";
import { MAX_EVENT_BYTES, parseTrackedEvent } from "@/lib/events";
import { isSameOrigin } from "@/server/analysis/upload";
import { getDb } from "@/server/db/client";
import { isProductionDeployment } from "@/server/env";
import { getPostHog } from "@/server/events/posthog";
import { recordEvent } from "@/server/events/record";

/**
 * POST /api/events : un événement de mesure, envoyé par le navigateur.
 * Seulement depuis le site, seulement les événements de la liste fermée,
 * seulement leurs propriétés permises. La réponse part tout de suite ;
 * l'enregistrement se fait après.
 */
function status(code: number): Response {
  return new Response(null, { status: code, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request.headers)) return status(403);
  if (Number(request.headers.get("content-length") ?? "0") > MAX_EVENT_BYTES) return status(413);

  let body: string;
  try {
    body = await request.text();
  } catch {
    return status(400);
  }
  if (body.length > MAX_EVENT_BYTES) return status(413);

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return status(400);
  }
  const event = parseTrackedEvent(value);
  if (!event) return status(400);

  const sinks = { db: getDb(), posthog: getPostHog() };
  if (!sinks.db && !sinks.posthog && !isProductionDeployment()) {
    console.info(`[mesure] ${event.name} ${JSON.stringify(event.props)} (ni base ni PostHog : rien n'est gardé)`);
  }
  after(() => recordEvent(event, sinks));
  return status(204);
}
