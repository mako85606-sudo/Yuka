import { connection } from "next/server";
import { ogSize } from "@/config/og";
import { shareCounts } from "@/lib/analysis/share";
import { getSharedPage } from "@/server/analysis/shared-view";
import { renderShareImage } from "@/server/og/share-image";

export const alt = "Un devis vérifié par Loupe, avec son verdict";
export const size = ogSize;
export const contentType = "image/png";

/** Image de partage d'une correction ; celle du site si le lien a expiré. */
export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  await connection();
  const { shareId } = await params;
  const shared = await getSharedPage(shareId);
  if (!shared?.data.extraction) return renderShareImage(null);
  const counts = shareCounts(shared.data.findings ?? []);
  return renderShareImage({
    category: shared.data.extraction.category,
    verdict: shared.verdict.verdict,
    errors: counts.errors,
    warnings: counts.warnings,
    savings: shared.verdict.savings,
  });
}
