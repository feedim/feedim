import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifySponsor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "sponsor" && profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifySponsor(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Sponsors only see their own promo links
    const { data, error } = await admin
      .from("promo_links")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Get signup counts for each promo
    const promoIds = (data || []).map((p: any) => p.id);
    let signupsByPromo: Record<string, any[]> = {};

    if (promoIds.length > 0) {
      const { data: signups } = await admin
        .from("promo_signups")
        .select("promo_link_id, signed_up_at")
        .in("promo_link_id", promoIds)
        .order("signed_up_at", { ascending: false });

      if (signups) {
        for (const s of signups) {
          if (!signupsByPromo[s.promo_link_id]) signupsByPromo[s.promo_link_id] = [];
          signupsByPromo[s.promo_link_id].push(s);
        }
      }
    }

    const promos = (data || []).map((p: any) => ({
      ...p,
      signups: signupsByPromo[p.id] || [],
    }));

    return NextResponse.json({ promos });
  } catch (error) {
    console.error("Sponsor promos GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifySponsor(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { code, discountPercent, maxSignups, expiryHours } = body;

    if (!code || typeof code !== "string" || code.trim().length < 3 || code.trim().length > 20) {
      return NextResponse.json({ error: "Promo kodu 3-20 karakter olmali" }, { status: 400 });
    }
    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json({ error: "Indirim %1-%100 arasi olmali" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 3) {
      return NextResponse.json({ error: "Promo kodu en az 3 harf/rakam olmali" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check duplicate
    const { data: existing } = await admin
      .from("promo_links")
      .select("id")
      .ilike("code", cleanCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Bu promo kodu zaten mevcut" }, { status: 400 });
    }

    const expiresAt = expiryHours
      ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await admin
      .from("promo_links")
      .insert({
        code: cleanCode,
        discount_percent: discountPercent,
        max_signups: maxSignups || null,
        expires_at: expiresAt,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ promo: data });
  } catch (error) {
    console.error("Sponsor promos POST error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifySponsor(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { promoId } = await request.json();
    if (!promoId) {
      return NextResponse.json({ error: "Missing promoId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify this promo belongs to the sponsor
    const { data: promo } = await admin
      .from("promo_links")
      .select("id, created_by")
      .eq("id", promoId)
      .single();

    if (!promo || promo.created_by !== user.id) {
      // Admins can delete any promo
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Bu promo size ait degil" }, { status: 403 });
      }
    }

    await admin.from("promo_signups").delete().eq("promo_link_id", promoId);
    await admin.from("coupons").delete().eq("promo_link_id", promoId);
    const { error } = await admin.from("promo_links").delete().eq("id", promoId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sponsor promos DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
