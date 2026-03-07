import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/utils";
import { checkEnumRateLimit } from "@/lib/enumRateLimit";
import { getTranslations } from "next-intl/server";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkEnumRateLimit(ip))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const tErrors = await getTranslations("apiErrors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ error: tErrors("emailRequired") }, { status: 400 });

  if (!isValidEmail(email)) {
    return NextResponse.json({ available: false, reason: tErrors("invalidFormat") });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", email.toLowerCase())
    .single();

  return NextResponse.json({ available: !data });
}
