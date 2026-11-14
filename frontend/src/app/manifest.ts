import type { MetadataRoute } from "next";

// Letakkan ikon PNG di frontend/public/icons/icon-192.png dan icon-512.png
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZSM Hafalan Santri",
    short_name: "ZSM",
    description: "Tracker hafalan Al-Qur'an: Ziadah, Sabqi, dan Muraja'ah.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
