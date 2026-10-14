import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium motion-safe:transition-colors motion-safe:duration-(--duration-micro) motion-safe:active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  // Le vert vif porte l'encre, jamais du blanc (contraste vérifié par tokens.test.ts).
  primary: "bg-brand text-ink hover:bg-brand-hover",
  secondary: "border border-rule-strong bg-paper-raised text-ink hover:bg-mist",
  quiet: "text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
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

/** Bouton de Loupe. Le retour d'appui est une translation d'un pixel. */
export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  readonly variant?: Variant;
  readonly size?: Size;
}

/** Lien de navigation qui a l'allure d'un bouton. */
export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
