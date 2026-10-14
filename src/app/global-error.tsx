"use client";

import "./globals.css";

/**
 * Dernier recours, si la mise en page elle-même échoue : un document complet,
 * sobre, avec les styles du site (sans ses polices, qui viennent de la mise en
 * page).
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <title>Loupe · Quelque chose a coincé</title>
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-8">
          <h1 className="text-[2.25rem] leading-tight">Quelque chose a coincé.</h1>
          <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-ink-muted">
            Le problème vient de chez nous. Réessaie dans un instant.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-8 inline-flex h-12 items-center rounded-[6px] bg-ink px-5 font-medium text-paper"
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
