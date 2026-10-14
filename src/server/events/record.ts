import "server-only";
import type { PostHog } from "posthog-node";
import { lt } from "drizzle-orm";
import { analyticsConfig } from "@/config/analytics";
import type { TrackedEvent } from "@/lib/events";
import type { Database } from "@/server/db/client";
import { events } from "@/server/db/schema";

export interface EventSinks {
  readonly db: Database | null;
  readonly posthog: PostHog | null;
}

/**
 * Garde un événement : dans Postgres (entonnoir de `/admin`) et chez PostHog
 * s'il est configuré. Une panne de l'un n'empêche pas l'autre, et ne remonte
 * jamais jusqu'au visiteur.
 */
export async function recordEvent(event: TrackedEvent, sinks: EventSinks, now = new Date()): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  if (sinks.db) {
    tasks.push(
      sinks.db.insert(events).values({ name: event.name, visit: event.visit, props: event.props, createdAt: now }),
    );
  }
  if (sinks.posthog) {
    tasks.push(
      sinks.posthog.captureImmediate({
        distinctId: event.visit,
        event: event.name,
        timestamp: now,
        disableGeoip: true,
        // Pas de profil de personne : des événements anonymes, rien de plus.
        properties: { ...event.props, $process_person_profile: false },
      }),
    );
  }
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") console.warn(`[mesure] ${event.name} non enregistré`, result.reason);
  }
}

/** Début de la période de conservation des événements. */
export function eventsCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - analyticsConfig.eventsRetentionMonths);
  return cutoff;
}

/** Efface les événements plus anciens que la période de conservation. */
export async function purgeOldEvents(db: Database, now = new Date()): Promise<void> {
  await db.delete(events).where(lt(events.createdAt, eventsCutoff(now)));
}
