import type { MetadataRoute } from "next";
import { siteOrigin } from "@/server/env";

/**
 * Les moteurs de recherche voient l'accueil et les pages d'information. Les
 * analyses et les partages portent `noindex` ; on ne les interdit pas ici, pour
 * que les aperçus de lien (messageries, réseaux) puissent lire l'image de
 * partage.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dev/"] },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
