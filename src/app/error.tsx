"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { StatusPage } from "@/components/errors/StatusPage";
import { Button } from "@/components/ui/Button";
import { fr } from "@/lib/typography";

/** Erreur inattendue dans une page : on le dit simplement, on propose de réessayer. */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
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
          {/* Déjà sur l'accueil, un lien ne changerait rien : on réaffiche la page au lieu de naviguer. */}
          <Button size="lg" variant="secondary" onClick={() => (pathname === "/" ? retry() : router.push("/"))}>
            Revenir à l&apos;accueil
          </Button>
        </>
      }
    >
      {fr("Le problème vient de notre côté. Réessayez dans un instant : le plus souvent, cela fonctionne dès le deuxième essai.")}
    </StatusPage>
  );
}
