import Link from "next/link";
import { fr } from "@/lib/typography";

/**
 * « Comment ce résultat est produit » : ce qui vient de l'IA, ce qui vient de
 * règles fixes. Affiché en permanence sous le résultat et sur la page de
 * partage (règlement européen sur l'IA, art. 50 : informer qu'on a affaire à
 * un système d'IA).
 */
export function HowItIsMade({ shared = false }: { readonly shared?: boolean }) {
  return (
    <section aria-labelledby="titre-production" className="rounded-lg border border-rule bg-paper-raised p-5 sm:p-6">
      <h2 id="titre-production" className="text-lg font-semibold text-ink">
        {fr("Comment ce résultat est produit")}
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[0.95rem] leading-relaxed text-ink-muted marker:text-brand-strong">
        <li>
          {fr(
            "La lecture du devis (lignes, montants, mentions) est faite par une intelligence artificielle, le modèle Claude d'Anthropic. Elle peut se tromper, surtout sur une photo peu nette.",
          )}
        </li>
        <li>{fr("Les calculs, les mentions et le verdict sont ensuite vérifiés par des règles fixes, sans IA.")}</li>
        <li>
          {fr(
            "Un prix comparé à la « base Loupe » vient de devis réels rendus anonymes. Une « estimation IA » est une fourchette proposée par le modèle, à confiance faible : ce n'est pas un prix de marché.",
          )}
        </li>
        {shared ? null : (
          <li>{fr("Le message à l'artisan est rédigé par des règles fixes, à partir des seuls points vérifiés.")}</li>
        )}
      </ul>
      <p className="mt-3 text-sm text-ink-muted">
        {fr(shared ? "Seul le devis original fait foi. " : "Comparez toujours avec votre devis original. ")}
        <Link
          href="/methode"
          className="font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
        >
          {fr("Notre méthode en détail")}
        </Link>
      </p>
    </section>
  );
}
