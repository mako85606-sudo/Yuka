import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * GitHub Codespaces : le site s'ouvre sur l'adresse publique du port
 * (« nom-3000.app.github.dev »), que le serveur ne connaît pas. Cette adresse
 * est autorisée pour les ressources de développement et les Server Actions
 * (doc Next : allowedDevOrigins, serverActions.allowedOrigins). En
 * développement, toute adresse de codespace l'est aussi (`*.` : un seul
 * niveau) : les variables du codespace manquent parfois au serveur lancé à
 * l'ouverture, et le port change si 3000 est pris. Rien en production.
 */
const codespaceHost =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-${process.env.PORT ?? "3000"}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : null;
const forwardedHosts = [
  ...(codespaceHost ? [codespaceHost] : []),
  ...(isDev ? [`*.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev"}`] : []),
];

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
  ...(forwardedHosts.length > 0
    ? {
        allowedDevOrigins: forwardedHosts,
        experimental: { serverActions: { allowedOrigins: forwardedHosts } },
      }
    : {}),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
