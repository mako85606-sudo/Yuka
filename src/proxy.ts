import { NextResponse, type NextRequest, type ProxyConfig } from "next/server";
import { contentSecurityPolicy, createNonce } from "@/lib/content-security-policy";

/**
 * Politique de contenu stricte des pages rendues à chaque visite : un nonce
 * neuf par requête (src/lib/content-security-policy.ts). Next.js le lit dans
 * l'en-tête `Content-Security-Policy` de la requête et l'attache à ses
 * scripts ; la réponse porte la même politique, à la place de celle, plus
 * large, de `next.config.ts` (qui reste le plancher de toutes les autres
 * adresses).
 */
export function proxy(request: NextRequest) {
  const policy = contentSecurityPolicy({ dev: process.env.NODE_ENV === "development", nonce: createNonce() });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

/**
 * Seulement les pages rendues à chaque visite (`await connection()`) : une
 * page statique, générée au build, n'a pas de nonce, et la politique stricte
 * y bloquerait les scripts de Next.js. Toute nouvelle page dynamique peut
 * venir ici ; jamais une page statique (`proxy.test.ts` le vérifie pour
 * celles-ci). Les préchargements de `next/link` sont laissés de côté, comme
 * le conseille la doc. Valeurs écrites en toutes lettres : Next.js lit ce
 * réglage au build, sans exécuter le fichier.
 */
export const config: ProxyConfig = {
  matcher: [
    {
      source: "/analyse/:id",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/v/:shareId",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/admin",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
