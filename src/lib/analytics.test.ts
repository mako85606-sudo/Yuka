import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MEASUREMENT_KEY, measurementRefused, setMeasurementRefused, track } from "./analytics";

function fakeBrowser({ gpc = false, storageBlocked = false } = {}) {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => {
      if (storageBlocked) throw new Error("SecurityError");
      return store.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (storageBlocked) throw new Error("SecurityError");
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  const sendBeacon = vi.fn(() => true);
  vi.stubGlobal("window", { localStorage, addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
  vi.stubGlobal("navigator", { sendBeacon, globalPrivacyControl: gpc });
  return { store, sendBeacon };
}

describe("opposition à la mesure", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("mesure tant que le visiteur n'a rien refusé, sans rien écrire sur l'appareil", () => {
    const { store, sendBeacon } = fakeBrowser();
    track("landing_view");
    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(store.size).toBe(0);
  });

  it("n'envoie plus rien après un refus, et reprend s'il est levé", () => {
    const { store, sendBeacon } = fakeBrowser();
    expect(setMeasurementRefused(true)).toBe(true);
    expect(store.get(MEASUREMENT_KEY)).toBe("refus");
    expect(measurementRefused()).toBe(true);
    track("landing_view");
    expect(sendBeacon).not.toHaveBeenCalled();

    setMeasurementRefused(false);
    expect(store.has(MEASUREMENT_KEY)).toBe(false);
    track("landing_view");
    expect(sendBeacon).toHaveBeenCalledOnce();
  });

  it("prend le signal Global Privacy Control pour un refus", () => {
    const { sendBeacon } = fakeBrowser({ gpc: true });
    expect(measurementRefused()).toBe(true);
    track("landing_view");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("dit quand le navigateur n'a pas pu garder le choix, qui vaut alors pour la page", () => {
    const { sendBeacon } = fakeBrowser({ storageBlocked: true });
    expect(setMeasurementRefused(true)).toBe(false);
    expect(measurementRefused()).toBe(true);
    track("landing_view");
    expect(sendBeacon).not.toHaveBeenCalled();
    // Le retrait d'un refus réussit toujours : la page repart sans choix en mémoire.
    expect(setMeasurementRefused(false)).toBe(true);
  });
});
