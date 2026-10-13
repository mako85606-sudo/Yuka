import { afterAll, describe, expect, it } from "vitest";
import type { VerdictResult } from "@/lib/analysis/result";
import type { Extraction } from "@/lib/extraction/schema";
import { EMPTY_USAGE } from "@/lib/llm-cost";
import { ensureShareId, quoteFingerprint, saveAnalysis } from "@/server/analysis/store";
import { signups } from "@/server/db/schema";
import { recordEvent } from "@/server/events/record";
import { extractionWith } from "@/test/extraction";
import { createTestDb } from "@/test/test-db";
import { adminStats, periodDays } from "./stats";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

const NOW = new Date("2026-10-13T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
let counter = 0;

async function analysis(category: Extraction["category"], verdict: VerdictResult["verdict"], daysAgo: number, cost: number) {
  counter += 1;
  const extraction = extractionWith({ category, meta: { quoteDate: `2026-07-${String(counter).padStart(2, "0")}` } });
  return saveAnalysis(db, {
    extraction,
    fingerprint: quoteFingerprint(extraction),
    findings: [],
    prices: [],
    pricesComplete: true,
    verdict: { verdict, savings: null, keyPoints: [], overcharge: 0 },
    usage: { ...EMPTY_USAGE, inputTokens: 1000, outputTokens: 400 },
    costUsd: cost,
    now: new Date(NOW.getTime() - daysAgo * DAY),
  });
}

function visit(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

describe("adminStats", () => {
  it("compte les analyses par jour, par verdict et par catégorie, sur 30 jours", async () => {
    const first = await analysis("auto", "alert", 0, 0.02);
    await analysis("auto", "ok", 0, 0.01);
    await analysis("plomberie", "negotiate", 2, 0.03);
    await analysis("plomberie", "negotiate", 40, 0.5); // hors période
    await ensureShareId(db, first.id, NOW);

    await recordEvent({ name: "landing_view", visit: visit(1), props: {} }, { db, posthog: null }, NOW);
    await recordEvent({ name: "landing_view", visit: visit(2), props: {} }, { db, posthog: null }, NOW);
    await recordEvent({ name: "landing_view", visit: visit(2), props: {} }, { db, posthog: null }, NOW);
    await recordEvent({ name: "upload_started", visit: visit(2), props: { pages: 1, kind: "pdf" } }, { db, posthog: null }, NOW);
    await recordEvent(
      { name: "analysis_failed", visit: visit(2), props: { step: "reading", code: "reading-failed" } },
      { db, posthog: null },
      NOW,
    );
    await db.insert(signups).values([
      { email: "a@exemple.fr", source: "landing" },
      { email: "b@exemple.fr", source: "detailed_report" },
    ]);

    const stats = await adminStats(db, NOW);
    expect(stats.days).toHaveLength(30);
    expect(stats.days.at(-1)).toEqual({ day: "2026-10-13", count: 2 });
    expect(stats.days.at(-3)).toEqual({ day: "2026-10-11", count: 1 });
    expect(stats.total).toBe(3);
    expect(stats.verdicts).toEqual({ ok: 1, negotiate: 1, alert: 1 });
    expect(stats.categories.map((entry) => [entry.category, entry.total])).toEqual([
      ["auto", 2],
      ["plomberie", 1],
    ]);
    expect(stats.cost.average).toBeCloseTo(0.02, 6);
    expect(stats.cost.total).toBeCloseTo(0.06, 6);
    expect(stats.cost.averageInputTokens).toBe(1000);
    expect(stats.funnel.slice(0, 3)).toEqual([
      { name: "landing_view", visits: 2 },
      { name: "upload_started", visits: 1 },
      { name: "upload_completed", visits: 0 },
    ]);
    expect(stats.failures).toEqual([{ step: "reading", code: "reading-failed", count: 1 }]);
    expect(stats.signups).toEqual({ landing: 1, detailed_report: 1 });
    expect(stats.shares).toBe(1);
  });

  it("donne trente jours consécutifs, heure de Paris", () => {
    const days = periodDays(new Date("2026-10-25T23:30:00Z"));
    expect(days.at(-1)).toBe("2026-10-26");
    expect(days[0]).toBe("2026-09-27");
    expect(new Set(days).size).toBe(30);
  });
});
