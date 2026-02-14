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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get all payouts with affiliate info
    const { data: payouts, error } = await admin
      .from("affiliate_payouts")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) throw error;

    // Enrich with affiliate details
    const enriched = await Promise.all(
      (payouts || []).map(async (payout) => {
        const { data: profile } = await admin
          .from("profiles")
          .select("name, surname, affiliate_iban, affiliate_holder_name")
          .eq("user_id", payout.affiliate_user_id)
          .single();

        // Get email
        const { data: authUser } = await admin.auth.admin.getUserById(payout.affiliate_user_id);

        return {
          ...payout,
          affiliate_name: profile ? `${profile.name || ""} ${profile.surname || ""}`.trim() : "—",
          affiliate_email: authUser?.user?.email || "—",
          affiliate_iban: profile?.affiliate_iban || null,
          affiliate_holder_name: profile?.affiliate_holder_name || null,
        };
      })
    );

    // Summary
    const pending = enriched.filter(p => p.status === "pending");
    const approved = enriched.filter(p => p.status === "approved");
    const rejected = enriched.filter(p => p.status === "rejected");

    return NextResponse.json({
      payouts: enriched,
      summary: {
        pendingCount: pending.length,
        pendingTotal: pending.reduce((sum, p) => sum + Number(p.amount), 0),
        approvedCount: approved.length,
        approvedTotal: approved.reduce((sum, p) => sum + Number(p.amount), 0),
        rejectedCount: rejected.length,
      },
    });
  } catch (error) {
    console.error("Admin affiliate payouts GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { payoutId, action, adminNote } = await request.json();

    if (!payoutId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify payout exists and is pending
    const { data: payout } = await admin
      .from("affiliate_payouts")
      .select("*")
      .eq("id", payoutId)
      .eq("status", "pending")
      .single();

    if (!payout) {
      return NextResponse.json({ error: "Ödeme talebi bulunamadı veya zaten işlenmiş" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error } = await admin
      .from("affiliate_payouts")
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_note: adminNote || null,
      })
      .eq("id", payoutId);

    if (error) throw error;

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Admin affiliate payouts PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
