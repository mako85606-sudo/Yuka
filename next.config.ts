import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/content-security-policy";
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
 * Politique de contenu sans nonce, celle des pages statiques
 * (src/lib/content-security-policy.ts) : posée ici sur toutes les adresses,
 * comme plancher. Sur les pages rendues à chaque visite, `src/proxy.ts` la
 * remplace par la politique stricte, à nonce (vérifié avec `next start`). Si
 * un hébergeur envoyait les deux en-têtes, le navigateur appliquerait les
 * deux : la plus stricte l'emporte, et les scripts de Next.js, munis du
 * nonce, passent l'une comme l'autre.
 */
const staticContentSecurityPolicy = contentSecurityPolicy({ dev: isDev });

const securityHeaders = [
  { key: "Content-Security-Policy", value: staticContentSecurityPolicy },
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
