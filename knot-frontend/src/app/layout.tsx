import type { Metadata } from "next";
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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knot.fashion";

const siteTitle = "Anti–Fast Fashion, Pro Perfect Fit | knot.fashion";
const siteDescription =
  "knot.fashion uses privacy‑respectful AI body scanning to help you buy clothes that actually fit. Less fast fashion churn, fewer returns, more pieces worth keeping.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | knot.fashion",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "knot.fashion",
    url: siteUrl,
    title: "Anti–Fast Fashion, Pro Perfect Fit",
    description: siteDescription,
  },
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
      >
        {children}
      </body>
    </html>
  );
}

