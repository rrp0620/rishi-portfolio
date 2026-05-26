import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
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

// Inline script that applies the user's saved theme (or their system
// preference) BEFORE React hydrates. Without this you'd see a flash of
// the wrong theme on every page load. The matching toggle component
// writes to localStorage so this script picks it up next time.
const themeBootstrap = `
  (function() {
    try {
      var stored = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || (prefersDark ? 'dark' : 'light');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
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
      </body>
    </html>
  );
}
