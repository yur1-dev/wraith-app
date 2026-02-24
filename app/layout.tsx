import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wraith — DeFi Automation",
    template: "%s | Wraith",
  },
  description:
    "Wraith is a no-code DeFi automation platform. Build, schedule, and execute on-chain strategies across multiple wallets and chains — visually.",
  keywords: [
    "DeFi",
    "automation",
    "crypto",
    "flow builder",
    "airdrop farming",
    "multi-wallet",
    "on-chain",
    "blockchain",
    "Web3",
    "Wraith",
  ],
  authors: [{ name: "Wraith" }],
  creator: "Wraith",
  publisher: "Wraith",
  metadataBase: new URL("https://wraith.gg"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wraith.gg",
    siteName: "Wraith",
    title: "Wraith — DeFi Automation",
    description:
      "Build and automate your DeFi strategies visually. Bridging, swapping, farming, and airdrop hunting — all on autopilot.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wraith — DeFi Automation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wraith — DeFi Automation",
    description:
      "Build and automate your DeFi strategies visually. No code required.",
    images: ["/og-image.png"],
    creator: "@wraith_gg",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@xyflow/react@12/dist/style.css"
        />
        <meta name="theme-color" content="#020617" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
