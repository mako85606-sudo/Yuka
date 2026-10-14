import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ogColors, ogShadow, ogSize } from "@/config/og";
import { site } from "@/config/site";
import { CATEGORY_LABELS, type Category } from "@/config/taxonomy";
import type { SavingsRange } from "@/lib/analysis/result";
import { savingsText } from "@/lib/analysis/result-view";
import type { Verdict } from "@/lib/scene-quote";

/**
 * Image de partage (Open Graph) : un titre éditorial, le tampon du verdict et
 * ce qui a été relevé. Rien de personnel : la catégorie, le verdict, des
 * nombres. Polices embarquées (`assets/fonts`, licence OFL).
 */

const FONT_DIR = join(process.cwd(), "assets", "fonts");

async function fonts() {
  const [serif, sans, mono] = await Promise.all([
    readFile(join(FONT_DIR, "InstrumentSerif.ttf")),
    readFile(join(FONT_DIR, "Geist.ttf")),
    readFile(join(FONT_DIR, "GeistMono.ttf")),
  ]);
  return [
    { name: "Instrument Serif", data: serif, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: sans, weight: 500 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 700 as const, style: "normal" as const },
  ];
}

const STAMP: Record<Verdict, { readonly lines: readonly string[]; readonly color: string }> = {
  ok: { lines: ["CORRECT"], color: ogColors.verdictOk },
  negotiate: { lines: ["À NÉGOCIER"], color: ogColors.verdictNegotiate },
  alert: { lines: ["À VÉRIFIER", "SÉRIEUSEMENT"], color: ogColors.verdictAlert },
};

export interface ShareImageInput {
  readonly category: Category;
  readonly verdict: Verdict;
  readonly errors: number;
  readonly warnings: number;
  readonly savings: SavingsRange | null;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count > 1 ? many : one}`;
}

function summary(input: ShareImageInput): string {
  const parts = [
    input.errors > 0 ? plural(input.errors, "erreur vérifiée", "erreurs vérifiées") : "Aucune erreur vérifiée",
    input.warnings > 0 ? plural(input.warnings, "point d'attention", "points d'attention") : null,
    input.savings ? `économie possible : ${savingsText(input.savings)}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/** L'image d'une correction partagée, ou celle du site (`input` absent). */
export async function renderShareImage(input: ShareImageInput | null): Promise<ImageResponse> {
  const title = input ? `Devis de ${CATEGORY_LABELS[input.category].toLowerCase()}` : "Ton devis,";
  const subtitle = "corrigé au stylo rouge.";
  const stamp = input ? STAMP[input.verdict] : { lines: ["LOUPE"], color: ogColors.penRed };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: ogColors.desk,
          padding: 48,
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: ogColors.paperRaised,
            borderRadius: 6,
            padding: "52px 60px",
            boxShadow: ogShadow,
            transform: "rotate(-0.6deg)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Instrument Serif",
                fontSize: 44,
                color: ogColors.ink,
                border: `3px solid ${ogColors.penRed}`,
                borderRadius: 999,
                padding: "2px 26px 6px",
              }}
            >
              {site.name}
            </div>
            <div style={{ display: "flex", fontSize: 24, color: ogColors.inkMuted }}>
              {input ? "Avis indicatif · sans nom ni adresse" : "Avis indicatif · aucun artisan ne nous paie"}
            </div>
          </div>

          {/* Le titre et le tampon ne se touchent jamais : le titre passe à la ligne s'il le faut. */}
          <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 76, lineHeight: 1, color: ogColors.ink }}>
                {title}
              </div>
              <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 76, lineHeight: 1.05, color: ogColors.inkMuted }}>
                {subtitle}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexShrink: 0,
                transform: "rotate(-10deg)",
                border: `6px solid ${stamp.color}`,
                borderRadius: 14,
                padding: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  border: `3px solid ${stamp.color}`,
                  borderRadius: 8,
                  padding: "18px 28px",
                  color: stamp.color,
                  fontFamily: "Geist Mono",
                  fontSize: stamp.lines.length > 1 ? 40 : 48,
                  letterSpacing: 3,
                }}
              >
                {stamp.lines.map((line) => (
                  <div key={line} style={{ display: "flex" }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 30, color: ogColors.ink }}>
            {input ? summary(input) : "Une photo du devis, et une demi-minute plus tard, tu sais quoi négocier."}
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: await fonts() },
  );
}
