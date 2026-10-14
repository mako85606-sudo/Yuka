import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { VerdictResult } from "@/lib/analysis/result";
import { runChecks } from "@/lib/checks";
import type { Extraction } from "@/lib/extraction/schema";
import { EMPTY_USAGE } from "@/lib/llm-cost";
import { analyses, priceLines } from "@/server/db/schema";
import { cleanExtraction, extractionWith, withLine } from "@/test/extraction";
import { createTestDb } from "@/test/test-db";
import {
  deleteAnalysis,
  ensureShareId,
  loadAnalysis,
  loadSharedAnalysis,
  newAnalysisId,
  purgeExpiredAnalyses,
  quoteFingerprint,
  saveAnalysis,
  type StoredResult,
} from "./store";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

const NOW = new Date("2026-10-13T10:00:00Z");
const verdict: VerdictResult = { verdict: "ok", savings: null, keyPoints: ["Les calculs sont justes."], overcharge: 0 };

function save(extraction: Extraction, now = NOW) {
  return saveAnalysis(db, {
    extraction,
    fingerprint: quoteFingerprint(extraction),
    findings: runChecks(extraction),
    prices: [],
    pricesComplete: true,
    verdict,
    usage: { ...EMPTY_USAGE, inputTokens: 1200, cacheReadTokens: 300, outputTokens: 500 },
    costUsd: 0.0074,
    now,
  });
}

function linesOf(analysisId: string) {
  return db.select().from(priceLines).where(eq(priceLines.analysisId, analysisId)).orderBy(priceLines.position);
}

describe("quoteFingerprint", () => {
  it("reconnaît un même devis relu avec des libellés différents", () => {
    const relabeled = withLine(1, { label: "Main d'oeuvre plombier" });
    expect(quoteFingerprint(relabeled)).toBe(quoteFingerprint(cleanExtraction));
  });

  it("distingue deux devis dont un prix ou la date change", () => {
    expect(quoteFingerprint(withLine(0, { unitPriceHT: 690 }))).not.toBe(quoteFingerprint(cleanExtraction));
    expect(quoteFingerprint(extractionWith({ meta: { quoteDate: "2026-09-15" } }))).not.toBe(
      quoteFingerprint(cleanExtraction),
    );
  });
});

