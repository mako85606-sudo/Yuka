import Link from "next/link";
import { PenRing } from "@/components/signature/PenRing";
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
        <a href="#verifications" className="group relative hidden text-sm text-ink sm:inline">
          Ce qu&apos;on vérifie
          <PenRing mode="hover" seed="nav-verifications" />
        </a>
        <a href="#faq" className="group relative hidden text-sm text-ink sm:inline">
          Questions
          <PenRing mode="hover" seed="nav-questions" />
        </a>
        <ButtonLink href="/analyse" size="sm">
          Scanner mon devis
        </ButtonLink>
      </nav>
    </header>
  );
}
