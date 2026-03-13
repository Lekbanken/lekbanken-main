import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://lekbanken.se", priority: 1 },
    { url: "https://lekbanken.se/pricing", priority: 0.8 },
    { url: "https://lekbanken.se/features", priority: 0.8 },
  ];
}
