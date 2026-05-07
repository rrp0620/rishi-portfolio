import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://rishipatel.com"),
  title: "Rishi Patel — Operator + AI builder",
  description:
    "GTM analytics by day, AI builder by night. Looking for Forward Deployed Strategist, AI Solutions, or AI Adoption roles. Remote.",
  openGraph: {
    title: "Rishi Patel — Operator + AI builder",
    description:
      "GTM analytics by day, AI builder by night. Looking for Forward Deployed Strategist, AI Solutions, or AI Adoption roles.",
    url: "https://rishipatel.com",
    siteName: "Rishi Patel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rishi Patel — Operator + AI builder",
    description:
      "GTM analytics by day, AI builder by night. Looking for Forward Deployed Strategist, AI Solutions, or AI Adoption roles.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
