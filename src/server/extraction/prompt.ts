import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { llmConfig } from "@/config/llm";
import type { AcceptedImageType } from "@/config/limits";
import { TAXONOMY, UNIT_SYMBOLS } from "@/config/taxonomy";
import { extractionSchema } from "@/lib/extraction/schema";
import { toStrictToolSchema } from "@/lib/extraction/tool-schema";

/**
 * Ce que le modèle reçoit pour lire un devis : l'outil (son schéma vient du
 * schéma Zod), les consignes, et le document lui-même.
 */

export const EXTRACTION_TOOL_NAME = "enregistrer_devis";

/** Un devis tel qu'envoyé : un PDF, ou une photo par page. Jamais écrit sur disque. */
export type QuoteDocument =
  | { readonly kind: "pdf"; readonly data: Uint8Array }
  | { readonly kind: "image"; readonly mediaType: AcceptedImageType; readonly data: Uint8Array };

export function buildExtractionTool(): Anthropic.Tool {
  return {
    name: EXTRACTION_TOOL_NAME,
    description:
      "Enregistre la lecture d'un devis. Appelle cet outil une seule fois, après avoir lu tout le document, avec ce que tu y as lu.",
    input_schema: toStrictToolSchema(extractionSchema),
    ...(llmConfig.strictTool ? { strict: true } : {}),
    ...(llmConfig.eagerInputStreaming ? { eager_input_streaming: true } : {}),
  };
}

function taxonomyList(): string {
  return TAXONOMY.map((item) => `- ${item.id} : ${item.label} (${UNIT_SYMBOLS[item.unit]})`).join("\n");
}

export const SYSTEM_PROMPT = `Tu lis des devis d'artisans et de garages français pour Loupe, un service qui aide les particuliers à comprendre un devis avant de le signer. On t'envoie un devis en photos (une par page) ou en PDF. Lis-le en entier, puis appelle l'outil ${EXTRACTION_TOOL_NAME} une seule fois avec ce que tu as lu.

# Fidélité
- Recopie les nombres tels qu'ils sont imprimés, même s'ils te semblent faux. Un calcul erroné, un taux de TVA inhabituel ou un total incohérent restent tels quels : des vérifications automatiques les relèveront ensuite.
- N'invente rien et ne recalcule rien. Une valeur absente, illisible ou ambiguë s'omet, et la confiance du champ concerné baisse.
- Montants en euros, en nombres décimaux avec un point : « 1 315,50 € » devient 1315.5. Une remise s'écrit en négatif.
- Taux de TVA en pourcentage (20, 10, 5.5, 2.1 ou 0), tel qu'imprimé pour la ligne ; si un seul taux vaut pour tout le devis, reporte-le sur chaque ligne.
- Dates au format AAAA-MM-JJ.
- Lignes : toutes les lignes facturées, dans l'ordre, y compris main-d'œuvre, déplacement, remises et lignes offertes (montant 0). Pas de titres de section, de sous-totaux ni de totaux.

# Vie privée
- Ne recopie aucune donnée personnelle : ni nom de personne ou d'entreprise, ni adresse, téléphone, e-mail, SIRET, numéro de devis ou de client, immatriculation, numéro de série.
- Pour l'émetteur et les mentions, réponds seulement par vrai ou faux.
- Dans les libellés et l'objet, garde la description technique et retire ce qui identifie quelqu'un.
- Département : les deux premiers chiffres du code postal du lieu d'intervention (les trois premiers en outre-mer, de 971 à 976). À défaut de lieu d'intervention, prends le code postal du client ; pour un garage, celui du garage.

# Classement
- documentKind : devis ; facture si le document est une facture ; autre si ce n'est ni l'un ni l'autre (photo sans document, ticket de caisse, contrat…).
- category : auto (garage, carrosserie, pneus), plomberie, electricite, chauffage (chaudière, pompe à chaleur, climatisation), travaux (rénovation, peinture, maçonnerie, menuiserie, sols), serrurerie, demenagement, sante (dentaire, optique, audition, soins médicaux ou paramédicaux), autre.
- readability : good si tout se lit ; partial si des zones sont floues, coupées ou masquées ; poor si l'essentiel est illisible.
- canonicalItem : la prestation de la liste ci-dessous qui correspond vraiment à la ligne. S'il n'y en a pas, omets le champ plutôt que de forcer une correspondance.
- isDoorToDoorSale : vrai seulement si le document le dit (contrat conclu hors établissement, démarchage, signature au domicile, bordereau de rétractation).
- Confiance : high si la valeur est nette (ou nettement absente), medium si tu as dû interpréter, low si tu devines presque.

# Prestations (identifiant : description, unité de comparaison)
${taxonomyList()}`;

export function buildSystemBlocks(): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      // Point de cache après l'outil et les consignes : ce préfixe ne change jamais.
      ...(llmConfig.promptCaching ? { cache_control: { type: "ephemeral" as const } } : {}),
    },
  ];
}

function toBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("base64");
}

/** Le document d'abord, la consigne ensuite. */
export function buildUserContent(documents: readonly QuoteDocument[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  const images = documents.filter((document) => document.kind === "image");
  documents.forEach((document, index) => {
    if (document.kind === "pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: toBase64(document.data) },
      });
      return;
    }
    if (images.length > 1) blocks.push({ type: "text", text: `Page ${index + 1} :` });
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: document.mediaType, data: toBase64(document.data) },
    });
  });
  const description =
    images.length === 0
      ? "en PDF"
      : images.length === 1
        ? "en photo"
        : `en ${images.length} photos, une par page`;
  blocks.push({
    type: "text",
    text: `Voici le devis à lire, ${description}. Appelle ${EXTRACTION_TOOL_NAME} avec ta lecture.`,
  });
  return blocks;
}

export function missingToolCallMessage(): string {
  return `Tu n'as pas appelé l'outil ${EXTRACTION_TOOL_NAME}. Appelle-le maintenant, une seule fois, avec ta lecture du devis.`;
}

export function validationRetryMessage(errors: string): string {
  return `Ta lecture ne respecte pas le format attendu :\n${errors}\nRappelle ${EXTRACTION_TOOL_NAME} avec une lecture corrigée, sans changer les valeurs que tu avais bien lues.`;
}
