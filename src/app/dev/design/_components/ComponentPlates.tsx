"use client";

import { useState, type ReactNode } from "react";
import { HighlighterMark } from "@/components/signature/HighlighterMark";
import { MarginNote } from "@/components/signature/MarginNote";
import { PaperSheet } from "@/components/signature/PaperSheet";
import { PriceDelta } from "@/components/signature/PriceDelta";
import { RedCircle } from "@/components/signature/RedCircle";
import { Stamp, type Verdict } from "@/components/signature/Stamp";
import { Button } from "@/components/ui/Button";
import { demoQuote } from "@/fixtures/demo-quote";
import { formatAmount } from "@/lib/format";
import { Plate } from "./Plate";

/** Planches des six composants signature, chacun rejouable seul. */
export function ComponentPlates() {
  return (
    <div className="space-y-20">
      <SheetPlate />
      <CirclePlate />
      <HighlighterPlate />
      <NotePlate />
      <PricePlate />
      <StampPlate />
    </div>
  );
}

const SAMPLE_LINES = demoQuote.lines.slice(0, 3);

/** Ligne de devis simple, sans animation, pour les démonstrations isolées. */
function Row({ label, amount, children }: { label: string; amount: number; children?: ReactNode }) {
  return (
    <div className="relative py-2.5">
      <div className="relative isolate flex items-baseline gap-3">
        {children}
        <span className="min-w-0 flex-1 text-[0.95rem] leading-snug">{label}</span>
        <span className="shrink-0 font-mono text-[0.95rem] tabular-nums">{formatAmount(amount)}</span>
      </div>
    </div>
  );
}

function SheetPlate() {
  const [shakeKey, setShakeKey] = useState(0);
  const [scanning, setScanning] = useState(false);

  return (
    <Plate
      title="PaperSheet"
      description="Le devis reconstruit, jamais l'image originale. La feuille glisse sur le bureau (40 px, de 3° à −0,6°) et son ombre se resserre. « Scanner » montre le faisceau de l'étape de lecture, « Secouer » le coup de tampon."
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={scanning}
            onClick={() => setScanning((value) => !value)}
          >
            {scanning ? "Arrêter le scan" : "Scanner"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShakeKey((value) => value + 1)}>
            Secouer
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-md">
        <PaperSheet scanning={scanning} shakeKey={shakeKey}>
          <div className="px-6 pb-6 pt-7">
            <p className="font-mono text-label uppercase text-ink-muted">Devis reconstruit</p>
            <p className="mt-1.5 font-display text-[1.6rem] leading-tight">Remplacement d&apos;un chauffe-eau</p>
            <div className="mt-4 divide-y divide-rule border-t border-rule">
              {SAMPLE_LINES.map((line) => (
                <Row key={line.id} label={line.label} amount={line.totalHT} />
              ))}
            </div>
          </div>
        </PaperSheet>
      </div>
    </Plate>
  );
}

function CirclePlate() {
  return (
    <Plate
      title="RedCircle"
      description="Une boucle au stylo rouge, tracée en 450 ms. Son irrégularité dépend de l'identifiant de la ligne : rejoue, chaque boucle garde exactement son coup de crayon."
    >
      <div className="mx-auto max-w-md">
        <PaperSheet entrance={false}>
          <div className="divide-y divide-rule px-6 py-4">
            {SAMPLE_LINES.map((line, index) => (
              <div key={line.id} className="relative py-1">
                <RedCircle id={`cercle-${line.id}`} delay={0.2 + index * 0.55} />
                <Row label={line.label} amount={line.totalHT} />
              </div>
            ))}
          </div>
        </PaperSheet>
      </div>
    </Plate>
  );
}

function HighlighterPlate() {
  return (
    <Plate
      title="HighlighterMark"
      description="Le surligneur balaie la ligne depuis la gauche en 280 ms. Bords irréguliers, pointe biseautée ; la nuit, le jaune se tamise pour garder le texte lisible."
    >
      <div className="mx-auto max-w-md">
        <PaperSheet entrance={false}>
          <div className="divide-y divide-rule px-6 py-4">
            {SAMPLE_LINES.map((line, index) => (
              <Row key={line.id} label={line.label} amount={line.totalHT}>
                <HighlighterMark id={`surligneur-${line.id}`} delay={0.2 + index * 0.4} />
              </Row>
            ))}
          </div>
        </PaperSheet>
      </div>
    </Plate>
  );
}

function NotePlate() {
  const [first, second] = demoQuote.issues;

  return (
    <Plate
      title="MarginNote"
      description="La note bleue apparaît avec un léger décalage, reliée à sa ligne par un trait courbe. Dans la marge dès 640 px, sous la ligne sur mobile ; le lecteur d'écran lit l'explication complète."
    >
      <div className="mx-auto max-w-2xl">
        <PaperSheet entrance={false}>
          <div className="space-y-6 px-5 py-6 sm:px-8">
            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-x-7 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Row label="Main-d'œuvre, pose et raccordement" amount={280} />
              {first ? (
                <MarginNote id={first.id} delay={0.2} placement="margin" srText={first.detail}>
                  {first.note}
                </MarginNote>
              ) : null}
            </div>
            <div>
              <Row label="Forfait divers" amount={120} />
              {second ? (
                <MarginNote id={second.id} delay={0.5} placement="below" srText={second.detail}>
                  {second.note}
                </MarginNote>
              ) : null}
            </div>
          </div>
        </PaperSheet>
      </div>
    </Plate>
  );
}

function PricePlate() {
  return (
    <Plate
      title="PriceDelta"
      description="L'avis de prix compte jusqu'à l'écart en 600 ms au plus, et affiche toujours sa source et sa confiance. Pas d'encre rouge : ce n'est pas une erreur vérifiée."
    >
      <div className="grid gap-8 sm:grid-cols-3">
        <PriceDelta amount={340} source={{ kind: "loupe", comparables: 23 }} delay={0.2} />
        <PriceDelta amount={-85} source={{ kind: "loupe", comparables: 9 }} delay={0.35} />
        <PriceDelta amount={12} source={{ kind: "ai" }} delay={0.5} />
      </div>
    </Plate>
  );
}

const STAMPS: readonly { verdict: Verdict; delay: number }[] = [
  { verdict: "ok", delay: 0.3 },
  { verdict: "negotiate", delay: 1 },
  { verdict: "alert", delay: 1.7 },
];

function StampPlate() {
  return (
    <Plate
      title="Stamp"
      description="Le tampon tombe (1,6 → 1, spring rigide avec un léger dépassement), la feuille tressaille de 2 px et l'encre gicle. Penché entre −12° et −8°, toujours pareil pour une même analyse."
    >
      <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
        {STAMPS.map(({ verdict, delay }) => (
          <StampOnSheet key={verdict} verdict={verdict} delay={delay} />
        ))}
      </div>
    </Plate>
  );
}

function StampOnSheet({ verdict, delay }: { verdict: Verdict; delay: number }) {
  const [shakeKey, setShakeKey] = useState(0);

  return (
    <PaperSheet entrance={false} shakeKey={shakeKey}>
      <div className="flex min-h-44 items-center justify-center px-4 py-8">
        <Stamp
          verdict={verdict}
          id={`planche-${verdict}`}
          date={demoQuote.correctedAt}
          delay={delay}
          onImpact={() => setShakeKey((value) => value + 1)}
        />
      </div>
    </PaperSheet>
  );
}
