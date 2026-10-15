import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/landing/Logo";
import { FindingCard } from "@/components/landing/phone/PhoneParts";
import { PhoneDemo } from "@/components/landing/phone/PhoneDemo";
import { PriceDelta } from "@/components/quote/PriceDelta";
import { VerdictBadge } from "@/components/quote/VerdictBadge";
import { Button } from "@/components/ui/Button";
import { CameraGlyph } from "@/components/ui/icons";
import { Tag } from "@/components/ui/Tag";
import { plumbingQuote } from "@/fixtures/demo-quotes";
import { formatAmount, formatEuros } from "@/lib/format";
import { phoneResult } from "@/lib/phone-demo";
import { ScenePlate } from "./_components/ScenePlate";
import { DesignBoard } from "./_components/DesignBoard";
import { Plate } from "./_components/Plate";
import { Swatches } from "./_components/Swatches";

export const metadata: Metadata = {
  title: "Planche de style",
};

const AMOUNTS = [890, 1483, 148.3, 1631.3];

export default function DesignPage() {
  const findings = phoneResult(plumbingQuote).findings;

  return (
    <DesignBoard>
      <main className="mx-auto max-w-6xl space-y-20 px-4 pb-32 pt-10 sm:px-8 sm:pt-12">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-brand-strong">Loupe · planche de style</p>
          <h1 className="mt-3 font-display text-section text-ink">
            L&apos;expert <em className="text-brand-strong">rassurant</em>
          </h1>
          <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-muted">
            Une page blanche, un vert de marque, des écrans d&apos;application. Le correcteur reste,
            en interface propre : ligne surlignée, pastille, montant faux barré et bon montant à
            côté. Forcez le mouvement réduit, rejouez tout.
          </p>
        </header>

        <ScenePlate />

        <section aria-labelledby="palette" className="space-y-6">
          <div className="max-w-prose">
            <h2 id="palette" className="font-display text-title">
              Palette
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Valeurs lues en direct. Le petit texte tient 4,5:1 sur la page ; le vert vif ne porte que
              de l&apos;encre.
            </p>
          </div>
          <Swatches />
        </section>

        <section aria-labelledby="typographie" className="space-y-8">
          <h2 id="typographie" className="font-display text-title">
            Typographie
          </h2>
          <div className="grid gap-10 lg:grid-cols-3">
            <Specimen name="Instrument Serif" role="Titres">
              <p className="font-display text-[3rem] leading-none">
                Ne payez plus un devis <em className="text-brand-strong">trop cher.</em>
              </p>
            </Specimen>
            <Specimen name="Geist" role="Interface">
              <p className="text-[1.05rem] leading-relaxed">
                Loupe vérifie chaque ligne : les calculs, les mentions obligatoires, les prix. Vous
                gardez la main, nous vous donnons les arguments.
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
          </div>
        </section>

        <section aria-labelledby="composants" className="space-y-12">
          <div className="max-w-prose">
            <h2 id="composants" className="font-display text-title">
              Composants
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Durées, courbes et springs viennent tous de
              <code className="mx-1 font-mono text-[0.85em]">src/lib/motion.ts</code>.
            </p>
          </div>

          <Plate title="Logo" description="Version B : tuile à l'encre, loupe blanche, coche verte.">
            <div className="flex flex-wrap items-center gap-8">
              <Logo />
              <LogoMark className="size-16" />
              <LogoMark className="size-6" />
            </div>
          </Plate>

          <Plate title="Boutons" description="Vert vif et encre pour l'action principale ; contour pour la secondaire.">
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg">
                <CameraGlyph />
                Scanner mon devis
              </Button>
              <Button size="lg" variant="secondary">
                Comment ça marche
              </Button>
              <Button variant="quiet">Tout afficher</Button>
            </div>
          </Plate>

          <Plate title="Pastilles et verdicts" description="La couleur dit la nature du constat ; le verdict reste en petit.">
            <div className="flex flex-wrap items-center gap-3">
              <Tag tone="error">Erreur de calcul</Tag>
              <Tag tone="warning">À préciser</Tag>
              <Tag tone="unconfirmed">À vérifier</Tag>
              <Tag tone="reminder">Rappel</Tag>
              <Tag tone="estimate">Estimation IA</Tag>
              <Tag tone="ok">Correct</Tag>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <VerdictBadge verdict="ok" />
              <VerdictBadge verdict="negotiate" />
              <VerdictBadge verdict="alert" />
            </div>
          </Plate>

          <Plate
            title="Avis de prix"
            description="Toujours avec sa source et sa confiance ; jamais en rouge. Une estimation IA reste à l'encre neutre."
          >
            <div className="grid gap-6 sm:grid-cols-3">
              <PriceDelta amount={340} source={{ kind: "loupe", comparables: 23 }} delay={0.2} />
              <PriceDelta amount={-85} source={{ kind: "loupe", comparables: 9 }} delay={0.35} />
              <PriceDelta amount={12} source={{ kind: "ai" }} delay={0.5} />
            </div>
          </Plate>

          <Plate title="Cartes de constat" description="Les écrans du téléphone de l'accueil.">
            <div className="grid max-w-xl gap-3 text-[15px]">
              {findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </Plate>

          <Plate title="Téléphone" description="Photo, analyse, résultat : la boucle de l'accueil.">
            <PhoneDemo quote={plumbingQuote} className="text-[13px]" />
          </Plate>
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
      <p className="text-sm font-medium text-ink-muted">
        {name} · {role}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
