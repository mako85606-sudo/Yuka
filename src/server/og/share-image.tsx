import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ogColors, ogShadow, ogSize } from "@/config/og";
import { site } from "@/config/site";
import { CATEGORY_LABELS, type Category } from "@/config/taxonomy";
import type { SavingsRange } from "@/lib/analysis/result";
import { savingsText } from "@/lib/analysis/result-view";
import { LOGO_VIEWBOX, logoMark } from "@/lib/logo";
import type { Verdict } from "@/lib/scene-quote";

/**
 * Image de partage (Open Graph) : le logo, un titre éditorial, l'économie
 * possible en grand et le verdict. Rien de personnel : la catégorie, le
 * verdict, des nombres. Polices embarquées (`assets/fonts`, licence OFL).
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

const VERDICT: Record<Verdict, { readonly label: string; readonly color: string; readonly background: string }> = {
  ok: { label: "Correct", color: ogColors.verdictOk, background: ogColors.brandSoft },
  negotiate: { label: "À négocier", color: ogColors.verdictNegotiate, background: ogColors.warningSoft },
  alert: { label: "À vérifier sérieusement", color: ogColors.verdictAlert, background: ogColors.errorSoft },
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
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Le logo : la tuile à l'encre, la loupe blanche, la coche verte (géométrie partagée, `src/lib/logo.ts`). */
function LogoMark({ size }: { readonly size: number }) {
  const { tile, lens, handle, tick } = logoMark;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`}>
      <rect width={tile.size} height={tile.size} rx={tile.radius} fill={ogColors.ink} />
      <circle cx={lens.cx} cy={lens.cy} r={lens.r} fill="none" stroke={ogColors.card} strokeWidth={lens.strokeWidth} />
      <path d={handle.d} stroke={ogColors.card} strokeWidth={handle.strokeWidth} strokeLinecap="round" />
      <path
        d={tick.d}
        fill="none"
        stroke={ogColors.brand}
        strokeWidth={tick.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** L'image d'une correction partagée, ou celle du site (`input` absent). */
export async function renderShareImage(input: ShareImageInput | null): Promise<ImageResponse> {
  const verdict = input ? VERDICT[input.verdict] : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: ogColors.page,
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
            background: ogColors.card,
            borderRadius: 20,
            padding: "52px 60px",
            boxShadow: ogShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <LogoMark size={56} />
              <div style={{ display: "flex", fontSize: 40, color: ogColors.ink, letterSpacing: -1 }}>{site.name}</div>
            </div>
            <div style={{ display: "flex", fontSize: 24, color: ogColors.inkMuted }}>
              {input ? "Avis indicatif · sans nom ni adresse" : "Indépendant · aucun artisan ne nous paie"}
            </div>
          </div>

          {input && verdict ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 64, lineHeight: 1, color: ogColors.ink }}>
                  {`Devis de ${CATEGORY_LABELS[input.category].toLowerCase()}`}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    color: verdict.color,
                    background: verdict.background,
                    borderRadius: 10,
                    padding: "8px 18px",
                  }}
                >
                  {verdict.label}
                </div>
              </div>
              {input.savings ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", fontSize: 28, color: ogColors.inkMuted }}>Économie possible</div>
                  <div style={{ display: "flex", fontSize: 88, letterSpacing: -3, color: ogColors.brandStrong }}>
                    {savingsText(input.savings)}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 96, lineHeight: 1, color: ogColors.ink }}>
                Ne payez plus
              </div>
              <div style={{ display: "flex", fontFamily: "Instrument Serif", fontSize: 96, lineHeight: 1.05, color: ogColors.brandStrong }}>
                un devis trop cher.
              </div>
            </div>
          )}

          <div style={{ display: "flex", fontSize: 30, color: ogColors.ink }}>
            {input
              ? summary(input)
              : "Calculs, mentions obligatoires et prix vérifiés en 30\u00a0secondes."}
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: await fonts() },
  );
}
