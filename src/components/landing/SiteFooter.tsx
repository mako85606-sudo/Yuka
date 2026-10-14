import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;

/**
 * Pied de page : l'avertissement, toujours visible, nos engagements et les
 * pages légales. Le lien de la page en cours (`current`) est signalé.
 */
export function SiteFooter({ current }: { readonly current?: string } = {}) {
  return (
    <footer className="border-t border-rule bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-start">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-md text-sm leading-relaxed text-ink-muted">
            {site.disclaimer} Loupe ne touche rien des artisans et n&apos;affiche aucune publicité.
          </p>
        </div>
        <nav aria-label="Informations légales">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.href === current ? "page" : undefined}
                  className={cn(
                    "underline-offset-4 hover:underline",
                    link.href === current ? "font-medium text-ink underline decoration-brand decoration-2" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
