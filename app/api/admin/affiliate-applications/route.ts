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

  if (!profile || profile.role !== "admin") return null;
  return user;
}

// GET: List all applications (paginated)
export async function GET() {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: applications, error } = await admin
      .from("affiliate_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const all = applications || [];
    const pending = all.filter(a => a.status === "pending");
    const approved = all.filter(a => a.status === "approved");
    const rejected = all.filter(a => a.status === "rejected");

    return NextResponse.json({
      applications: all,
      summary: {
        pendingCount: pending.length,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        totalCount: all.length,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin affiliate applications GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT: Approve or reject application
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await verifyAdmin(supabase);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, action } = body;

    if (!applicationId || typeof applicationId !== "string") {
      return NextResponse.json({ error: "Geçersiz başvuru ID" }, { status: 400 });
    }
    // UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId)) {
      return NextResponse.json({ error: "Geçersiz başvuru ID formatı" }, { status: 400 });
    }
    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify application exists and is pending
    const { data: application } = await admin
      .from("affiliate_applications")
      .select("*")
      .eq("id", applicationId)
      .eq("status", "pending")
      .single();

    if (!application) {
      return NextResponse.json({ error: "Başvuru bulunamadı veya zaten işlenmiş" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update application status (idempotent — only if still pending)
    const { error: updateError } = await admin
      .from("affiliate_applications")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("status", "pending");

    if (updateError) throw updateError;

    // If approved, update user role to affiliate
    if (action === "approve") {
      const { error: roleError } = await admin
        .from("profiles")
        .update({ role: "affiliate" })
        .eq("user_id", application.user_id);

      if (roleError) {
        if (process.env.NODE_ENV === "development") console.error("Role update error:", roleError);
        // Rollback application status
        await admin
          .from("affiliate_applications")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", applicationId);
        return NextResponse.json({ error: "Rol güncellenemedi" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin affiliate applications PUT error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
