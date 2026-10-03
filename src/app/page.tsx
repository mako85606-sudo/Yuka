import Link from "next/link";
import { site } from "@/config/site";
import { devPagesEnabled } from "@/lib/dev-pages";

/**
 * Page d'accueil provisoire : la vraie landing (avec la démo animée) arrive à
 * l'étape 2.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-16 sm:px-8">
      <p className="font-mono text-label uppercase text-ink-muted">{site.name}</p>
      <h1 className="mt-4 font-display text-display text-ink">
        Ton devis, corrigé <em className="text-pen-red-strong">au stylo rouge</em>.
      </h1>
      <p className="mt-6 max-w-prose text-[1.05rem] leading-relaxed text-ink-muted">
        Le site est en préparation. Bientôt : prends ton devis en photo, Loupe repère les erreurs,
        compare les prix et te prépare un message pour négocier.
      </p>
      {devPagesEnabled() ? (
        <p className="mt-10">
          <Link
            href="/dev/design"
            className="font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
          >
            Voir la planche de style
          </Link>
        </p>
      ) : null}
      <p className="mt-16 text-sm text-ink-muted">{site.disclaimer}</p>
    </main>
  );
}
