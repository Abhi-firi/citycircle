"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/AuthProvider";
import { NotificationsView } from "@/modules/notifications/NotificationsView";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading, configError } = useAuth();

  useEffect(() => {
    if (!loading && !configError && !user) router.replace("/login/");
  }, [loading, configError, user, router]);

  if (configError)
    return <p className="text-muted">Not available right now.</p>;
  if (loading || !user) return <p className="text-muted">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">Notifications</h1>
      <NotificationsView />
    </div>
  );
}
