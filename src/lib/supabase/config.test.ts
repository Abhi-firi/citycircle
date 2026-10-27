import { describe, expect, it } from "vitest";
import { getSupabaseConfig } from "./config";

const url = "https://abcdefghijklmnop.supabase.co";
const key = "sb_publishable_abc123";

describe("getSupabaseConfig", () => {
  it("returns the config when values are valid", () => {
    expect(
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toEqual({ url, publishableKey: key });
  });

  it("throws when values are missing", () => {
    expect(() => getSupabaseConfig({})).toThrow(/not configured/);
  });

  it("rejects a non-Supabase URL", () => {
    expect(() =>
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.com",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toThrow(/must look like/);
  });

  it("rejects a secret key", () => {
    expect(() =>
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
      }),
    ).toThrow(/publishable/);
  });
});
