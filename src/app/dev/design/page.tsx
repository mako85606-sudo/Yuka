import type { Metadata } from "next";
import type { ReactNode } from "react";
import { formatAmount, formatEuros } from "@/lib/format";
import { ComponentPlates } from "./_components/ComponentPlates";
import { DesignBoard } from "./_components/DesignBoard";
import { ScenePlate } from "./_components/ScenePlate";
import { Swatches } from "./_components/Swatches";

export const metadata: Metadata = {
  title: "Planche de style",
};

const AMOUNTS = [890, 1483, 148.3, 1631.3];

export default function DesignPage() {
  return (
    <DesignBoard>
      <main className="mx-auto max-w-5xl space-y-24 px-4 pb-32 pt-10 sm:px-8 sm:pt-12">
        <header className="max-w-3xl">
          <p className="font-mono text-label uppercase text-ink-muted">
            Loupe · étape 1 · planche de style
          </p>
          <h1 className="mt-3 font-display text-title text-ink">
            Le correcteur <em className="text-pen-red-strong">au stylo rouge</em>
          </h1>
          <p className="mt-4 max-w-prose text-[1.05rem] leading-relaxed text-ink-muted">
            Ton devis est une copie que Loupe corrige comme un prof : surligneur, stylo rouge,
            notes dans la marge, puis le tampon. Cette page sert à valider l&apos;identité avant
            le reste. Change de thème, force le mouvement réduit, rejoue tout.
          </p>
        </header>

        <ScenePlate />

        <section aria-labelledby="palette" className="space-y-8">
          <div className="max-w-prose">
            <h2 id="palette" className="font-display text-title">
              Palette
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Valeurs lues en direct dans le thème affiché. Les tokens « dérivés » garantissent
              les contrastes : le petit texte tient 4,5:1, le gros texte du tampon 3:1.
            </p>
          </div>
          <Swatches />
        </section>

        <section aria-labelledby="typographie" className="space-y-10">
          <h2 id="typographie" className="font-display text-title">
            Typographie
          </h2>
          <div className="grid gap-12 lg:grid-cols-2">
            <Specimen name="Instrument Serif" role="Titres, en grand">
              <p className="font-display text-[3rem] leading-[0.98]">
                Ton devis, corrigé <em>au stylo rouge</em> en 30 secondes.
              </p>
            </Specimen>
            <Specimen name="Geist" role="Interface">
              <p className="text-[1.05rem] leading-relaxed">
                Loupe relit chaque ligne : les calculs, les mentions obligatoires, les prix. Tu
                gardes la main, on te donne les arguments.
              </p>
              <p className="mt-3 font-mono text-label uppercase text-ink-muted">
                Devis reconstruit · Plomberie · Rhône (69)
              </p>
            </Specimen>
            <Specimen name="Geist Mono" role="Montants : chiffres tabulaires, alignés à droite">
              <dl className="grid max-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 font-mono text-[0.95rem] tabular-nums">
                {AMOUNTS.map((amount) => (
                  <div key={amount} className="contents">
                    <dt className="text-ink-muted">Montant</dt>
                    <dd className="text-right">{formatAmount(amount)}</dd>
                  </div>
                ))}
                <dt className="pt-1 font-semibold">Total TTC</dt>
                <dd className="pt-1 text-right font-semibold">{formatEuros(1631.3)}</dd>
              </dl>
            </Specimen>
            <Specimen name="Caveat" role="Annotations manuscrites, avec parcimonie">
              <p className="font-hand text-[1.7rem] leading-tight text-annotation-blue">
                Un forfait pour quoi ? Demande le détail.
              </p>
            </Specimen>
          </div>
        </section>

        <section aria-labelledby="composants" className="space-y-12">
          <div className="max-w-prose">
            <h2 id="composants" className="font-display text-title">
              Les six composants signature
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Chacun se rejoue seul. Durées, courbes et springs viennent tous de
              <code className="mx-1 font-mono text-[0.85em]">src/lib/motion.ts</code>.
            </p>
          </div>
          <ComponentPlates />
        </section>
      </main>
    </DesignBoard>
  );
}

function Specimen({
  name,
  role,
  children,
}: {
  readonly name: string;
  readonly role: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="border-t border-rule pt-4">
      <p className="font-mono text-label uppercase text-ink-muted">
        {name} · {role}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
