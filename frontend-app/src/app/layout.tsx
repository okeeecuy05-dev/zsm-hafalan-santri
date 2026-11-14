import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZSM Hafalan Santri",
  description: "Tracker hafalan Al-Qur'an: Ziadah, Sabqi, dan Muraja'ah.",
  applicationName: "ZSM Hafalan",
  appleWebApp: { capable: true, title: "ZSM Hafalan", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

// Lebar halaman diatur per rute: halaman santri memakai <MobileShell>,
// dasbor ustadz memakai kontainer lebar sendiri.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-dvh bg-slate-50 text-slate-900 antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
