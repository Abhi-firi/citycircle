"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/modules/auth/AuthProvider";
import { MemberProfileView } from "@/modules/network/MemberProfileView";

function Member() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { user, loading, configError } = useAuth();

  useEffect(() => {
    if (!loading && !configError && !user) router.replace("/login/");
  }, [loading, configError, user, router]);

  if (configError)
    return <p className="text-muted">Not available right now.</p>;
  if (loading || !user) return <p className="text-muted">Loading...</p>;
  if (!id) return <p className="text-muted">No member selected.</p>;
  return <MemberProfileView userId={user.id} memberId={id} />;
}

export default function MemberPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <Member />
    </Suspense>
  );
}
