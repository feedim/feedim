import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));

    const admin = createAdminClient();
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, count, error } = await admin
      .from("projects")
      .select("id, title, slug, is_published, is_public, view_count, user_id, created_at, updated_at", { count: "exact" })
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) throw error;

    // Fetch creator names for the user_ids
    const userIds = [...new Set((data || []).map((p: any) => p.user_id).filter(Boolean))];
    let creatorMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, name, surname")
        .in("user_id", userIds);
      if (profiles) {
        for (const p of profiles) {
          creatorMap[p.user_id] = [p.name, p.surname].filter(Boolean).join(" ") || "Anonim";
        }
      }
    }

    const projects = (data || []).map((p: any) => ({
      ...p,
      creator_name: creatorMap[p.user_id] || "Anonim",
    }));

    return NextResponse.json({
      projects,
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil((count || 0) / PAGE_SIZE),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin projects error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Admin delete project error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
