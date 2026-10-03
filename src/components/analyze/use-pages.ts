"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { limits } from "@/config/limits";
import { mergePages, pageKind, type PageKind } from "@/lib/analysis/pages";
import { compressPhoto } from "@/lib/image-compression";
import { fr } from "@/lib/typography";

export type PageStatus = "preparing" | "ready" | "error";

export interface PageItem {
  readonly id: string;
  readonly kind: PageKind;
  /** Fichier envoyé : la photo compressée, ou le PDF tel quel. */
  readonly file: File;
  /** Aperçu local (il ne quitte pas le navigateur) ; `null` pour un PDF. */
  readonly previewUrl: string | null;
  readonly status: PageStatus;
}

const PREPARE_FAILED = fr("Cette photo n'a pas pu être lue : essaie en JPEG, ou reprends-la.");
const PDF_TOO_LARGE = fr(
  `Ce PDF dépasse ${Math.round(limits.maxUploadBytes / (1024 * 1024))} Mo : prends plutôt les pages en photo.`,
);

/**
 * Les pages du devis choisies dans le navigateur. Chaque photo est compressée
 * dès qu'elle est ajoutée ; l'aperçu d'une page retirée est libéré aussitôt.
 */
export function usePages() {
  const [pages, setPages] = useState<readonly PageItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // Copie synchrone de l'état : deux ajouts rapprochés voient chacun la liste à jour.
  const pagesRef = useRef<readonly PageItem[]>([]);
  const nextId = useRef(0);
  const urls = useRef(new Set<string>());

  const commit = useCallback((next: readonly PageItem[]) => {
    pagesRef.current = next;
    setPages(next);
  }, []);

  const createUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  }, []);

  const releaseUrl = useCallback((url: string | null) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }, []);

  useEffect(() => {
    const created = urls.current;
    return () => {
      for (const url of created) URL.revokeObjectURL(url);
      created.clear();
    };
  }, []);

  const prepare = useCallback(
    (page: PageItem) => {
      compressPhoto(page.file)
        .then((compressed) => {
          const current = pagesRef.current.find((item) => item.id === page.id);
          if (!current) return; // retirée entre-temps
          const previewUrl = createUrl(compressed);
          releaseUrl(current.previewUrl);
          commit(
            pagesRef.current.map((item) =>
              item.id === page.id ? { ...item, file: compressed, previewUrl, status: "ready" } : item,
            ),
          );
        })
        .catch(() => {
          if (!pagesRef.current.some((item) => item.id === page.id)) return;
          commit(
            pagesRef.current.map((item) => (item.id === page.id ? { ...item, status: "error" } : item)),
          );
          setNotice(PREPARE_FAILED);
        });
    },
    [commit, createUrl, releaseUrl],
  );

  const add = useCallback(
    (files: readonly File[]) => {
      const incoming = files.map((file): PageItem | null => {
        const kind = pageKind(file);
        if (!kind) return null;
        nextId.current += 1;
        const tooLarge = kind === "pdf" && file.size > limits.maxUploadBytes;
        return {
          id: `page-${nextId.current}`,
          kind,
          file,
          previewUrl: kind === "image" ? createUrl(file) : null,
          status: kind === "image" ? "preparing" : tooLarge ? "error" : "ready",
        };
      });

      const merged = mergePages(pagesRef.current, incoming);
      const kept = new Set(merged.pages.map((page) => page.id));
      for (const page of [...pagesRef.current, ...incoming]) {
        if (page && !kept.has(page.id)) releaseUrl(page.previewUrl);
      }
      commit(merged.pages);

      const pdfTooLarge = merged.pages.some((page) => page.kind === "pdf" && page.status === "error");
      setNotice(pdfTooLarge ? PDF_TOO_LARGE : merged.notice);

      for (const page of incoming) {
        if (page?.kind === "image" && kept.has(page.id)) prepare(page);
      }
    },
    [commit, createUrl, prepare, releaseUrl],
  );

  const remove = useCallback(
    (id: string) => {
      const page = pagesRef.current.find((item) => item.id === id);
      releaseUrl(page?.previewUrl ?? null);
      commit(pagesRef.current.filter((item) => item.id !== id));
      setNotice(null);
    },
    [commit, releaseUrl],
  );

  const clear = useCallback(() => {
    for (const page of pagesRef.current) releaseUrl(page.previewUrl);
    commit([]);
    setNotice(null);
  }, [commit, releaseUrl]);

  return { pages, notice, add, remove, clear };
}
