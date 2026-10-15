import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Faux au rendu serveur et pendant l'hydratation, vrai ensuite. Pour ce qui
 * dépend d'une préférence que le serveur ignore (mouvement réduit) : le
 * premier rendu du navigateur reste identique à celui du serveur.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
