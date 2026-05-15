import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const TITLE = "Rishi Patel · Portfolio";
const DESCRIPTION =
  "Analyst on the business planning team at a public company. Build AI tools on top of that role to do more in less time. Open to AI deployment roles focused on getting models into real workflows and helping teams adopt them.";

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
        className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
      </body>
    </html>
  );
}
