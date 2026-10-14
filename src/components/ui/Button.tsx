import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { PenRing } from "@/components/signature/PenRing";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-[6px] font-medium motion-safe:active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/88",
  secondary: "group relative border border-rule-strong text-ink",
  quiet: "text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[0.95rem]",
  lg: "h-12 px-5 text-base",
  xl: "h-14 px-7 text-[1.0625rem]",
};

/** Classes d'un bouton, pour styler un lien comme un bouton. */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
}

/** Au survol d'un bouton secondaire, le stylo l'entoure (le cercle du logo, devenu motif). */
function HoverRing({ variant }: { readonly variant: Variant }) {
  return variant === "secondary" ? <PenRing mode="hover" shape="wide" className="-inset-x-[0.6em] -inset-y-[0.45em]" /> : null;
}

/** Bouton de Loupe. Le retour d'appui est une translation d'un pixel. */
export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props}>
      {children}
      <HoverRing variant={variant} />
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  readonly variant?: Variant;
  readonly size?: Size;
}

/** Lien de navigation qui a l'allure d'un bouton. */
export function ButtonLink({ variant = "primary", size = "md", className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
      <HoverRing variant={variant} />
    </Link>
  );
}
