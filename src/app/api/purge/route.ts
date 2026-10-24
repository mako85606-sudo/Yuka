import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/server/db/client";
import { serverEnv } from "@/server/env";
import { runPurges } from "@/server/maintenance";

/**
 * GET /api/purge : applique toutes les durées de conservation, chaque nuit
 * (tâche planifiée de Vercel, `vercel.json`), pour que l'effacement ne
 * dépende pas du trafic. Seulement avec `Authorization: Bearer <CRON_SECRET>` ;
 * sans secret configuré, la route n'existe pas.
 */
function status(code: number): Response {
  return new Response(null, { status: code, headers: { "cache-control": "no-store" } });
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return status(404);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!sameSecret(given, secret)) return status(401);
  const failures = await runPurges(getDb());
  return status(failures.length === 0 ? 204 : 500);
}
