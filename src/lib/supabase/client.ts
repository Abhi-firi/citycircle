import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

let client: SupabaseClient | undefined;

/** Browser Supabase client. Created lazily so pages without auth still build. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    // Next.js only inlines NEXT_PUBLIC_ vars when they are referenced literally.
    const { url, publishableKey } = getSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    client = createClient(url, publishableKey);
  }
  return client;
}
