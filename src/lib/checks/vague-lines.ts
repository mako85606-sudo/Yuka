import { VAGUE_WORDS, checksConfig } from "@/config/checks";
import type { Finding } from "@/lib/analysis/result";
import type { ExtractedLine, Extraction } from "@/lib/extraction/schema";
import { roundCents } from "@/lib/scene-quote";
import { fr } from "@/lib/typography";
import { isSure } from "./shared";

const STOP_WORDS = new Set(["de", "du", "des", "et", "la", "le", "les", "en", "pour", "sur", "au", "aux", "un", "une"]);
const VAGUE = new Set(VAGUE_WORDS);

function significantWords(label: string): string[] {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function lineAmount(line: ExtractedLine): number | undefined {
  if (line.totalHT !== undefined) return line.totalHT;
  if (line.quantity !== undefined && line.unitPriceHT !== undefined) {
    return roundCents(line.quantity * line.unitPriceHT);
  }
  return undefined;
}

/**
 * Une ligne est vague quand aucun de ses mots ne dit ce qui est facturé
 * (« Forfait divers », « Fournitures ») et qu'elle pèse assez pour qu'on
 * demande le détail.
 */
export function isVagueLine(line: ExtractedLine): boolean {
  const words = significantWords(line.label);
  if (words.length === 0 || !words.every((word) => VAGUE.has(word))) return false;
  const amount = lineAmount(line);
  return amount !== undefined && amount >= checksConfig.vagueLineMinAmount;
}

export function checkVagueLines(extraction: Extraction): Finding[] {
  const findings: Finding[] = [];
  extraction.lines.forEach((line, index) => {
    if (!isVagueLine(line)) return;
    findings.push({
      id: `vague-line-${index}`,
      ruleId: "vague-line",
      kind: "warning",
      confirmed: isSure(line.confidence),
      lineIndex: index,
      note: fr("Un forfait pour quoi ?"),
      detail: fr(
        `Ligne vague : « ${line.label} » ne précise pas ce qui est facturé. Demande le détail avant de signer.`,
      ),
      amount: lineAmount(line),
      ruleVerified: true,
    });
  });
  return findings;
}
