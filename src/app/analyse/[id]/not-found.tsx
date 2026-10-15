import { StatusPage } from "@/components/errors/StatusPage";
import { ButtonLink } from "@/components/ui/Button";
import { CameraGlyph } from "@/components/ui/icons";
import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

/** Lien d'analyse inconnu ou expiré. */
export default function AnalysisNotFound() {
  return (
    <StatusPage
      eyebrow="Analyse introuvable"
      title="Cette analyse n'est plus disponible."
      badge="Introuvable"
      actions={
        <>
          <ButtonLink href="/analyse" size="lg">
            <CameraGlyph />
            Scanner un devis
          </ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">
            Revenir à l&apos;accueil
          </ButtonLink>
        </>
      }
    >
      {fr(
        `Le lien est peut-être incomplet, ou l'analyse a dépassé ses ${limits.analysisRetentionDays} jours et a été effacée. Votre devis, lui, n'a jamais été conservé.`,
      )}
    </StatusPage>
  );
}
