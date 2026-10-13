import "server-only";
import { PostHog } from "posthog-node";
import { analyticsConfig } from "@/config/analytics";
import { serverEnv } from "@/server/env";

let cached: { readonly key: string; readonly host: string; readonly client: PostHog } | undefined;

/**
 * Client PostHog du serveur, ou `null` sans `POSTHOG_KEY`. Envoi immédiat
 * (une fonction serverless ne garde pas de file d'attente), sans
 * géolocalisation.
 */
export function getPostHog(): PostHog | null {
  const env = serverEnv();
  const key = env.POSTHOG_KEY;
  if (!key) return null;
  const host = env.POSTHOG_HOST ?? analyticsConfig.posthogHost;
  if (cached?.key !== key || cached.host !== host) {
    cached = {
      key,
      host,
      client: new PostHog(key, {
        host,
        flushAt: 1,
        flushInterval: 0,
        disableGeoip: true,
        requestTimeout: analyticsConfig.posthogTimeoutMs,
        fetchRetryCount: 1,
      }),
    };
  }
  return cached.client;
}
