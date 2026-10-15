"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/errors/StatusPage";
import { Button, ButtonLink } from "@/components/ui/Button";
import { fr } from "@/lib/typography";

/** Erreur inattendue dans une page : on le dit simplement, on propose de réessayer. */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Seulement l'empreinte : jamais le contenu d'un devis dans les journaux.
    console.error(`[page] erreur inattendue${error.digest ? ` (${error.digest})` : ""}`);
  }, [error]);

  return (
    <StatusPage
      eyebrow="Erreur inattendue"
      title="Cette page n'a pas pu s'afficher."
      badge="Incident"
      actions={
        <>
          <Button size="lg" onClick={() => retry()}>
            Réessayer
          </Button>
          <ButtonLink href="/" size="lg" variant="secondary">
            Revenir à l&apos;accueil
          </ButtonLink>
        </>
      }
    >
      {fr("Le problème vient de notre côté. Réessayez dans un instant : le plus souvent, cela fonctionne dès le deuxième essai.")}
    </StatusPage>
  );
}
