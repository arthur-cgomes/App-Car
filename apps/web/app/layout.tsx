import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import { Providers } from "@/components/providers";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import { PRIVACY_BOOTSTRAP_SCRIPT } from "@/lib/privacy";
import { VIEWPORT_BOOTSTRAP_SCRIPT } from "@/lib/viewport";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: "600",
});

export const metadata: Metadata = {
  title: { default: "App Car", template: "%s · App Car" },
  description: "O resumo do seu carro na palma da mão.",
  applicationName: "App Car",
  appleWebApp: { capable: true, title: "App Car", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme={DEFAULT_THEME} className={barlowCondensed.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: VIEWPORT_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PRIVACY_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
