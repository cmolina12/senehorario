import type { MetadataRoute } from "next";

const SITE_URL = "https://senehorario.cmolina.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/planning`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/novedades`, changeFrequency: "weekly", priority: 0.5 },
  ];
}
