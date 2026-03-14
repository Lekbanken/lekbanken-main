import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/app", "/admin", "/sandbox"] },
    ],
    sitemap: "https://lekbanken.se/sitemap.xml",
  };
}
