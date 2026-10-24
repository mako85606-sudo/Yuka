import type { EventName, EventProps } from "@/lib/events";

/**
 * Mesure côté navigateur. Aucun cookie : la visite est un identifiant
 * aléatoire tiré au chargement de la page et gardé en mémoire (il survit à
 * une navigation interne, pas à un rechargement). Les événements partent vers
 * le serveur de Loupe, jamais directement chez un tiers. Une mesure qui
 * échoue ne gêne jamais le visiteur.
 *
 * Droit d'opposition (RGPD, art. 21) : un refus est gardé dans le navigateur
 * (`MEASUREMENT_KEY`, la seule chose que Loupe y écrit, et seulement sur
 * demande) ; le signal Global Privacy Control vaut refus. Rien ne part alors.
 */

const ENDPOINT = "/api/events";

/** Clé du refus de la mesure dans le stockage du navigateur. */
export const MEASUREMENT_KEY = "loupe-mesure";
const REFUSED = "refus";
/** Prévient les composants de la page quand le choix change dans cet onglet. */
const CHANGE_EVENT = "loupe-mesure-change";

let visit: string | null = null;
/** Choix fait sur cette page quand le navigateur n'a pas pu le garder (stockage bloqué). */
let unsaved: boolean | null = null;

function currentVisit(): string {
  visit ??= crypto.randomUUID();
  return visit;
}

function globalPrivacyControl(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** Vrai si le visiteur a refusé la mesure (ou si son navigateur le demande). */
export function measurementRefused(): boolean {
  if (typeof window === "undefined") return false;
  if (globalPrivacyControl()) return true;
  if (unsaved !== null) return unsaved;
  try {
    return window.localStorage.getItem(MEASUREMENT_KEY) === REFUSED;
  } catch {
    // Stockage bloqué : rien n'a pu être refusé ici.
    return false;
  }
}

/** Vrai si le refus vient du navigateur (Global Privacy Control) : la page ne peut pas le lever. */
export function measurementRefusedByBrowser(): boolean {
  return typeof window !== "undefined" && globalPrivacyControl();
}

/**
 * Enregistre le choix du visiteur. Faux si le navigateur n'a pas pu le
 * garder : il vaut alors pour cette page seulement.
 */
export function setMeasurementRefused(refused: boolean): boolean {
  try {
    if (refused) window.localStorage.setItem(MEASUREMENT_KEY, REFUSED);
    else window.localStorage.removeItem(MEASUREMENT_KEY);
    unsaved = null;
    return true;
  } catch {
    unsaved = refused;
    return false;
  } finally {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/** Suit le choix (cet onglet et les autres), pour `useSyncExternalStore`. */
export function subscribeMeasurement(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
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
    if (measurementRefused()) return;
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
