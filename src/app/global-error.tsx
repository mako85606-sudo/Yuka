"use client";

import "./globals.css";

/*
 * Ce document remplace la mise en page racine, qui apporte d'ordinaire les
 * polices : il s'en passe (polices du système, déclarées en repli dans
 * globals.css), pour ne rien précharger sur les autres pages.
 */

/**
 * Dernier recours, si la mise en page elle-même échoue : un document complet
 * et autonome (aucun composant du site, qui pourrait être la cause de
 * l'erreur), aux couleurs du site.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">
        <title>Loupe · Une erreur est survenue</title>
        <div className="flex min-h-dvh flex-col">
          <header className="border-b border-rule">
            <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-8">
              <span className="text-[1.375rem] font-semibold leading-none tracking-[-0.03em] text-ink">Loupe</span>
            </div>
          </header>
          <main className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8 lg:py-24">
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-brand-strong">Erreur inattendue</p>
                <h1 className="mt-3 font-display text-section text-ink">Cette page n&apos;a pas pu s&apos;afficher.</h1>
                <p className="mt-5 text-lg leading-relaxed text-ink-muted">
                  Le problème vient de notre côté. Réessayez dans un instant&nbsp;: le plus souvent, cela fonctionne dès
                  le deuxième essai.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <button
                    type="button"
                    onClick={() => retry()}
                    className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-5 font-medium text-ink hover:bg-brand-hover"
                  >
                    Réessayer
                  </button>
                  {/* Un lien simple, pas `Link` : un rechargement complet repart d'un état propre. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a
                    href="/"
                    className="inline-flex h-12 items-center justify-center rounded-md border border-rule-strong bg-paper-raised px-5 font-medium text-ink hover:bg-mist"
                  >
                    Revenir à l&apos;accueil
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
