import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GPLC Worship Team",
    short_name: "GPLC Worship",
    description: "Lineups, schedules and availability for the GPLC praise and worship team.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f5ef",
    theme_color: "#235b37",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
