import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cron: Delete accounts that have been in 'deleted' status for 14+ days
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Find accounts deleted 14+ days ago
  const { data: accounts } = await admin
    .from("profiles")
    .select("user_id, username")
    .eq("status", "deleted")
    .lt("updated_at", fourteenDaysAgo)
    .limit(50);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: "No accounts to clean up", count: 0 });
  }

  let deletedCount = 0;
  for (const account of accounts) {
    try {
      // Delete from auth.users (cascades to profiles via FK)
      await admin.auth.admin.deleteUser(account.user_id);
      deletedCount++;
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error(`Failed to delete user ${account.user_id}:`, err);
    }
  }

  return NextResponse.json({ message: `Cleaned up ${deletedCount} accounts`, count: deletedCount });
}
