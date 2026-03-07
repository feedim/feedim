import type { Session, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOtpClient } from "@/lib/supabase/otpClient";

const OTP_TYPES = ["email", "recovery", "magiclink"] as const;

export async function verifyEmailOtpCode(
  email: string,
  code: string
): Promise<{ user: User; session: Session | null } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.replace(/\s+/g, "").trim();

  if (!normalizedEmail || !/^\d{6}$/.test(normalizedCode)) {
    return null;
  }

  const publicClient = createOtpClient();
  const adminClient = createAdminClient();
  const clients = [publicClient, adminClient] as const;

  for (const client of clients) {
    for (const type of OTP_TYPES) {
      const { data, error } = await client.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type,
      });

      if (!error && data?.user) {
        return { user: data.user, session: data.session ?? null };
      }
    }
  }

  return null;
}
