import { ogSize } from "@/config/og";
import { renderShareImage } from "@/server/og/share-image";

export const alt = "Loupe : ne payez plus un devis trop cher";
export const size = ogSize;
export const contentType = "image/png";

/** Image de partage du site (landing). */
export default async function Image() {
  return renderShareImage(null);
}
