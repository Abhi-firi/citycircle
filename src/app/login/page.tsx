"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/AuthProvider";
import { Field, inputClass } from "@/modules/auth/Field";

export default function LoginPage() {
  const router = useRouter();
  const { configError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        // Generic message: do not reveal whether the email has an account.
        setError(
          err.message.toLowerCase().includes("confirm")
            ? "Please confirm your email first. Check your inbox."
            : "Email or password is incorrect.",
        );
      } else {
        router.replace("/profile/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (configError)
    return <p className="text-muted">Login is not available right now.</p>;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-3xl font-semibold">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/signup/" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
