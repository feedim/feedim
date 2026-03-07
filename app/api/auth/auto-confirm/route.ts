import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordRegistration } from "@/lib/registrationRateLimit";
import { safeError } from "@/lib/apiError";
import { verifyRegistrationProof } from "@/lib/registrationProof";
import { getTranslations } from "next-intl/server";

const MAX_AGE_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const tErrors = await getTranslations("apiErrors");
    const { user_id, registrationProof, deviceHash } = await request.json();

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 400 });
    }

    if (
      !registrationProof ||
      typeof registrationProof !== "string" ||
      !(await verifyRegistrationProof(
        registrationProof,
        ip,
        typeof deviceHash === "string" ? deviceHash : undefined
      ))
    ) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: { user }, error: fetchError } = await admin.auth.admin.getUserById(user_id);
    if (fetchError || !user) {
      return NextResponse.json({ error: tErrors("profileNotFound") }, { status: 404 });
    }

    const createdAt = new Date(user.created_at).getTime();
    if (Date.now() - createdAt > MAX_AGE_MS) {
      return NextResponse.json({ error: tErrors("registrationWindowExpired") }, { status: 403 });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ ok: true });
    }

    const regResult = await recordRegistration(ip, typeof deviceHash === "string" ? deviceHash : undefined);
    if (!regResult.allowed) {
      return NextResponse.json({ error: tErrors("registrationLimitExceeded") }, { status: 429 });
    }

    const { error } = await admin.auth.admin.updateUserById(user_id, {
      email_confirm: true,
    });

    if (error) {
      return safeError(error);
    }

    await admin
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", user_id);

    return NextResponse.json({ ok: true });
  } catch {
    return safeError(null);
  }
}
