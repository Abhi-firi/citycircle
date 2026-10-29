"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/AuthProvider";
import { AdminPanel } from "@/modules/admin/AdminPanel";
import { fetchIsAdmin } from "@/modules/admin/api";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, configError } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !configError && !user) router.replace("/login/");
  }, [loading, configError, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchIsAdmin().then(
      (v) => active && setIsAdmin(v),
      () => active && setIsAdmin(false),
    );
    return () => {
      active = false;
    };
  }, [user]);

  if (configError)
    return <p className="text-muted">Not available right now.</p>;
  if (loading || !user || isAdmin === null)
    return <p className="text-muted">Loading...</p>;
  if (!isAdmin)
    return <p className="text-muted">You do not have access to this page.</p>;
  return <AdminPanel adminId={user.id} />;
}
