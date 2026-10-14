import type { EventName, EventProps } from "@/lib/events";

/**
 * Mesure côté navigateur. Aucun cookie, rien d'écrit sur l'appareil : la
 * visite est un identifiant aléatoire tiré au chargement de la page et gardé
 * en mémoire (il survit à une navigation interne, pas à un rechargement).
 * Les événements partent vers le serveur de Loupe, jamais directement chez un
 * tiers. Une mesure qui échoue ne gêne jamais le visiteur.
 */

const ENDPOINT = "/api/events";

let visit: string | null = null;

function currentVisit(): string {
  visit ??= crypto.randomUUID();
  return visit;
}

/** Envoie un événement ; ne lève jamais d'erreur. */
export function track<Name extends EventName>(
  name: Name,
  // Propriétés facultatives seulement pour les événements qui n'en ont pas.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ...[props]: {} extends EventProps<Name> ? [props?: EventProps<Name>] : [props: EventProps<Name>]
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ name, visit: currentVisit(), props: props ?? {} });
    const blob = new Blob([body], { type: "application/json" });
    // `sendBeacon` survit à un changement de page ; sinon, un fetch qui ne retient rien.
    if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
    void fetch(ENDPOINT, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(
      () => {},
    );
  } catch {
    // La mesure ne doit jamais casser la page.
  }
}
