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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // If type=promo, return promo links with signup stats
    if (type === "promo") {
      const { data, error } = await admin
        .from("promo_links")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get signup details for each promo
      const promoIds = (data || []).map((p: any) => p.id);
      let signupsByPromo: Record<string, any[]> = {};

      if (promoIds.length > 0) {
        const { data: signups } = await admin
          .from("promo_signups")
          .select("promo_link_id, user_id, signed_up_at, coupon_id")
          .in("promo_link_id", promoIds)
          .order("signed_up_at", { ascending: false });

        if (signups) {
          for (const s of signups) {
            if (!signupsByPromo[s.promo_link_id]) signupsByPromo[s.promo_link_id] = [];
            signupsByPromo[s.promo_link_id].push(s);
          }
        }
      }

      // Get creator emails
      const creatorIds = [...new Set((data || []).map((p: any) => p.created_by).filter(Boolean))];
      let creatorEmails: Record<string, string> = {};

      if (creatorIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", creatorIds);

        // Also get emails from auth.users via admin API
        for (const uid of creatorIds) {
          try {
            const { data: authUser } = await admin.auth.admin.getUserById(uid);
            if (authUser?.user?.email) {
              creatorEmails[uid] = authUser.user.email;
            }
          } catch { /* silent */ }
        }

        if (profiles) {
          for (const p of profiles) {
            if (!creatorEmails[p.user_id] && p.full_name) {
              creatorEmails[p.user_id] = p.full_name;
            }
          }
        }
      }

      const promos = (data || []).map((p: any) => ({
        ...p,
        signups: signupsByPromo[p.id] || [],
        creator_email: creatorEmails[p.created_by] || null,
      }));

      return NextResponse.json({ promos });
    }

    // Default: return coupons
    const { data, error } = await admin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ coupons: data || [] });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin coupons GET error:", error);
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
    const { type } = body;

    const admin = createAdminClient();

    // Create promo link
    if (type === "promo") {
      const { code, discountPercent, maxSignups, expiryHours } = body;

      if (!code || typeof code !== "string" || code.trim().length < 3 || code.trim().length > 10) {
        return NextResponse.json({ error: "Promo kodu 3-10 karakter olmali" }, { status: 400 });
      }
      if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
        return NextResponse.json({ error: "Indirim %1-%100 arasi olmali" }, { status: 400 });
      }

      // Only allow alphanumeric
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanCode.length < 3) {
        return NextResponse.json({ error: "Promo kodu en az 3 harf/rakam olmali" }, { status: 400 });
      }

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
    }

    // Create coupon
    const { code, discountPercent, maxUses, expiryHours } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Kupon kodu gerekli" }, { status: 400 });
    }

    // Only allow alphanumeric, max 9
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 3 || cleanCode.length > 9) {
      return NextResponse.json({ error: "Kupon kodu 3-9 karakter olmali (harf/rakam)" }, { status: 400 });
    }
    if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json({ error: "Indirim %1-%100 arasi olmali" }, { status: 400 });
    }
    if (maxUses !== null && maxUses !== undefined && maxUses < 1) {
      return NextResponse.json({ error: "Max kullanim en az 1 olmali" }, { status: 400 });
    }

    // Check duplicate
    const { data: existing } = await admin
      .from("coupons")
      .select("id")
      .ilike("code", cleanCode)
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
        code: cleanCode,
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
    if (process.env.NODE_ENV === "development") console.error("Admin coupons POST error:", error);
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

    const { couponId, promoId } = await request.json();

    const admin = createAdminClient();

    if (promoId) {
      // Delete related signups first, then the promo link
      await admin.from("promo_signups").delete().eq("promo_link_id", promoId);
      // Delete coupons generated from this promo
      await admin.from("coupons").delete().eq("promo_link_id", promoId);
      const { error } = await admin.from("promo_links").delete().eq("id", promoId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (couponId) {
      // Delete related usages first, then the coupon
      await admin.from("coupon_usages").delete().eq("coupon_id", couponId);
      const { error } = await admin.from("coupons").delete().eq("id", couponId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin coupons DELETE error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
