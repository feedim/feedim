import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ coupons: data || [] });
  } catch (error) {
    console.error("Admin coupons GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { code, discountPercent, maxUses, expiryHours } = body;

    // Validate
    if (!code || typeof code !== "string" || code.trim().length < 3 || code.trim().length > 30) {
      return NextResponse.json({ error: "Kupon kodu 3-30 karakter olmalı" }, { status: 400 });
    }
    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json({ error: "İndirim %1-%100 arası olmalı" }, { status: 400 });
    }
    if (maxUses !== null && maxUses !== undefined && maxUses < 1) {
      return NextResponse.json({ error: "Max kullanım en az 1 olmalı" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check if code already exists
    const { data: existing } = await admin
      .from("coupons")
      .select("id")
      .ilike("code", code.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Bu kupon kodu zaten mevcut" }, { status: 400 });
    }

    const expiresAt = expiryHours
      ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await admin
      .from("coupons")
      .insert({
        code: code.trim().toUpperCase(),
        discount_percent: discountPercent,
        max_uses: maxUses || null,
        expires_at: expiresAt,
        is_active: true,
        created_by: user.id,
        coupon_type: "general",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ coupon: data });
  } catch (error) {
    console.error("Admin coupons POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { couponId } = await request.json();
    if (!couponId) {
      return NextResponse.json({ error: "Missing couponId" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("coupons")
      .update({ is_active: false })
      .eq("id", couponId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin coupons DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
