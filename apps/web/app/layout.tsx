import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import { PRIVACY_BOOTSTRAP_SCRIPT } from "@/lib/privacy";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: "600",
});

const materialSymbols = localFont({
  src: "./fonts/material-symbols-rounded.woff2",
  variable: "--font-material-symbols",
  weight: "400",
  display: "block",
});

export const metadata: Metadata = {
  title: { default: "VW Polo", template: "%s · VW Polo" },
  description: "O resumo do seu carro na palma da mão.",
  applicationName: "VW Polo",
  appleWebApp: { capable: true, title: "VW Polo", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme={DEFAULT_THEME} data-privacy="on" className={`${barlowCondensed.variable} ${materialSymbols.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PRIVACY_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
