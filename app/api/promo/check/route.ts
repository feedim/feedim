import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !/^[a-zA-ZİŞĞÜÖÇışğüöç0-9]{3,20}$/.test(code)) {
    return NextResponse.json({ valid: false });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("promo_links")
    .select("discount_percent, max_signups, current_signups, expires_at, is_active")
    .ilike("code", code)
    .eq("is_active", true)
    .single();

  if (!data) {
    return NextResponse.json({ valid: false });
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false });
  }

  // Check max signups
  if (data.max_signups && data.current_signups >= data.max_signups) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    discount_percent: data.discount_percent,
  });
}
