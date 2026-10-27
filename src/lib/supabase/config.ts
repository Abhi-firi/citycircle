export type SupabaseConfig = { url: string; publishableKey: string };

type Env = Record<string, string | undefined>;

/**
 * Reads and validates Supabase settings. Only the public URL and the
 * publishable key belong here. Never use the service-role (secret) key in
 * browser code.
 */
export function getSupabaseConfig(env: Env): SupabaseConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co");
  }
  if (!publishableKey.startsWith("sb_publishable_") && !publishableKey.startsWith("eyJ")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable (anon) key.");
  }
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("A secret key was provided. Use the publishable key in browser code.");
  }
  return { url, publishableKey };
}
