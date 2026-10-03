import { partialParse } from "@anthropic-ai/sdk/_vendor/partial-json-parser/parser.js";
import { describe, expect, it } from "vitest";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import { earlyStop, readProgress } from "@/lib/extraction/progress";

const json = JSON.stringify(sampleExtraction);

/** Instantané tel que le SDK le fournit après `length` caractères reçus. */
function snapshotAt(length: number): unknown {
  return partialParse(json.slice(0, length));
}

describe("readProgress", () => {
  it("ne voit rien avant le premier champ complet", () => {
    expect(readProgress(snapshotAt(10))).toEqual({
      documentKind: undefined,
      category: undefined,
      readability: undefined,
      header: undefined,
      lines: [],
    });
  });

  it("connaît la catégorie dès qu'elle est écrite, avant tout le reste", () => {
    const end = json.indexOf('"readability"');
    const progress = readProgress(snapshotAt(end));
    expect(progress.category).toBe("plomberie");
    expect(progress.header).toBeUndefined();
  });

  it("donne l'en-tête dès que la liste des lignes commence", () => {
    const start = json.indexOf('"lines":[') + '"lines":['.length;
    expect(readProgress(snapshotAt(start - 2)).header).toBeUndefined();
    expect(readProgress(snapshotAt(start)).header).toEqual({
      documentKind: "devis",
      category: "plomberie",
      readability: "good",
      subject: "Remplacement d'un chauffe-eau électrique",
      quoteDate: "2026-09-12",
      validityDays: 30,
      department: "69",
    });
  });

  it("ne livre une ligne que lorsqu'elle est complète", () => {
    const secondLine = json.indexOf('{"label":"Forfait divers"');
    // Juste avant la deuxième ligne : la première peut encore s'allonger.
    expect(readProgress(snapshotAt(secondLine - 1)).lines).toEqual([]);
    // La deuxième a commencé : la première est complète.
    const progress = readProgress(snapshotAt(secondLine + 1));
    expect(progress.lines).toEqual([{ index: 0, line: sampleExtraction.lines[0] }]);
  });

  it("livre la dernière ligne quand les totaux arrivent", () => {
    const totals = json.indexOf('"totals":{');
    expect(readProgress(snapshotAt(totals - 1)).lines).toHaveLength(1);
    expect(readProgress(snapshotAt(totals + '"totals":{'.length)).lines).toHaveLength(2);
  });

  it("finit sur toutes les lignes, une seule fois chacune", () => {
    const progress = readProgress(snapshotAt(json.length));
    expect(progress.lines.map((entry) => entry.index)).toEqual([0, 1]);
  });

  it("supporte n'importe quel instantané, même vide ou étrange", () => {
    for (const snapshot of [undefined, null, 42, "texte", [], {}, { lines: "non" }]) {
      expect(readProgress(snapshot).lines).toEqual([]);
    }
  });
});

describe("earlyStop", () => {
  it("arrête un devis de santé, un document qui n'est pas un devis, une photo illisible", () => {
    expect(earlyStop({ documentKind: "devis", category: "sante" })).toBe("health");
    expect(earlyStop({ documentKind: "autre" })).toBe("not-a-quote");
    expect(earlyStop({ documentKind: "devis", category: "auto", readability: "poor" })).toBe(
      "unreadable",
    );
  });

  it("laisse continuer un devis lisible, même en partie", () => {
    expect(earlyStop({ documentKind: "devis", category: "auto", readability: "partial" })).toBeUndefined();
    expect(earlyStop({ documentKind: "facture", category: "plomberie" })).toBeUndefined();
    expect(earlyStop({})).toBeUndefined();
  });
});
