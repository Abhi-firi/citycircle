import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "@/modules/auth/AuthProvider";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CityCircle: find your city's professional communities",
    template: "%s | CityCircle",
  },
  description:
    "Curated city-wise communities for investors, founders, coders, recruiters, creators and builders across India's metro cities.",
  openGraph: {
    title: "CityCircle: find your city's professional communities",
    description:
      "Curated city-wise communities for investors, founders, coders, recruiters, creators and builders across India's metro cities.",
    siteName: "CityCircle",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#176b63",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
          >
            Skip to content
          </a>
          <AppHeader />
          <main id="main" className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
            {children}
          </main>
          <footer className="mx-auto max-w-7xl border-t border-line px-4 py-8 text-sm text-muted">
            <p>CityCircle is in early development.</p>
            <nav
              aria-label="Legal"
              className="mt-3 flex flex-wrap gap-x-5 gap-y-1"
            >
              <Link href="/terms/" className="hover:text-fg">
                Terms
              </Link>
              <Link href="/privacy/" className="hover:text-fg">
                Privacy
              </Link>
              <Link href="/guidelines/" className="hover:text-fg">
                Community Guidelines
              </Link>
            </nav>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
