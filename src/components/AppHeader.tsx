"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Home,
  LogOut,
  ShieldCheck,
  User,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { UserAvatar } from "@/components/UserAvatar";
import { getSupabase as getDb } from "@/lib/supabase/client";
import { GlobalSearch } from "@/components/GlobalSearch";
import { fetchIsAdmin } from "@/modules/admin/api";
import { useAuth } from "@/modules/auth/AuthProvider";
import { fetchConnectionRows } from "@/modules/network/api";
import { fetchUnreadMessageCount } from "@/modules/messages/api";
import { fetchUnreadCount } from "@/modules/notifications/api";
import { getSupabase } from "@/lib/supabase/client";

function NavIcon({
  href,
  label,
  icon: Icon,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${active ? "text-primary" : "text-muted hover:text-fg"}`}
    >
      <span className="relative">
        <Icon aria-hidden="true" className="h-5 w-5" />
        {badge > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-on-primary">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="hidden sm:block">{label}</span>
    </Link>
  );
}

function AccountMenu({
  name,
  avatarPath,
  isAdmin,
}: {
  name: string;
  avatarPath: string | null;
  isAdmin: boolean;
}) {
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
        className="rounded-full"
      >
        <UserAvatar name={name} path={avatarPath} size="md" />
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
  const [avatar, setAvatar] = useState<{
    userId: string;
    path: string | null;
  } | null>(null);
  const [unread, setUnread] = useState<{
    userId: string;
    count: number;
  } | null>(null);
  const [unreadMsgs, setUnreadMsgs] = useState<{
    userId: string;
    count: number;
  } | null>(null);
  const [pending, setPending] = useState<{
    userId: string;
    count: number;
  } | null>(null);

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

  // Own profile photo for the account button. Refreshed on page changes so a new photo shows up.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    getDb()
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .maybeSingle()
      .then(
        ({ data }) =>
          active && setAvatar({ userId, path: data?.avatar_path ?? null }),
        () => {},
      );
    return () => {
      active = false;
    };
  }, [userId, pathname]);

  // Pending invitations badge. Refreshed whenever the member moves to another page.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchConnectionRows().then(
      (rows) =>
        active &&
        setPending({
          userId,
          count: rows.filter(
            (r) => r.status === "pending" && r.addresseeId === userId,
          ).length,
        }),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [userId, pathname]);

  // Unread notifications badge: refreshed on every page change and once a minute.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = () =>
      fetchUnreadCount().then(
        (count) => active && setUnread({ userId, count }),
        () => {},
      );
    const loadMessages = () =>
      fetchUnreadMessageCount().then(
        (count) => active && setUnreadMsgs({ userId, count }),
        () => {},
      );
    void load();
    void loadMessages();
    const timer = window.setInterval(() => {
      void load();
      void loadMessages();
    }, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [userId, pathname]);

  const member = !loading && !configError && !!user;
  const name = String(user?.user_metadata?.full_name ?? user?.email ?? "");
  const isAdmin = adminId !== null && adminId === userId;
  const unreadCount = unread && unread.userId === userId ? unread.count : 0;
  const unreadMessages =
    unreadMsgs && unreadMsgs.userId === userId ? unreadMsgs.count : 0;
  const invitations = pending && pending.userId === userId ? pending.count : 0;
  const home = pathname === "/";
  const communities = pathname.startsWith("/cities");
  const network =
    pathname.startsWith("/network") || pathname.startsWith("/members");

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
                href="/network/"
                label="My Network"
                icon={UserPlus}
                active={network}
                badge={invitations}
              />
              <NavIcon
                href="/cities/"
                label="Communities"
                icon={Users}
                active={communities}
              />
              <NavIcon
                href="/messages/"

                label="Messages"

                icon={MessageSquare}

                active={pathname.startsWith("/messages")}

                badge={unreadMessages}
              />
              <NavIcon
                href="/notifications/"
                label="Notifications"
                icon={Bell}
                active={pathname.startsWith("/notifications")}
                badge={unreadCount}
              />
            </div>
            <div className="md:ml-auto">
              <AccountMenu
                name={name}
                avatarPath={
                  avatar && avatar.userId === userId ? avatar.path : null
                }
                isAdmin={isAdmin}
              />
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
