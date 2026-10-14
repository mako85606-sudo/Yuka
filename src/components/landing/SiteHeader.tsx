import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/#comment", label: "Comment ça marche" },
  { href: "/#engagements", label: "Nos engagements" },
  { href: "/#faq", label: "Questions" },
] as const;

/** En-tête du site : le logo, trois ancres de la page d'accueil, et l'action principale. */
export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label="Loupe, accueil" className="rounded-sm">
          <Logo />
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-8">
          <ul className="hidden items-center gap-7 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[0.95rem] text-ink-muted motion-safe:transition-colors motion-safe:duration-(--duration-micro) hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <ButtonLink href="/analyse" size="sm">
            Scanner mon devis
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
