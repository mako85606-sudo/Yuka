import { StatusPage } from "@/components/errors/StatusPage";
import { ButtonLink } from "@/components/ui/Button";
import { CameraGlyph } from "@/components/ui/icons";
import { fr } from "@/lib/typography";

/** Page introuvable, pour tout le site. */
export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Erreur 404"
      title="Cette page n'existe pas."
      badge="Page introuvable"
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
        "Le lien est peut-être incomplet ou mal recopié. Si vous veniez faire vérifier un devis, vous pouvez le scanner dès maintenant.",
      )}
    </StatusPage>
  );
}
