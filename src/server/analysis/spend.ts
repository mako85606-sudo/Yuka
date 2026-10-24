import "server-only";
import { eq, lt, sql } from "drizzle-orm";
import { limits } from "@/config/limits";
import type { Database } from "@/server/db/client";
import { llmSpend } from "@/server/db/schema";
import { parisDay } from "@/server/rate-limit";

/**
 * Plafond de dépense quotidien de l'API Claude. Chaque appel au modèle
 * (lecture réussie ou non, relance, estimation des prix) ajoute son coût au
 * total du jour ; au-delà de `limits.dailyLlmBudgetUsd`, l'analyse s'arrête
 * jusqu'au lendemain. C'est le dernier rempart si quelqu'un multiplie les
 * envois depuis de nombreuses adresses.
 */

/** Ajoute une dépense au total du jour (heure de Paris). */
export async function recordSpend(db: Database, usd: number, now: Date = new Date()): Promise<void> {
  if (!Number.isFinite(usd) || usd <= 0) return;
  await db
    .insert(llmSpend)
    .values({ day: parisDay(now), usd })
    .onConflictDoUpdate({
      target: llmSpend.day,
      set: { usd: sql`${llmSpend.usd} + excluded.usd`, updatedAt: sql`now()` },
    });
}

/** Dépense du jour, en dollars. */
export async function spentToday(db: Database, now: Date = new Date()): Promise<number> {
  const rows = await db.select({ usd: llmSpend.usd }).from(llmSpend).where(eq(llmSpend.day, parisDay(now)));
  return rows[0]?.usd ?? 0;
}

/** Vrai si le plafond du jour est atteint : plus de nouvelle analyse aujourd'hui. */
export async function overDailyBudget(
  db: Database,
  now: Date = new Date(),
  budgetUsd: number = limits.dailyLlmBudgetUsd,
): Promise<boolean> {
  return (await spentToday(db, now)) >= budgetUsd;
}

/** Garde un an de totaux quotidiens (pour `/admin`), pas plus. */
export async function purgeOldSpend(db: Database, now: Date = new Date()): Promise<void> {
  const limit = new Date(now.getTime() - 366 * 24 * 60 * 60 * 1000);
  await db.delete(llmSpend).where(lt(llmSpend.day, parisDay(limit)));
}
