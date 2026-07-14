import type { MetadataRoute } from "next";

/**
 * Web App Manifest (PWA) — generato dal Metadata API di Next.
 * Esposto su /manifest.webmanifest e collegato automaticamente nel <head>.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SubSync",
    short_name: "SubSync",
    description:
      "Traccia gli abbonamenti e calcola il Monthly Burn Rate normalizzato.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
