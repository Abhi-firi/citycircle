"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, LogOut, ShieldCheck, User, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GlobalSearch } from "@/components/GlobalSearch";
import { fetchIsAdmin } from "@/modules/admin/api";
import { useAuth } from "@/modules/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase/client";

function NavIcon({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${active ? "text-primary" : "text-muted hover:text-fg"}`}
    >
      <Icon aria-hidden="true" className="h-5 w-5" />
      <span className="hidden sm:block">{label}</span>
    </Link>
  );
}

function AccountMenu({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function logOut() {
    await getSupabase().auth.signOut();
    setOpen(false);
    router.replace("/");
  }

  const item =
    "flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-pale";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-sm font-semibold text-deep"
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          <Link
            href="/profile/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={item}
          >
            <User aria-hidden="true" className="h-4 w-4" /> My profile
          </Link>
          {isAdmin && (
            <Link
              href="/admin/"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={item}
            >
              <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => void logOut()}
            className={item}
          >
            <LogOut aria-hidden="true" className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppHeader() {
  const { user, loading, configError } = useAuth();
  const pathname = usePathname();
  const userId = user?.id;
  const [adminId, setAdminId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchIsAdmin().then(
      (v) => active && setAdminId(v ? userId : null),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [userId]);

  const member = !loading && !configError && !!user;
  const name = String(user?.user_metadata?.full_name ?? user?.email ?? "");
  const isAdmin = adminId !== null && adminId === userId;
  const home = pathname === "/";
  const communities = pathname.startsWith("/cities");

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
      >
        <Link href="/" aria-label="CityCircle home">
          <Logo />
        </Link>

        {member ? (
          <>
            <GlobalSearch className="order-last w-full md:order-none md:max-w-md md:flex-1" />
            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <NavIcon href="/" label="Home" icon={Home} active={home} />
              <NavIcon
                href="/cities/"
                label="Communities"
                icon={Users}
                active={communities}
              />
            </div>
            <div className="md:ml-auto">
              <AccountMenu name={name} isAdmin={isAdmin} />
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-5 text-sm">
            <Link href="/cities/" className="text-muted hover:text-fg">
              Cities
            </Link>
            {!loading && !configError && (
              <>
                <Link href="/login/" className="text-muted hover:text-fg">
                  Log in
                </Link>
                <Link
                  href="/signup/"
                  className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-fg hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
