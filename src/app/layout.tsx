import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "City Circle: find your city's professional communities",
    template: "%s | City Circle",
  },
  description:
    "Curated city-wise communities for investors, founders, coders, recruiters, creators and builders across India's metro cities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
        >
          Skip to content
        </a>
        <header className="border-b border-line">
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"
          >
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-accent" />
              City Circle
            </Link>
            <Link href="/cities/" className="text-sm text-muted hover:text-fg">
              Cities
            </Link>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl border-t border-line px-4 py-8 text-sm text-muted">
          City Circle is in early development. Sign-ups are not open yet.
        </footer>
      </body>
    </html>
  );
}
