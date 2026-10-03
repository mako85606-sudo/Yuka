"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import { createContext, useContext, useMemo, type ReactNode } from "react";

interface MotionPrefs {
  /** Mouvement réduit : préférence système ou forçage local. */
  readonly reduced: boolean;
  /** Animation passée (tap) : tout s'affiche directement dans son état final. */
  readonly skip: boolean;
}

const MotionPrefsContext = createContext<MotionPrefs>({ reduced: false, skip: false });

interface MotionPreferencesProps {
  readonly children: ReactNode;
  /** Force le mouvement réduit, même si le système ne le demande pas. */
  readonly forceReduced?: boolean;
  /** Saute toutes les animations du sous-arbre. */
  readonly skip?: boolean;
}

/**
 * Point d'entrée unique des préférences de mouvement. Les réglages se cumulent
 * avec ceux d'un fournisseur parent : on peut réduire ou sauter, jamais
 * réactiver ce qu'un parent a coupé.
 */
export function MotionPreferences({
  children,
  forceReduced = false,
  skip = false,
}: MotionPreferencesProps) {
  const parent = useContext(MotionPrefsContext);
  const system = useReducedMotion() ?? false;
  const reduced = parent.reduced || forceReduced || system;
  const skipAll = parent.skip || skip;
  const value = useMemo(() => ({ reduced, skip: skipAll }), [reduced, skipAll]);

  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"} skipAnimations={skipAll}>
      <MotionPrefsContext.Provider value={value}>{children}</MotionPrefsContext.Provider>
    </MotionConfig>
  );
}

export function useMotionPrefs(): MotionPrefs {
  return useContext(MotionPrefsContext);
}
