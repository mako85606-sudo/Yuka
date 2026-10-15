import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { MotionPreferences } from "@/components/motion/MotionPreferences";
import { site } from "@/config/site";
import { serverEnv } from "@/server/env";
import "./globals.css";

/** Titres éditoriaux. */
const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

/**
 * Interface. Pas préchargée : le premier élément affiché est un titre (police
 * des titres) ; le texte courant s'affiche d'abord avec une police de secours
 * aux mêmes mesures, puis bascule sans décalage.
 */
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  preload: false,
});

/**
 * Montants et lignes de devis. Pas préchargée : chaque préchargement retarde
 * le titre, le plus grand élément du premier écran.
 */
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

const siteUrl = serverEnv().SITE_URL;

export const metadata: Metadata = {
  // Adresse publique du site, pour les liens absolus (images de partage). Sans elle, Next.js
  // prend l'adresse du déploiement Vercel.
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
};

export const viewport: Viewport = {
  // Une seule identité, claire, quel que soit le réglage du système.
  themeColor: site.themeColor,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh font-sans text-ink antialiased">
        <MotionPreferences>{children}</MotionPreferences>
      </body>
    </html>
  );
}