describe("newAnalysisId", () => {
  it("tire 128 bits au hasard, sûrs dans une URL", () => {
    const ids = new Set(Array.from({ length: 50 }, newAnalysisId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});

describe("saveAnalysis", () => {
  it("enregistre la conclusion et les lignes anonymisées, jamais le devis", async () => {
    const extraction = extractionWith({
      meta: { quoteDate: "2026-08-01" },
      lines: [
        ...cleanExtraction.lines,
        { label: "Rappel : joindre M. Dupont au 06 12 34 56 78", confidence: "high", quantity: 1, unitPriceHT: 0, totalHT: 0 },
      ],
    });
    const saved = await save(extraction);
    expect(saved.counted).toBe(true);
    expect(saved.expiresAt.toISOString()).toBe("2026-11-12T10:00:00.000Z");

    const [row] = await db.select().from(analyses).where(eq(analyses.id, saved.id));
    expect(row).toMatchObject({
      category: "plomberie",
      department: "69",
      region: "ARA",
      verdict: "ok",
      llmCostUsd: 0.0074,
      llmInputTokens: 1500,
      llmOutputTokens: 500,
    });
    const result = row?.result as StoredResult;
    expect(result.version).toBe(1);
    expect(result.quote).not.toHaveProperty("lines");
    expect(result.quote.issuer.hasSiret).toBe(true);
    expect(result.verdict).toEqual(verdict);

    const lines = await linesOf(saved.id);
    expect(lines).toHaveLength(4);
    expect(lines.map((line) => line.comparable)).toEqual([true, true, true, false]);
    expect(lines[0]).toMatchObject({
      canonicalItem: "plomberie.chauffe-eau.fourniture.200l",
      comparableUnit: "unite",
      comparablePrice: 689,
      region: "ARA",
    });
    expect(lines[1]).toMatchObject({ comparableUnit: "heure", comparablePrice: 58, quantity: 3 });
    expect(lines[3]?.label).not.toMatch(/06 12|Dupont/);
  });

  it("ne compte qu'une fois un devis analysé deux fois", async () => {
    const extraction = extractionWith({ meta: { quoteDate: "2026-08-02" } });
    const first = await save(extraction);
    const second = await save(extraction, new Date(NOW.getTime() + 60_000));
    expect(first.counted).toBe(true);
    expect(second.counted).toBe(false);
    expect(second.id).not.toBe(first.id);
    const lines = await linesOf(second.id);
    expect(lines.every((line) => !line.comparable && line.comparablePrice === null)).toBe(true);
  });

  it("n'utilise pas pour comparer une ligne mal lue, ni un devis sans département", async () => {
    const misread = await save(
      extractionWith({
        meta: { quoteDate: "2026-08-03" },
        lines: cleanExtraction.lines.map((line, index) => (index === 0 ? { ...line, confidence: "low" } : line)),
      }),
    );
    expect((await linesOf(misread.id)).map((line) => line.comparable)).toEqual([false, true, true]);

    const nowhere = await save(extractionWith({ meta: { quoteDate: "2026-08-04", department: undefined } }));
    const [row] = await db.select().from(analyses).where(eq(analyses.id, nowhere.id));
    expect(row).toMatchObject({ department: null, region: null });
    expect((await linesOf(nowhere.id)).some((line) => line.comparable)).toBe(false);
  });
});

describe("loadAnalysis", () => {
  it("rouvre une analyse telle qu'elle a été conclue, lignes comprises", async () => {
    const extraction = extractionWith({ meta: { quoteDate: "2026-08-10" } });
    const saved = await save(extraction);
    const loaded = await loadAnalysis(db, saved.id, NOW);
    expect(loaded).not.toBeNull();
    expect(loaded?.extraction).toEqual(extraction);
    expect(loaded?.verdict).toEqual(verdict);
    expect(loaded?.findings).toEqual(runChecks(extraction));
    expect(loaded?.createdAt.toISOString()).toBe(NOW.toISOString());
  });

  it("ne rouvre ni une analyse expirée, ni un identifiant inconnu ou mal formé", async () => {
    const saved = await save(extractionWith({ meta: { quoteDate: "2026-08-11" } }));
    expect(await loadAnalysis(db, saved.id, new Date("2026-11-13T10:00:00Z"))).toBeNull();
    expect(await loadAnalysis(db, newAnalysisId(), NOW)).toBeNull();
    expect(await loadAnalysis(db, "../../etc/passwd", NOW)).toBeNull();
  });

  it("refuse un contenu enregistré illisible plutôt que d'afficher n'importe quoi", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const saved = await save(extractionWith({ meta: { quoteDate: "2026-08-12" } }));
    await db.update(analyses).set({ result: { version: 2 } }).where(eq(analyses.id, saved.id));
    expect(await loadAnalysis(db, saved.id, NOW)).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("partage", () => {
  it("crée un lien de partage à la demande, distinct du lien privé, toujours le même ensuite", async () => {
    const saved = await save(extractionWith({ meta: { quoteDate: "2026-08-20" } }));
    const shareId = await ensureShareId(db, saved.id, NOW);
    expect(shareId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(shareId).not.toBe(saved.id);
    expect(await ensureShareId(db, saved.id, NOW)).toBe(shareId);

    const shared = await loadSharedAnalysis(db, shareId ?? "", NOW);
    expect(shared).toMatchObject({ id: saved.id, shareId, region: "ARA" });
    // Le lien de partage n'ouvre pas l'analyse privée, et inversement.
    expect(await loadAnalysis(db, shareId ?? "", NOW)).toBeNull();
    expect(await loadSharedAnalysis(db, saved.id, NOW)).toBeNull();
  });

  it("ne partage ni une analyse inconnue, ni une analyse expirée", async () => {
    expect(await ensureShareId(db, newAnalysisId(), NOW)).toBeNull();
    const saved = await save(extractionWith({ meta: { quoteDate: "2026-08-21" } }));
    const shareId = await ensureShareId(db, saved.id, NOW);
    const later = new Date("2026-11-13T10:00:00Z");
    expect(await loadSharedAnalysis(db, shareId ?? "", later)).toBeNull();
    expect(await ensureShareId(db, saved.id, later)).toBeNull();
  });
});

describe("deleteAnalysis", () => {
  it("supprime l'analyse et son lien de partage, garde les lignes anonymes détachées", async () => {
    const saved = await save(extractionWith({ meta: { quoteDate: "2026-08-25" } }));
    const shareId = await ensureShareId(db, saved.id, NOW);
    expect(await deleteAnalysis(db, saved.id)).toBe(true);
    expect(await loadAnalysis(db, saved.id, NOW)).toBeNull();
    expect(await loadSharedAnalysis(db, shareId ?? "", NOW)).toBeNull();
    const lines = await db.select().from(priceLines).where(eq(priceLines.fingerprint, quoteFingerprint(extractionWith({ meta: { quoteDate: "2026-08-25" } }))));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.analysisId === null)).toBe(true);
    expect(await deleteAnalysis(db, saved.id)).toBe(false);
    expect(await deleteAnalysis(db, "pas-un-identifiant")).toBe(false);
  });
});

describe("purgeExpiredAnalyses", () => {
  it("efface les analyses de plus de 30 jours et garde leurs lignes, détachées, 24 mois", async () => {
    const old = await save(extractionWith({ meta: { quoteDate: "2026-07-01" } }), new Date("2026-09-01T10:00:00Z"));
    const ancient = await save(extractionWith({ meta: { quoteDate: "2024-07-01" } }), new Date("2024-09-01T10:00:00Z"));
    const recent = await save(extractionWith({ meta: { quoteDate: "2026-10-01" } }));

    await purgeExpiredAnalyses(db, NOW);

    const remaining = (await db.select({ id: analyses.id }).from(analyses)).map((row) => row.id);
    expect(remaining).toContain(recent.id);
    expect(remaining).not.toContain(old.id);
    expect(remaining).not.toContain(ancient.id);

    const detached = await db.select().from(priceLines).where(eq(priceLines.fingerprint, quoteFingerprint(extractionWith({ meta: { quoteDate: "2026-07-01" } }))));
    expect(detached).toHaveLength(3);
    expect(detached.every((line) => line.analysisId === null && line.comparable)).toBe(true);

    const gone = await db.select().from(priceLines).where(eq(priceLines.fingerprint, quoteFingerprint(extractionWith({ meta: { quoteDate: "2024-07-01" } }))));
    expect(gone).toHaveLength(0);
  });
});
