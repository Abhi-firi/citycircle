"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/modules/auth/AuthProvider";
import { MessagesView } from "@/modules/messages/MessagesView";

function Messages() {
  const router = useRouter();
  const active = useSearchParams().get("c");
  const { user, loading, configError } = useAuth();

  useEffect(() => {
    if (!loading && !configError && !user) router.replace("/login/");
  }, [loading, configError, user, router]);

  if (configError)
    return <p className="text-muted">Not available right now.</p>;
  if (loading || !user) return <p className="text-muted">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Messages</h1>
      <MessagesView userId={user.id} activeId={active} />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <Messages />
    </Suspense>
  );
}
