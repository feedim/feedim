import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cronAuth";
import { cleanupResolvedSupportRequests } from "@/lib/supportRequests";

async function handle(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const deletedIds = await cleanupResolvedSupportRequests(admin, { olderThanDays: 14 });
    return NextResponse.json({ success: true, deletedCount: deletedIds.length });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
