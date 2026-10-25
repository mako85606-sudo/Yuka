import "server-only";
import { purgeExpiredAnalyses } from "@/server/analysis/store";
import { purgeOldSpend } from "@/server/analysis/spend";
import type { Database } from "@/server/db/client";
import { purgeOldEvents } from "@/server/events/record";
import { errorSummary } from "@/server/log";
import { purgeExpiredQuotas } from "@/server/rate-limit";
import { purgeOldSignups } from "@/server/signups";

/**
 * Toutes les durées de conservation, appliquées d'un coup : compteurs
 * quotidiens (2 jours), analyses (30 jours), lignes de prix (24 mois),
 * événements de mesure (13 mois), inscriptions (3 ans), dépenses (1 an).
 * Lancé après chaque analyse et chaque nuit (`/api/purge`), pour que
 * l'effacement ne dépende pas du trafic. Une purge en échec n'empêche pas les
 * suivantes.
 */
export async function runPurges(db: Database | null, now: Date = new Date()): Promise<readonly string[]> {
  const failures: string[] = [];
  const attempt = async (name: string, task: () => Promise<void>) => {
    try {
      await task();
    } catch (error) {
      failures.push(name);
      console.error(`[conservation] ${name} : nettoyage impossible : ${errorSummary(error)}`);
    }
  };
  await attempt("compteurs", () => purgeExpiredQuotas(now));
  if (db) {
    await attempt("analyses", () => purgeExpiredAnalyses(db, now));
    await attempt("événements", () => purgeOldEvents(db, now));
    await attempt("inscriptions", () => purgeOldSignups(db, now));
    await attempt("dépenses", () => purgeOldSpend(db, now));
  }
  return failures;
}
