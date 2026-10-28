"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { fetchIsAdmin } from "@/modules/admin/api";
import { useAuth } from "./AuthProvider";

export function AuthNav() {
  const { user, loading, configError } = useAuth();
  const router = useRouter();
  const [adminId, setAdminId] = useState<string | null>(null);
  const userId = user?.id;

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
  const isAdmin = adminId !== null && adminId === userId;

  if (loading || configError) return null;

  if (!user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/login/" className="text-muted hover:text-fg">
          Log in
        </Link>
        <Link
          href="/signup/"
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-fg hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  async function logOut() {
    await getSupabase().auth.signOut();
    router.replace("/");
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {isAdmin && (
        <Link href="/admin/" className="text-muted hover:text-fg">
          Admin
        </Link>
      )}
      <Link href="/profile/" className="text-muted hover:text-fg">
        My profile
      </Link>
      <button
        type="button"
        onClick={logOut}
        className="text-muted hover:text-fg"
      >
        Log out
      </button>
    </div>
  );
}
