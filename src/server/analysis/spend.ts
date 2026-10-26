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

/**
 * Réserve un montant sur le plafond du jour, avant tout appel au modèle. Une
 * seule requête atomique : l'ajout n'a lieu que si le nouveau total reste sous
 * le plafond, si bien que N analyses simultanées ne peuvent pas toutes passer
 * en lisant un total à 0 $. Renvoie vrai si la réservation est accordée, faux
 * si elle ferait dépasser le plafond (analyse en pause). Le montant est rendu
 * ensuite par `settleSpend` une fois le vrai coût connu.
 */
export async function reserveSpend(
  db: Database,
  reservationUsd: number,
  now: Date = new Date(),
  budgetUsd: number = limits.dailyLlmBudgetUsd,
): Promise<boolean> {
  if (!Number.isFinite(reservationUsd) || reservationUsd <= 0) return true;
  const day = parisDay(now);
  const rows = await db
    .insert(llmSpend)
    .values({ day, usd: reservationUsd })
    .onConflictDoUpdate({
      target: llmSpend.day,
      set: { usd: sql`${llmSpend.usd} + ${reservationUsd}`, updatedAt: sql`now()` },
      // Pas de ligne rendue = plafond atteint, la réservation est refusée.
      setWhere: sql`${llmSpend.usd} + ${reservationUsd} <= ${budgetUsd}`,
    })
    .returning({ usd: llmSpend.usd });
  return rows.length > 0;
}

/**
 * Solde une réservation une fois l'analyse finie : ajuste le total du jour de
 * `coût réel − réservation` (négatif = on rend le trop-réservé). Si l'appel au
 * modèle ne s'est pas terminé normalement (`trusted` faux : flux interrompu, où
 * le SDK ne compte pas les tokens de sortie), on ne descend jamais sous la
 * réservation — le coût réel y est alors sous-estimé.
 */
export async function settleSpend(
  db: Database,
  reservedUsd: number,
  actualUsd: number,
  trusted: boolean,
  now: Date = new Date(),
): Promise<void> {
  const effective = trusted ? actualUsd : Math.max(actualUsd, reservedUsd);
  const delta = effective - reservedUsd;
  if (!Number.isFinite(delta) || delta === 0) return;
  await db
    .update(llmSpend)
    .set({ usd: sql`greatest(${llmSpend.usd} + ${delta}, 0)`, updatedAt: sql`now()` })
    .where(eq(llmSpend.day, parisDay(now)));
}

/** Rend entièrement une réservation (aucun appel au modèle n'a eu lieu). */
export async function releaseSpend(db: Database, reservedUsd: number, now: Date = new Date()): Promise<void> {
  await settleSpend(db, reservedUsd, 0, true, now);
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
