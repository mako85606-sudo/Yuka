import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ogSize } from "@/config/og";
import { shareCounts } from "@/lib/analysis/share";
import { getSharedPage } from "@/server/analysis/shared-view";
import { looksLikeId } from "@/server/analysis/store";
import { renderShareImage } from "@/server/og/share-image";

export const alt = "Un devis vérifié par Loupe, avec son verdict";
export const size = ogSize;
export const contentType = "image/png";

/**
 * Image de partage d'une correction ; celle du site si le lien a expiré. Un
 * identifiant mal formé n'a jamais existé : rien à dessiner (le rendu coûte du
 * calcul, il ne doit pas pouvoir être demandé à volonté).
 */
export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  await connection();
  const { shareId } = await params;
  if (!looksLikeId(shareId)) notFound();
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
