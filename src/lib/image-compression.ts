import { limits } from "@/config/limits";

/**
 * Compression des photos dans le navigateur, avant l'envoi : environ 1600 px
 * de large, en JPEG. Le réencodage efface au passage les métadonnées de la
 * photo (EXIF : position GPS, modèle du téléphone) : elles ne quittent jamais
 * le téléphone.
 */

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Réduit une taille pour tenir dans le cadre, sans jamais l'agrandir. */
export function fitWithin(size: Size, maxWidth: number, maxHeight: number): Size {
  const scale = Math.min(1, maxWidth / size.width, maxHeight / size.height);
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** « IMG_2041.HEIC » → « IMG_2041.jpg ». */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "page"}.jpg`;
}

/** Fond d'une photo transparente une fois aplatie en JPEG : du blanc, comme une feuille. */
const FLATTEN_BACKGROUND = "#ffffff";

type Drawable = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<{ image: Drawable; release: () => void }> {
  // L'orientation EXIF est appliquée au décodage : la photo garde son sens.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, release: () => bitmap.close() };
    } catch {
      // Format que ce décodeur ne lit pas : on retente avec une balise image.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { image, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function dimensions(image: Drawable): Size {
  return image instanceof HTMLImageElement
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: image.width, height: image.height };
}

/** Lève une erreur si la photo ne peut pas être décodée (format non pris en charge). */
export async function compressPhoto(file: File): Promise<File> {
  const { image, release } = await decode(file);
  try {
    const { width, height } = fitWithin(dimensions(image), limits.photoMaxWidth, limits.photoMaxHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible");
    context.fillStyle = FLATTEN_BACKGROUND;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", limits.photoQuality),
    );
    if (!blob) throw new Error("Compression impossible");
    return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    release();
  }
}
