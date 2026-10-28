"use client";

import { useAuth } from "@/modules/auth/AuthProvider";
import { MemberHome } from "./MemberHome";

/** Logged-out visitors (and the static HTML) get the marketing page; members get their home. */
export function HomeSwitch({ children }: { children: React.ReactNode }) {
  const { user, loading, configError } = useAuth();
  if (loading || configError || !user) return <>{children}</>;
  return <MemberHome userId={user.id} fallbackName={String(user.user_metadata?.full_name ?? "")} />;
}
