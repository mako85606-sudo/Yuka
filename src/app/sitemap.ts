import type { MetadataRoute } from "next";
import { siteOrigin } from "@/server/env";

/** Les pages publiques et durables du site ; jamais une analyse ni un partage. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  return [
    { url: `${origin}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/confidentialite`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
