import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for OTP flows (signInWithOtp + verifyOtp).
 * Uses implicit flow (no PKCE) so verifyOtp doesn't require code_verifier.
 * Does not persist sessions — we only use it to send/verify OTP codes.
 */
export function createOtpClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "fdm-otp",
      },
    }
  );
}
