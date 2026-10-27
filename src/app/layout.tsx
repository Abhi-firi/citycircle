import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthNav } from "@/modules/auth/AuthNav";
import { AuthProvider } from "@/modules/auth/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CityCircle: find your city's professional communities",
    template: "%s | CityCircle",
  },
  description:
    "Curated city-wise communities for investors, founders, coders, recruiters, creators and builders across India's metro cities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <header className="border-b border-line bg-surface">
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"
          >
            <Link href="/" aria-label="CityCircle home">
              <Logo />
            </Link>
            <div className="flex items-center gap-5">
              <Link href="/cities/" className="text-sm text-muted hover:text-fg">
                Cities
              </Link>
              <AuthNav />
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl border-t border-line px-4 py-8 text-sm text-muted">
          <p>CityCircle is in early development.</p>
          <nav aria-label="Legal" className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
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
