import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";

/**
 * POST /api/auth/auto-confirm
 * Kayıt sonrası e-posta onayını otomatik atla.
 * Sadece user_id kabul eder — admin client ile email_confirmed_at günceller.
 */
export async function POST(request: Request) {
  try {
    const { user_id } = await request.json();
    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user_id, {
      email_confirm: true,
    });

    if (error) {
      return safeError(error);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
