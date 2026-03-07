import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteFromR2 } from "@/lib/r2";

const BATCH_LIMIT = 200;
const ORPHAN_AGE_HOURS = 24;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - ORPHAN_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: orphans, error } = await admin
    .from("file_identifiers")
    .select("id, storage_key")
    .is("post_id", null)
    .lt("created_at", cutoff)
    .limit(BATCH_LIMIT);

  if (error || !orphans || orphans.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  let deleted = 0;
  for (const orphan of orphans) {
    try {
      if (orphan.storage_key) {
        await deleteFromR2(orphan.storage_key);
      }
      await admin.from("file_identifiers").delete().eq("id", orphan.id);
      deleted++;
    } catch {}
  }

  return NextResponse.json({ deleted });
}
