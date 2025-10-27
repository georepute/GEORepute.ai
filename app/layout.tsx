import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoRepute.ai - AI-Driven Generative Optimization System",
  description: "Next-generation AI-driven visibility control across SEO and AI search ecosystems. Predict → Generate → Publish → Measure → Optimize",
  keywords: ["SEO", "AI search", "GEO", "reputation management", "visibility optimization"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

