import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BetaTech Trade Analytics — Advanced Trading Terminal",
  description: "Institutional-grade financial portal featuring real-time crypto & forex analytics, interactive charting, AI signal generation, and risk management calculators.",
  icons: {
    icon: "/logo_betatech.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#06080F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} dark h-full`}>
      <body className="h-full h-[100dvh] w-full overflow-hidden bg-[#06080F] text-slate-100 antialiased font-sans flex flex-col selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] select-none touch-manipulation">
        {children}
      </body>
    </html>
  );
}
