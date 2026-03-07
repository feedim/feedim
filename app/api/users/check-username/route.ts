import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: tErrors("usernameRequired") }, { status: 400 });
  }

  const usernameRegex = /^(?!.*[._]{2})[A-Za-z0-9](?:[A-Za-z0-9._]{1,13})[A-Za-z0-9]$/;
  if (!usernameRegex.test(username)) {
    return NextResponse.json({ available: false, reason: tErrors("invalidFormat") });
  }

  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username.toLowerCase())
    .neq("user_id", user.id)
    .single();

  return NextResponse.json({ available: !data });
}
