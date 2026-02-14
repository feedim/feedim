import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: Check MFA status from profiles table
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("mfa_enabled")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      enabled: profile?.mfa_enabled === true,
    });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

// POST: Enable MFA (requires verified email)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const admin = createAdminClient();

    if (action === "enable") {
      await admin
        .from("profiles")
        .update({ mfa_enabled: true })
        .eq("user_id", user.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("MFA error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// DELETE: Disable MFA
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    await admin
      .from("profiles")
      .update({ mfa_enabled: false })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("MFA disable error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
