import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devPagesEnabled } from "@/lib/dev-pages";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Pages internes : masquées en production (voir `devPagesEnabled`). */
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (!devPagesEnabled()) notFound();
  return children;
}
