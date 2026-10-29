"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

type AuthState = {
  user: User | null;
  /** True until the first session check finishes. */
  loading: boolean;
  /** True when Supabase settings are missing in this build. */
  configError: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  configError: false,
});

function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(tryGetSupabase);
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: supabase !== null,
    configError: supabase === null,
  });

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active)
        setState({
          user: data.session?.user ?? null,
          loading: false,
          configError: false,
        });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active)
        setState({
          user: session?.user ?? null,
          loading: false,
          configError: false,
        });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
