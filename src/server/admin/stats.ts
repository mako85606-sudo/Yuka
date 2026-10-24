import "server-only";
import { and, count, eq, gte, isNotNull, sql } from "drizzle-orm";
import { limits } from "@/config/limits";
import type { Category } from "@/config/taxonomy";
import { FUNNEL, type EventName } from "@/lib/events";
import type { Verdict } from "@/lib/scene-quote";
import { spentToday } from "@/server/analysis/spend";
import type { Database } from "@/server/db/client";
import { analyses, events, llmSpend, signups } from "@/server/db/schema";
import { parisDay } from "@/server/rate-limit";

/**
 * Chiffres de `/admin`, sur les 30 derniers jours (la durée de vie d'une
 * analyse). Rien de personnel : des comptes, des moyennes, des étapes.
 */

export const STATS_DAYS = 30;

export interface DayCount {
  readonly day: string;
  readonly count: number;
}

export interface CategoryCount {
  readonly category: Category;
  readonly total: number;
  readonly verdicts: Record<Verdict, number>;
}

export interface FunnelStep {
  readonly name: EventName;
  readonly visits: number;
}

export interface Failure {
  readonly step: string;
  readonly code: string;
  readonly count: number;
}

export interface AdminStats {
  readonly since: Date;
  readonly days: readonly DayCount[];
  readonly total: number;
  readonly verdicts: Record<Verdict, number>;
  readonly categories: readonly CategoryCount[];
  readonly cost: {
    readonly average: number | null;
    readonly total: number;
    readonly averageInputTokens: number | null;
    readonly averageOutputTokens: number | null;
    /** Dépense du jour (heure de Paris), lectures ratées comprises, et le plafond quotidien. */
    readonly today: number;
    readonly dailyBudget: number;
    /** Dépense de la période, lectures ratées comprises (pas seulement les analyses enregistrées). */
    readonly periodSpend: number;
  };
  readonly funnel: readonly FunnelStep[];
  readonly failures: readonly Failure[];
  readonly signups: Readonly<Record<string, number>>;
  readonly shares: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Les jours de la période, du plus ancien au plus récent, heure de Paris. */
export function periodDays(now: Date, days = STATS_DAYS): string[] {
  return Array.from({ length: days }, (_, index) => parisDay(new Date(now.getTime() - (days - 1 - index) * DAY_MS)));
}

function emptyVerdicts(): Record<Verdict, number> {
  return { ok: 0, negotiate: 0, alert: 0 };
}

function isVerdict(value: string): value is Verdict {
  return value === "ok" || value === "negotiate" || value === "alert";
}

export async function adminStats(db: Database, now = new Date()): Promise<AdminStats> {
  const since = new Date(now.getTime() - STATS_DAYS * DAY_MS);
  const recent = gte(analyses.createdAt, since);
  const parisDate = sql<string>`to_char(${analyses.createdAt} at time zone 'Europe/Paris', 'YYYY-MM-DD')`;

  const [perDay, perCategory, [cost], perEvent, failures, perSource, [shared], [spend], today] = await Promise.all([
    db.select({ day: parisDate, count: count() }).from(analyses).where(recent).groupBy(parisDate),
    db
      .select({ category: analyses.category, verdict: analyses.verdict, count: count() })
      .from(analyses)
      .where(recent)
      .groupBy(analyses.category, analyses.verdict),
    db
      .select({
        average: sql<number | null>`avg(${analyses.llmCostUsd})::float8`,
        total: sql<number>`coalesce(sum(${analyses.llmCostUsd}), 0)::float8`,
        input: sql<number | null>`avg(${analyses.llmInputTokens})::float8`,
        output: sql<number | null>`avg(${analyses.llmOutputTokens})::float8`,
      })
      .from(analyses)
      .where(recent),
    db
      .select({ name: events.name, visits: sql<number>`count(distinct ${events.visit})::int` })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(events.name),
    db
      .select({
        step: sql<string>`coalesce(${events.props}->>'step', '?')`,
        code: sql<string>`coalesce(${events.props}->>'code', '?')`,
        count: count(),
      })
      .from(events)
      .where(and(eq(events.name, "analysis_failed"), gte(events.createdAt, since)))
      .groupBy(sql`1`, sql`2`),
    db.select({ source: signups.source, count: count() }).from(signups).groupBy(signups.source),
    db.select({ count: count() }).from(analyses).where(and(recent, isNotNull(analyses.shareId))),
    db
      .select({ total: sql<number>`coalesce(sum(${llmSpend.usd}), 0)::float8` })
      .from(llmSpend)
      .where(gte(llmSpend.day, parisDay(since))),
    spentToday(db, now),
  ]);

  const byDay = new Map(perDay.map((row) => [row.day, row.count]));
  const verdicts = emptyVerdicts();
  const categories = new Map<string, CategoryCount>();
  for (const row of perCategory) {
    if (!isVerdict(row.verdict)) continue;
    verdicts[row.verdict] += row.count;
    const entry = categories.get(row.category) ?? {
      category: row.category as Category,
      total: 0,
      verdicts: emptyVerdicts(),
    };
    categories.set(row.category, {
      ...entry,
      total: entry.total + row.count,
      verdicts: { ...entry.verdicts, [row.verdict]: entry.verdicts[row.verdict] + row.count },
    });
  }
  const visits = new Map(perEvent.map((row) => [row.name, row.visits]));

  return {
    since,
    days: periodDays(now).map((day) => ({ day, count: byDay.get(day) ?? 0 })),
    total: verdicts.ok + verdicts.negotiate + verdicts.alert,
    verdicts,
    categories: [...categories.values()].sort((a, b) => b.total - a.total),
    cost: {
      average: cost?.average ?? null,
      total: cost?.total ?? 0,
      averageInputTokens: cost?.input ?? null,
      averageOutputTokens: cost?.output ?? null,
      today,
      dailyBudget: limits.dailyLlmBudgetUsd,
      periodSpend: spend?.total ?? 0,
    },
    funnel: FUNNEL.map((name) => ({ name, visits: visits.get(name) ?? 0 })),
    failures: failures.sort((a, b) => b.count - a.count),
    signups: Object.fromEntries(perSource.map((row) => [row.source, row.count])),
    shares: shared?.count ?? 0,
  };
}
