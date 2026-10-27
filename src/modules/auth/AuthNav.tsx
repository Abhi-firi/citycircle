"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

export function AuthNav() {
  const { user, loading, configError } = useAuth();
  const router = useRouter();

  if (loading || configError) return null;

  if (!user) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <Link href="/login/" className="text-muted hover:text-fg">
          Log in
        </Link>
        <Link href="/signup/" className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-fg hover:opacity-90">
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
      <Link href="/profile/" className="text-muted hover:text-fg">
        My profile
      </Link>
      <button type="button" onClick={logOut} className="text-muted hover:text-fg">
        Log out
      </button>
    </div>
  );
}
