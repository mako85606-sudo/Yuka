import { z } from "zod";
import { CATEGORIES } from "@/config/taxonomy";
import { SIGNUP_SOURCES } from "@/lib/signup";

/**
 * Événements de mesure : une liste fermée, chacun avec ses propriétés
 * permises, rien d'autre. Aucun ne porte de donnée personnelle ni de contenu
 * du devis : seulement des catégories, des étapes et des codes.
 *
 * Mesure sans cookie ni stockage sur l'appareil : la « visite » est un
 * identifiant aléatoire tiré à l'ouverture de la page, gardé en mémoire le
 * temps de la navigation, jamais écrit sur l'appareil.
 */

const STEPS = ["idle", "received", "reading", "checking", "pricing", "verdict", "done"] as const;
const VERDICTS = ["ok", "negotiate", "alert"] as const;

const empty = z.object({}).strict();

export const eventSchemas = {
  landing_view: empty,
  upload_started: z.object({ pages: z.number().int().min(1).max(10), kind: z.enum(["pdf", "photo"]) }).strict(),
  upload_completed: empty,
  analysis_completed: z
    .object({ category: z.enum(CATEGORIES), verdict: z.enum(VERDICTS), saved: z.boolean() })
    .strict(),
  analysis_failed: z
    .object({
      /** Dernière étape atteinte par le serveur. */
      step: z.enum(STEPS),
      /** Code d'erreur ou motif de refus (« health », « rate-limited »…). */
      code: z.string().regex(/^[a-z-]{2,32}$/),
    })
    .strict(),
  negotiation_copied: z.object({ version: z.enum(["email", "sms", "subject"]) }).strict(),
  share_clicked: z.object({ method: z.enum(["native", "copy"]) }).strict(),
  share_page_view: empty,
  detailed_report_clicked: empty,
  email_submitted: z.object({ source: z.enum(SIGNUP_SOURCES) }).strict(),
} as const;

export type EventName = keyof typeof eventSchemas;
export const EVENT_NAMES = Object.keys(eventSchemas) as [EventName, ...EventName[]];

export type EventProps<Name extends EventName> = z.infer<(typeof eventSchemas)[Name]>;

/** Ce que le navigateur envoie. */
export interface TrackedEvent<Name extends EventName = EventName> {
  readonly name: Name;
  /** Identifiant aléatoire de la visite (UUID), jamais stocké sur l'appareil. */
  readonly visit: string;
  readonly props: EventProps<Name>;
}

const envelopeSchema = z.object({
  name: z.enum(EVENT_NAMES),
  visit: z.uuid(),
  props: z.record(z.string(), z.unknown()).default({}),
});

/** Un événement reçu, validé ; `null` s'il est inconnu ou mal formé. */
export function parseTrackedEvent(value: unknown): TrackedEvent | null {
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) return null;
  const props = eventSchemas[envelope.data.name].safeParse(envelope.data.props);
  if (!props.success) return null;
  return { name: envelope.data.name, visit: envelope.data.visit, props: props.data } as TrackedEvent;
}

/** Plafond d'un événement envoyé, en octets : de quoi décourager un envoi abusif. */
export const MAX_EVENT_BYTES = 1024;

/** Étapes de l'entonnoir affiché dans `/admin`, dans l'ordre. */
export const FUNNEL: readonly EventName[] = [
  "landing_view",
  "upload_started",
  "upload_completed",
  "analysis_completed",
  "negotiation_copied",
  "share_clicked",
];
