import { StatusPage } from "@/components/errors/StatusPage";
import { ButtonLink } from "@/components/ui/Button";
import { CameraGlyph } from "@/components/ui/icons";
import { limits } from "@/config/limits";
import { fr } from "@/lib/typography";

/** Lien de partage inconnu ou expiré. */
export default function SharedNotFound() {
  return (
    <StatusPage
      eyebrow="Lien de partage"
      title="Ce lien n'est plus actif."
      badge="Lien inactif"
      actions={
        <>
          <ButtonLink href="/analyse" size="lg">
            <CameraGlyph />
            Scanner un devis
          </ButtonLink>
          <ButtonLink href="/" size="lg" variant="secondary">
            Découvrir Loupe
          </ButtonLink>
        </>
      }
    >
      {fr(
        `Une analyse partagée reste en ligne ${limits.analysisRetentionDays} jours, puis elle disparaît. Vous avez vous-même un devis à faire vérifier ? Loupe le relit pour vous, gratuitement.`,
      )}
    </StatusPage>
  );
}
