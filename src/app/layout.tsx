import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { MotionPreferences } from "@/components/motion/MotionPreferences";
import { site } from "@/config/site";
import { serverEnv } from "@/server/env";
import "./globals.css";

/** Titres éditoriaux. L'italique, utilisée par le seul titre de l'accueil, est chargée par `page.tsx`. */
const display = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

/**
 * Interface. Préchargée : sur mobile, le plus grand élément du premier écran
 * est un paragraphe en Geist (audit Lighthouse du 25 octobre 2026), et la
 * police de secours calée par next/font repose sur Arial, absente d'Android
 * et de Linux : sans préchargement, le texte s'affiche d'abord dans une police
 * du système aux autres mesures, puis la page bouge à l'arrivée de Geist.
 */
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

/**
 * Montants et lignes de devis. Pas préchargée : surtout sur la page d'analyse,
 * plus bas que le premier écran ailleurs ; chaque préchargement retarde les autres.
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
