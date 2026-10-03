import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

/**
 * Règles d'ajout des pages d'un devis, côté navigateur : un PDF seul, ou
 * jusqu'à quatre photos (une par page). Pur, pour être testé.
 */

export type PageKind = "image" | "pdf";

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i;

/** Nature d'un fichier choisi, d'après son type ou, à défaut, son extension. */
export function pageKind(file: { readonly name: string; readonly type: string }): PageKind | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("image/") || IMAGE_EXTENSIONS.test(file.name)) return "image";
  return null;
}

export interface MergeResult<T> {
  readonly pages: readonly T[];
  /** Ce qu'il faut dire à l'utilisateur, s'il s'est passé quelque chose d'inattendu. */
  readonly notice: string | null;
}

export function mergePages<T extends { readonly kind: PageKind }>(
  current: readonly T[],
  incoming: readonly (T | null)[],
  maxPhotos: number = limits.maxPhotos,
): MergeResult<T> {
  const accepted = incoming.filter((page): page is T => page !== null);
  const rejected = incoming.length - accepted.length;
  const unsupported = rejected > 0 ? fr("Ce format n'est pas pris en charge : photo ou PDF uniquement.") : null;
  if (accepted.length === 0) return { pages: current, notice: unsupported };

  const pdf = accepted.find((page) => page.kind === "pdf");
  if (pdf) {
    const notice =
      accepted.length > 1
        ? fr("Un PDF voyage seul : on a gardé le premier choisi.")
        : current.length > 0
          ? fr("Le PDF remplace les pages ajoutées avant lui.")
          : unsupported;
    return { pages: [pdf], notice };
  }

  const replacingPdf = current.some((page) => page.kind === "pdf");
  const base = replacingPdf ? [] : current;
  const room = Math.max(0, maxPhotos - base.length);
  const added = accepted.slice(0, room);
  const notice =
    accepted.length > room
      ? fr(`${maxPhotos} photos au maximum : les suivantes n'ont pas été ajoutées.`)
      : replacingPdf
        ? fr("Les photos remplacent le PDF.")
        : unsupported;
  return { pages: [...base, ...added], notice };
}
