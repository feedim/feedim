import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEnumRateLimit } from "@/lib/enumRateLimit";
import { getTranslations } from "next-intl/server";

// Resolve username to email for login
// Email'i direkt döndürmek yerine sadece "found" bilgisi döner.
// Client login'de email zaten Supabase client'tan signInWithPassword ile gönderilir.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkEnumRateLimit(ip))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { identifier } = await req.json();
  if (!identifier) {
    const tErrors = await getTranslations("apiErrors");
    return NextResponse.json({ error: tErrors("identifierRequired") }, { status: 400 });
  }

  const supabase = await createClient();

  // If it looks like an email, return as-is
  if (identifier.includes("@")) {
    return NextResponse.json({ email: identifier });
  }

  // Otherwise, look up by username — return masked email
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("username", identifier.toLowerCase())
    .single();

  if (!data) {
    // Generic error — don't reveal whether username exists
    return NextResponse.json({ error: "invalid_credentials" }, { status: 404 });
  }

  // Mask email: show first 2 chars + domain hint (a**@g****.com)
  const email = data.email;
  const [local, domain] = email.split("@");
  const maskedLocal = local.slice(0, 2) + "***";
  const domainParts = domain.split(".");
  const maskedDomain = domainParts[0].slice(0, 1) + "****." + domainParts.slice(1).join(".");
  return NextResponse.json({ email: `${maskedLocal}@${maskedDomain}` });
}
