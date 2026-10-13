import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

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
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
