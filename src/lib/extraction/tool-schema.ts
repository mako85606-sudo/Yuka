import { z } from "zod";

/**
 * Convertit un schéma Zod en `input_schema` accepté par un outil strict
 * (`strict: true`) de l'API Claude.
 *
 * Les sorties structurées n'acceptent qu'une partie de JSON Schema : tout
 * objet doit fermer `additionalProperties`, et les contraintes numériques, de
 * longueur ou de motif ne sont pas prises en charge. On les retire du schéma
 * envoyé au modèle ; Zod continue de les vérifier à la réception.
 */

export type JsonSchema = { [key: string]: unknown };

/** Mots-clés non pris en charge par les schémas stricts, retirés partout. */
const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
]);

/** Mots-clés dont la valeur est un sous-schéma, ou une liste ou un dictionnaire de sous-schémas. */
const SCHEMA_KEYWORDS = new Set(["items", "anyOf", "allOf", "oneOf", "not"]);
const SCHEMA_MAP_KEYWORDS = new Set(["properties", "$defs", "definitions"]);

function isRecord(value: unknown): value is JsonSchema {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictify(schema: JsonSchema): JsonSchema {
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    // Seuls 0 et 1 sont acceptés pour minItems.
    if (key === "minItems") {
      if (typeof value === "number" && value <= 1) result[key] = value;
      continue;
    }
    if (SCHEMA_MAP_KEYWORDS.has(key) && isRecord(value)) {
      result[key] = Object.fromEntries(
        Object.entries(value).map(([name, child]) => [name, isRecord(child) ? strictify(child) : child]),
      );
      continue;
    }
    if (SCHEMA_KEYWORDS.has(key)) {
      if (Array.isArray(value)) {
        result[key] = value.map((child) => (isRecord(child) ? strictify(child) : child));
      } else if (isRecord(value)) {
        result[key] = strictify(value);
      } else {
        result[key] = value;
      }
      continue;
    }
    result[key] = value;
  }
  if (result.type === "object") result.additionalProperties = false;
  return result;
}

/** `input_schema` d'outil strict, dérivé du schéma Zod (forme d'entrée). */
export function toStrictToolSchema(schema: z.ZodType): JsonSchema & { type: "object" } {
  const converted = strictify(z.toJSONSchema(schema, { io: "input" }) as JsonSchema);
  if (converted.type !== "object") {
    throw new Error("Le schéma d'un outil doit décrire un objet.");
  }
  return converted as JsonSchema & { type: "object" };
}

/** Nombre de champs optionnels, plafonné à 24 par requête pour les schémas stricts. */
export function countOptionalProperties(schema: JsonSchema): number {
  let count = 0;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    if (isRecord(node.properties)) {
      const required = new Set(Array.isArray(node.required) ? node.required : []);
      count += Object.keys(node.properties).filter((name) => !required.has(name)).length;
    }
    Object.values(node).forEach(visit);
  };
  visit(schema);
  return count;
}

/** Nombre de champs en union (`anyOf` ou liste de types), plafonné à 16 par requête. */
export function countUnionProperties(schema: JsonSchema): number {
  let count = 0;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!isRecord(node)) return;
    if (Array.isArray(node.anyOf) || Array.isArray(node.type)) count += 1;
    Object.values(node).forEach(visit);
  };
  visit(schema);
  return count;
}
