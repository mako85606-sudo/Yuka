import type { NextConfig } from "next";
import { codespaceHosts, ownForwardedHosts } from "./src/lib/forwarded-hosts";

const isDev = process.env.NODE_ENV === "development";

/**
 * GitHub Codespaces : le site s'ouvre sur l'adresse publique du port
 * (« nom-3000.app.github.dev »), et le relais réécrit `Origin` en
 * « http://localhost:3000 » (src/lib/forwarded-hosts.ts). Ces adresses sont
 * permises pour les ressources de développement (allowedDevOrigins : les
 * adresses de codespace) et les Server Actions (serverActions.allowedOrigins :
 * aussi l'adresse locale), en développement seulement. Rien en production.
 */
const codespaceOrigins = codespaceHosts(process.env, process.env.NODE_ENV);
const serverActionOrigins = ownForwardedHosts(process.env, process.env.NODE_ENV);

/**
 * Politique de contenu sans nonce (guide « Content Security Policy » de la
 * doc Next.js) : tout vient du site lui-même. Aucun script, style, police ou
 * appel tiers : la mesure part du serveur. `blob:` et `data:` servent aux
 * aperçus des photos déposées et au grain du papier ; `unsafe-eval` seulement
 * en développement (rechargement à chaud).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La caméra n'est pas coupée : sur téléphone, « Prendre une photo » ouvre l'appareil photo.
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(), browsing-topics=()" },
  // Ignoré en HTTP (développement local), appliqué une fois en ligne en HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Le site n'utilise pas `next/image` : l'optimiseur d'images reste fermé (moins de surface d'attaque).
  images: { unoptimized: true },
  ...(codespaceOrigins.length > 0 ? { allowedDevOrigins: codespaceOrigins } : {}),
  ...(serverActionOrigins.length > 0
    ? { experimental: { serverActions: { allowedOrigins: serverActionOrigins } } }
    : {}),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
