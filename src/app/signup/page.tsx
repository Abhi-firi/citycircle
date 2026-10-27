"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/AuthProvider";
import { Field, inputClass } from "@/modules/auth/Field";

export default function SignupPage() {
  const router = useRouter();
  const { configError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 1) return setError("Enter your full name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!agreed) return setError("Please agree to the Terms and Privacy Policy to continue.");

    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const { data, error: err } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: `${window.location.origin}${base}/login/`,
        },
      });
      if (err) {
        setError(err.message);
      } else if (data.session) {
        router.replace("/profile/");
      } else {
        setCheckEmail(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (configError) return <p className="text-muted">Sign-up is not available right now.</p>;

  if (checkEmail) {
    return (
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-semibold">Check your email</h1>
        <p className="text-muted">
          We sent a confirmation link to {email.trim()}. Open it to finish creating your account, then{" "}
          <Link href="/login/" className="text-accent underline">
            log in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="name">
          <input id="name" className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <input id="password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span>
            I am 18 or older and agree to the{" "}
            <Link href="/terms/" target="_blank" rel="noopener" className="font-medium text-primary underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy/" target="_blank" rel="noopener" className="font-medium text-primary underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login/" className="text-accent underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
