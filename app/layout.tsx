import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/lib/language-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoRepute.ai - AI-Driven Generative Optimization System",
  description: "Next-generation AI-driven visibility control across SEO and AI search ecosystems. Predict → Generate → Publish → Measure → Optimize",
  keywords: ["SEO", "AI search", "GEO", "reputation management", "visibility optimization"],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

// Script to set language direction before React hydrates (prevents flash)
const languageScript = `
  (function() {
    try {
      var lang = localStorage.getItem('preferred-language');
      if (lang === 'he') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'he';
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set language direction before React hydrates to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: languageScript }} />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              borderRadius: '0.75rem',
              padding: '16px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#14b8a6',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

