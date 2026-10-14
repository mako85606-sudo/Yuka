import { describe, expect, it } from "vitest";
import { TAXONOMY, TAXONOMY_IDS, isTaxonomyId, taxonomyItem } from "@/config/taxonomy";
import { sampleExtraction } from "@/fixtures/sample-extraction";
import {
  describeValidationError,
  extractionSchema,
  prepareRawExtraction,
} from "@/lib/extraction/schema";
import {
  countOptionalProperties,
  countUnionProperties,
  toStrictToolSchema,
  type JsonSchema,
} from "@/lib/extraction/tool-schema";

function walk(node: unknown, visit: (schema: JsonSchema) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (node === null || typeof node !== "object") return;
  visit(node as JsonSchema);
  Object.values(node).forEach((child) => walk(child, visit));
}

describe("taxonomie", () => {
  it("a des identifiants uniques, en minuscules, rangés par catégorie", () => {
    expect(new Set(TAXONOMY_IDS).size).toBe(TAXONOMY_IDS.length);
    for (const id of TAXONOMY_IDS) {
      expect(id).toMatch(/^[a-z]+(\.[a-z0-9-]+)+$/);
    }
  });

  it("contient l'exemple du brief", () => {
    expect(isTaxonomyId("plomberie.chauffe-eau.remplacement.200l")).toBe(true);
    expect(taxonomyItem("plomberie.chauffe-eau.remplacement.200l").unit).toBe("forfait");
    expect(isTaxonomyId("plomberie.inventee")).toBe(false);
  });

  it("ne contient pas de prestation de santé", () => {
    expect(TAXONOMY.some((item) => item.id.startsWith("sante."))).toBe(false);
  });
});

describe("schéma d'extraction", () => {
  it("valide une extraction complète", () => {
    expect(extractionSchema.safeParse(sampleExtraction).success).toBe(true);
  });

  it("refuse une prestation hors taxonomie", () => {
    const invalid = {
      ...sampleExtraction,
      lines: [{ label: "Truc", confidence: "high", canonicalItem: "plomberie.inventee" }],
    };
    const result = extractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(describeValidationError(result.error)).toContain("lines.0.canonicalItem");
    }
  });

  it("refuse une date qui n'est pas au format AAAA-MM-JJ", () => {
    const invalid = { ...sampleExtraction, meta: { ...sampleExtraction.meta, quoteDate: "12/09/2026" } };
    expect(extractionSchema.safeParse(invalid).success).toBe(false);
  });

  it("ne demande aucune valeur personnelle : l'émetteur n'a que des booléens", () => {
    const issuer = extractionSchema.shape.issuer.shape;
    for (const field of Object.values(issuer)) {
      expect(field.safeParse(true).success).toBe(true);
      expect(field.safeParse("Plomberie Martin").success).toBe(false);
    }
  });
});

describe("prepareRawExtraction", () => {
  it("retire les null et remet les énumérations en minuscules", () => {
    const raw = {
      documentKind: "Devis",
      category: "Plomberie",
      readability: "GOOD",
      meta: { quoteDate: null, isDoorToDoorSale: false },
      lines: [{ label: "Pose", confidence: "High", unit: "Heure", totalHT: null }],
      confidence: { category: "High" },
    };
    expect(prepareRawExtraction(raw)).toEqual({
      documentKind: "devis",
      category: "plomberie",
      readability: "good",
      meta: { isDoorToDoorSale: false },
      lines: [{ label: "Pose", confidence: "high", unit: "heure" }],
      confidence: { category: "high" },
    });
  });

  it("ne touche ni aux libellés ni aux nombres", () => {
    const raw = { subject: "Pose Chauffe-Eau", lines: [{ label: "Main-d'Œuvre", totalHT: 280 }] };
    expect(prepareRawExtraction(raw)).toEqual(raw);
  });
});

describe("schéma de l'outil strict", () => {
  const schema = toStrictToolSchema(extractionSchema);

  it("ferme tous les objets", () => {
    walk(schema, (node) => {
      if (node.type === "object") expect(node.additionalProperties).toBe(false);
    });
  });

  it("ne garde aucun mot-clé refusé par les schémas stricts", () => {
    const forbidden = ["$schema", "minimum", "maximum", "pattern", "minLength", "maxLength", "maxItems"];
    walk(schema, (node) => {
      for (const keyword of forbidden) expect(node).not.toHaveProperty(keyword);
    });
  });

  it("respecte les plafonds de complexité de l'API", () => {
    expect(countOptionalProperties(schema)).toBeLessThanOrEqual(24);
    expect(countUnionProperties(schema)).toBeLessThanOrEqual(16);
  });

  it("sort la nature du document, la catégorie et la lisibilité en premier", () => {
    const required = schema.required as string[];
    expect(required.slice(0, 3)).toEqual(["documentKind", "category", "readability"]);
    expect(Object.keys(schema.properties as object).slice(0, 3)).toEqual(required.slice(0, 3));
  });

  it("propose la taxonomie complète pour chaque ligne", () => {
    const lines = (schema.properties as Record<string, JsonSchema>).lines as JsonSchema;
    const item = (lines.items as JsonSchema).properties as Record<string, JsonSchema>;
    expect(item.canonicalItem?.enum).toEqual(TAXONOMY_IDS);
  });
});
