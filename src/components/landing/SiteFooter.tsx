import Link from "next/link";
import { site } from "@/config/site";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;

/** Pied de page : l'avertissement, toujours visible, nos engagements et les pages légales. */
export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="-ml-3">
          <Wordmark />
        </div>
        <div className="max-w-md space-y-2 text-sm text-ink-muted">
          <p className="text-ink">{site.disclaimer}</p>
          <p>Loupe ne touche rien des artisans et n&apos;affiche aucune publicité.</p>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
