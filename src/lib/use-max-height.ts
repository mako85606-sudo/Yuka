import { useLayoutEffect, useState, type RefObject } from "react";

interface Reserve {
  readonly width: number;
  readonly height: number;
}

/**
 * Plus grande hauteur observée pour un élément, à largeur constante. Sert à
 * réserver la place d'un contenu qui change (la démo passe d'un devis à
 * l'autre) sans faire bouger ce qui suit : la réserve ne fait que grandir,
 * et repart de zéro si la largeur change (rotation d'écran, redimensionnement).
 */
export function useMaxHeight<T extends Element>(ref: RefObject<T | null>): number | null {
  const [reserve, setReserve] = useState<Reserve | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.borderBoxSize[0];
      const width = Math.round(box?.inlineSize ?? entry.contentRect.width);
      const height = Math.ceil(box?.blockSize ?? entry.contentRect.height);
      setReserve((previous) =>
        previous && previous.width === width && previous.height >= height
          ? previous
          : { width, height: previous && previous.width === width ? Math.max(previous.height, height) : height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return reserve?.height ?? null;
}
