import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AskRishi } from "@/components/ask-rishi";

// One typeface across the whole site. Weight does the work — 900 for
// the hero name and project titles, 500 for small caps labels, 400 for
// body. Earlier attempts mixed Inter with a display serif (Fraunces,
// then Instrument Serif). Both reads as editorial-template scaffolding.
// Single-typeface discipline is more confident.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const TITLE = "Rishi Patel · Portfolio";
const DESCRIPTION =
  "I work with executives to ship AI use cases that move real numbers. Senior analyst on the business planning team at a public company, reporting to the Chief Business Officer. Customer-facing AI builds for small businesses on the side. Open to AI deployment roles.";

export const metadata: Metadata = {
  metadataBase: new URL("https://rishi-portfolio-brown.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Rishi Patel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Inline script that applies the user's saved theme BEFORE React hydrates.
// Dark is canonical; light is only applied if the user has explicitly
// toggled to it (stored in localStorage). System preference is ignored so
// dark-loving users on light-mode systems get the design as intended, and
// vice versa via the toggle.
const themeBootstrap = `
  (function() {
    try {
      var stored = localStorage.getItem('theme');
      if (stored === 'light') {
        document.documentElement.classList.add('light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
        {/* Floating chat bubble — available on every page. */}
        <AskRishi />
      </body>
    </html>
  );
}
