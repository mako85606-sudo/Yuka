/**
 * Évalue la lecture des devis de test : chaque PDF de `src/fixtures/quotes`
 * passe par la vraie chaîne d'extraction (même modèle, mêmes consignes que
 * le site), puis la lecture est comparée à sa vérité terrain, champ par champ.
 *
 *   npm run eval:extraction               tous les devis
 *   npm run eval:extraction -- 02         seulement ceux dont l'identifiant commence par « 02 »
 *
 * Il faut une clé dans .env.local (ANTHROPIC_API_KEY). Chaque devis coûte un
 * appel au modèle : quelques centimes en tout. Un rapport détaillé est écrit
 * dans eval-results/ (ignoré par git).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { quoteFixtures, type QuoteFixture } from "@/fixtures/quotes/definitions";
import {
  compareExtraction,
  findLeaks,
  tallyByField,
  type FieldResult,
} from "@/lib/eval/compare-extraction";
import type { Extraction } from "@/lib/extraction/schema";
import { getAnthropicClient, getExtractionModel } from "@/server/anthropic";
import { extractQuote, type ExtractionOutcome } from "@/server/extraction/extract-quote";

loadEnvConfig(process.cwd());

const QUOTES_DIR = path.join(process.cwd(), "src", "fixtures", "quotes");
const REPORT_DIR = path.join(process.cwd(), "eval-results");

const percentFormat = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const secondsFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const dollarsFormat = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

interface Truth {
  readonly id: string;
  readonly expectedOutcome: "extracted" | "health";
  readonly extraction: Extraction | null;
}

interface FixtureReport {
  readonly id: string;
  readonly outcome: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly costUsd: number | null;
  readonly results: readonly FieldResult[];
  readonly leaks: readonly string[];
}

function describeOutcome(outcome: ExtractionOutcome): string {
  if (outcome.kind === "extracted") return `lu, ${outcome.extraction.lines.length} lignes`;
  if (outcome.kind === "stopped") return `arrêté (${outcome.reason})`;
  return `échec (${outcome.reason})`;
}

/** Valeurs personnelles imprimées sur le devis : aucune ne doit ressortir de la lecture. */
function personalValues(fixture: QuoteFixture): string[] {
  const { company, client } = fixture;
  const clientName = client.name.replace(/\b(M\.|Mme|Mlle|et)\s+/g, "").trim();
  const plates = (fixture.extraInfo ?? []).flatMap((info) => info.match(/[A-Z]{2}-\d{3}-[A-Z]{2}/g) ?? []);
  return [
    company.name,
    company.street,
    company.phone,
    company.email,
    company.siret,
    company.siret?.replace(/\s/g, ""),
    client.street,
    clientName,
    fixture.number,
    ...plates,
  ].filter((value): value is string => Boolean(value));
}

function pad(text: string, width: number): string {
  return text.length >= width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);
}

