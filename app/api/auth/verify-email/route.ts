import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST: Mark email as verified
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Verify email error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
