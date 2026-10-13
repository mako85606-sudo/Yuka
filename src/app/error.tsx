"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { fr } from "@/lib/typography";

/** Erreur inattendue dans une page : on le dit simplement, on propose de réessayer. */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Seulement l'empreinte : jamais le contenu d'un devis dans les journaux.
    console.error(`[page] erreur inattendue${error.digest ? ` (${error.digest})` : ""}`);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-8">
      <h1 className="font-display text-title text-ink">{fr("Quelque chose a coincé.")}</h1>
      <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
        {fr("Ce n'est pas toi, c'est nous. Réessaie : ça passe souvent du deuxième coup.")}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => retry()}>
          Réessayer
        </Button>
        <ButtonLink href="/" size="lg" variant="secondary">
          Revenir à l&apos;accueil
        </ButtonLink>
      </div>
    </main>
  );
}
