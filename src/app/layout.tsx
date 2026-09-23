import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { businessConfig } from "@/config/business";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${businessConfig.name} · Hospitality Management`,
    template: `%s · ${businessConfig.shortName}`,
  },
  description: `Bar, kitchen, room, and guest house management for ${businessConfig.name}, ${businessConfig.location}.`,
  applicationName: businessConfig.name,
  keywords: ["hospitality", "bar POS", "guest house", "Rwanda", "Byumba"],
};

export const viewport: Viewport = {
  themeColor: "#12372a",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable}`}
    >
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
