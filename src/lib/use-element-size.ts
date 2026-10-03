import { useLayoutEffect, useState, type RefObject } from "react";

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Taille de mise en page d'un élément (hors transformations : une feuille
 * penchée garde ses vraies dimensions), arrondie au pixel pour éviter les
 * recalculs inutiles. `null` tant que l'élément n'a pas été mesuré.
 */
export function useElementSize<T extends Element>(ref: RefObject<T | null>): ElementSize | null {
  const [size, setSize] = useState<ElementSize | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setSize((previous) =>
        previous?.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
