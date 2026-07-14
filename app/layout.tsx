import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "SubSync",
  title: { default: "SubSync", template: "%s · SubSync" },
  description:
    "SaaS per il tracciamento abbonamenti e il calcolo del Monthly Burn Rate normalizzato.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SubSync",
  },
  // La favicon del brand è fornita dalla convenzione file `app/icon.png`
  // (Next genera automaticamente <link rel="icon">). Qui resta solo l'icona
  // Apple; le icone PWA 192/512 sono definite in `app/manifest.ts`.
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen">
        {children}
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
