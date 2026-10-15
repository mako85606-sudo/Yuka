import { cn } from "@/lib/cn";
import { LOGO_VIEWBOX, logoMark } from "@/lib/logo";

/** L'icône seule : la tuile à l'encre, la loupe blanche, la coche verte. Décorative (le nom l'accompagne). */
export function LogoMark({ className }: { readonly className?: string }) {
  const { tile, lens, handle, tick } = logoMark;
  return (
    <svg aria-hidden viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} className={cn("size-8 shrink-0", className)}>
      <rect width={tile.size} height={tile.size} rx={tile.radius} className="fill-ink" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={lens.cx} cy={lens.cy} r={lens.r} strokeWidth={lens.strokeWidth} className="stroke-paper" />
        <path d={handle.d} strokeWidth={handle.strokeWidth} className="stroke-paper" />
        <path d={tick.d} strokeWidth={tick.strokeWidth} className="stroke-brand" />
      </g>
    </svg>
  );
}

/** Le logo : l'icône et « Loupe ». */
export function Logo({ className }: { readonly className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[1.375rem] font-semibold leading-none tracking-[-0.03em] text-ink">Loupe</span>
    </span>
  );
}
