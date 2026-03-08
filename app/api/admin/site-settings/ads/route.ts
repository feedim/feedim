import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdsSettings, setAdsSettings } from "@/lib/siteSettings";
import { getTranslations } from "next-intl/server";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return null;
  return user;
}

export async function GET() {
  const tErrors = await getTranslations("apiErrors");
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: tErrors("accessDenied") }, { status: 403 });
  const settings = await getAdsSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: tErrors("accessDenied") }, { status: 403 });
  const body = await request.json();
  const partial: Record<string, boolean> = {};
  if (typeof body.enabled === "boolean") partial.enabled = body.enabled;
  if (typeof body.feed === "boolean") partial.feed = body.feed;
  if (typeof body.moments === "boolean") partial.moments = body.moments;
  if (typeof body.videoPostroll === "boolean") partial.videoPostroll = body.videoPostroll;
  if (typeof body.postDetail === "boolean") partial.postDetail = body.postDetail;
  const settings = await setAdsSettings(partial);
  return NextResponse.json(settings);
}