async function main() {
  const client = getAnthropicClient();
  if (!client) {
    console.error(
      "ANTHROPIC_API_KEY n'est pas définie. Ajoute-la dans .env.local (voir .env.example), puis relance.",
    );
    process.exitCode = 1;
    return;
  }
  const model = getExtractionModel();
  const filter = process.argv[2];
  const fixtures = quoteFixtures.filter((fixture) => !filter || fixture.id.startsWith(filter));
  if (fixtures.length === 0) {
    console.error(`Aucun devis ne commence par « ${filter} ».`);
    process.exitCode = 1;
    return;
  }

  console.log(`Évaluation de la lecture · ${model} · ${fixtures.length} devis\n`);
  const reports: FixtureReport[] = [];

  for (const fixture of fixtures) {
    process.stdout.write(`${pad(fixture.id, 30)} `);
    const data = new Uint8Array(await readFile(path.join(QUOTES_DIR, `${fixture.id}.pdf`)));
    const truth = JSON.parse(
      await readFile(path.join(QUOTES_DIR, `${fixture.id}.truth.json`), "utf8"),
    ) as Truth;
    const outcome = await extractQuote({ client, model, documents: [{ kind: "pdf", data }] });

    let results: FieldResult[] = [];
    let leaks: string[] = [];
    let passed: boolean;
    if (truth.expectedOutcome === "health") {
      passed = outcome.kind === "stopped" && outcome.reason === "health";
      results = [{ field: "refus santé", ok: passed, expected: "health", actual: describeOutcome(outcome) }];
    } else if (outcome.kind === "extracted" && truth.extraction) {
      results = compareExtraction(truth.extraction, outcome.extraction);
      leaks = findLeaks(outcome.extraction, personalValues(fixture));
      passed = results.every((result) => result.ok) && leaks.length === 0;
    } else {
      // Pas de lecture : tous les champs attendus comptent faux.
      results =
        truth.extraction === null
          ? []
          : compareExtraction(truth.extraction, truth.extraction).map((result) => ({
              ...result,
              ok: false,
              actual: undefined,
            }));
      passed = false;
    }

    const correct = results.filter((result) => result.ok).length;
    const cost = outcome.run.costUsd === null ? "coût inconnu" : `${dollarsFormat.format(outcome.run.costUsd)} $`;
    console.log(
      `${pad(describeOutcome(outcome), 26)} ${String(correct).padStart(3)}/${String(results.length).padEnd(3)} ` +
        `${secondsFormat.format(outcome.run.durationMs / 1000).padStart(5)} s  ${cost}` +
        (leaks.length > 0 ? `  ⚠ données personnelles : ${leaks.join(", ")}` : ""),
    );
    reports.push({
      id: fixture.id,
      outcome: describeOutcome(outcome),
      passed,
      durationMs: outcome.run.durationMs,
      costUsd: outcome.run.costUsd,
      results,
      leaks,
    });
  }

  const allResults = reports.flatMap((report) => report.results);
  console.log("\nPrécision par champ");
  for (const tally of tallyByField(allResults)) {
    const rate = tally.total === 0 ? 0 : tally.correct / tally.total;
    const flag = tally.correct < tally.total ? "  ←" : "";
    console.log(
      `  ${pad(tally.field, 28)} ${String(tally.correct).padStart(3)}/${String(tally.total).padEnd(3)} ${percentFormat.format(rate).padStart(7)}${flag}`,
    );
  }

  const misses = reports.flatMap((report) =>
    report.results.filter((result) => !result.ok).map((result) => ({ id: report.id, ...result })),
  );
  if (misses.length > 0) {
    console.log("\nÉcarts");
    for (const miss of misses.slice(0, 40)) {
      console.log(
        `  ${pad(miss.id, 28)} ${pad(miss.field, 22)} attendu ${JSON.stringify(miss.expected)}, lu ${JSON.stringify(miss.actual)}`,
      );
    }
    if (misses.length > 40) console.log(`  … et ${misses.length - 40} autres (voir le rapport).`);
  }

  const correct = allResults.filter((result) => result.ok).length;
  const totalCost = reports.reduce((sum, report) => sum + (report.costUsd ?? 0), 0);
  const totalSeconds = reports.reduce((sum, report) => sum + report.durationMs, 0) / 1000;
  const leaksFound = reports.some((report) => report.leaks.length > 0);
  console.log(
    `\nTotal : ${correct}/${allResults.length} champs justes (${percentFormat.format(
      allResults.length === 0 ? 0 : correct / allResults.length,
    )}) · ${reports.filter((report) => report.passed).length}/${reports.length} devis parfaits · ` +
      `${dollarsFormat.format(totalCost)} $ · ${secondsFormat.format(totalSeconds)} s`,
  );
  console.log(
    leaksFound
      ? "Vie privée : des données personnelles ont été recopiées (voir ci-dessus)."
      : "Vie privée : aucune donnée personnelle recopiée.",
  );

  await mkdir(REPORT_DIR, { recursive: true });
  const reportPath = path.join(
    REPORT_DIR,
    `extraction-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(reportPath, `${JSON.stringify({ model, reports }, null, 2)}\n`);
  console.log(`Rapport détaillé : ${path.relative(process.cwd(), reportPath)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
