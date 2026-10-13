import { PostHog } from "posthog-node";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrackedEvent } from "@/lib/events";
import { events } from "@/server/db/schema";
import { createTestDb } from "@/test/test-db";
import { eventsCutoff, purgeOldEvents, recordEvent } from "./record";

const { db, close } = await createTestDb();

afterAll(async () => {
  await close();
});

const NOW = new Date("2026-10-13T10:00:00Z");
const event: TrackedEvent = {
  name: "analysis_completed",
  visit: "5f0c2b8e-9a4d-4d2b-8f61-2c3e4a5b6c7d",
  props: { category: "auto", verdict: "alert", saved: true },
};

/** Le vrai client PostHog, branché sur un faux `fetch` qui garde les envois. */
function fakePostHog(fail = false) {
  const bodies: string[] = [];
  const client = new PostHog("phc_test", {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
    disableGeoip: true,
    fetchRetryCount: 0,
    // Corps lisible dans le test (le client réel compresse ses envois).
    disableCompression: true,
    fetch: async (_url, options) => {
      bodies.push(typeof options.body === "string" ? options.body : "");
      if (fail) throw new Error("PostHog injoignable");
      return { status: 200, text: async () => "{}", json: async () => ({}) };
    },
  });
  return { client, bodies };
}

describe("recordEvent", () => {
  it("garde l'événement dans Postgres et l'envoie à PostHog, anonyme et sans géolocalisation", async () => {
    const posthog = fakePostHog();
    await recordEvent(event, { db, posthog: posthog.client }, NOW);

    const rows = await db.select().from(events);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "analysis_completed", visit: event.visit, props: event.props });

    const sent = posthog.bodies.join("\n");
    expect(sent).toContain("analysis_completed");
    expect(sent).toContain(event.visit);
    expect(sent).toContain('"$process_person_profile":false');
    expect(sent).toContain('"$geoip_disable":true');
    await posthog.client.shutdown();
  });

  it("garde l'événement même si PostHog ne répond pas", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const posthog = fakePostHog(true);
    const before = (await db.select().from(events)).length;
    await recordEvent({ ...event, name: "landing_view", props: {} }, { db, posthog: posthog.client }, NOW);
    expect((await db.select().from(events)).length).toBe(before + 1);
    warn.mockRestore();
    await posthog.client.shutdown();
  });
});

describe("purgeOldEvents", () => {
  it("efface les événements sortis de la période de conservation", async () => {
    const old = new Date(eventsCutoff(NOW).getTime() - 24 * 60 * 60 * 1000);
    await recordEvent({ ...event, name: "share_page_view", props: {} }, { db, posthog: null }, old);
    await purgeOldEvents(db, NOW);
    const names = (await db.select().from(events)).map((row) => row.name);
    expect(names).not.toContain("share_page_view");
    expect(names).toContain("analysis_completed");
  });
});
