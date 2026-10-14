import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "./Wordmark";

/** En-tête du site : le logo, deux ancres, et l'action principale. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
      <Link href="/" aria-label="Loupe, accueil" className="-ml-3 rounded-[4px]">
        <Wordmark />
      </Link>
      <nav aria-label="Navigation principale" className="flex items-center gap-6">
        <a
          href="#verifications"
          className="hidden text-sm text-ink underline-offset-4 hover:underline sm:inline"
        >
          Ce qu&apos;on vérifie
        </a>
        <a href="#faq" className="hidden text-sm text-ink underline-offset-4 hover:underline sm:inline">
          Questions
        </a>
        <ButtonLink href="/analyse" size="sm">
          Scanner mon devis
        </ButtonLink>
      </nav>
    </header>
  );
}
