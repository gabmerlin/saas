// app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@/lib/supabase/init"; // Initialiser la suppression des logs GoTrueClient
import { SessionProvider } from "@/components/auth/session-provider";
import { SimpleCrossDomainProvider } from "@/components/auth/simple-cross-domain";
import { CrossDomainSessionInitializer } from "@/components/auth/cross-domain-session-initializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "QG Chatting",
  description: "Solution complète de communication et collaboration pour les entreprises",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: 'Manrope, Inter, sans-serif' }}
      >
        <SessionProvider>
          <SimpleCrossDomainProvider>
            <CrossDomainSessionInitializer>
              {children}
            </CrossDomainSessionInitializer>
          </SimpleCrossDomainProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
