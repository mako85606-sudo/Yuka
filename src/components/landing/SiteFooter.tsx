import { site } from "@/config/site";
import { Wordmark } from "./Wordmark";

/** Pied de page : l'avertissement, toujours visible, et nos engagements. */
export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="-ml-3">
          <Wordmark />
        </div>
        <div className="max-w-md space-y-2 text-sm text-ink-muted">
          <p className="text-ink">{site.disclaimer}</p>
          <p>Indépendant, sans publicité, sans lien affilié vers des artisans.</p>
        </div>
      </div>
    </footer>
  );
}
