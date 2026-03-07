import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import { logServerError } from "@/lib/runtimeLogger";

const EXPIRY_DAYS = 14;
const BATCH_LIMIT = 50;

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Find processing withdrawals older than 14 days
  const { data: stale } = await admin
    .from("withdrawal_requests")
    .select("id, user_id, amount")
    .eq("status", "processing")
    .lt("created_at", cutoff)
    .limit(BATCH_LIMIT);

  if (!stale || stale.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  let expired = 0;

  for (const wr of stale) {
    try {
      // Atomically cancel only if still processing
      const { data: cancelled } = await admin
        .from("withdrawal_requests")
        .update({ status: "expired" })
        .eq("id", wr.id)
        .eq("status", "processing")
        .select("id, amount")
        .maybeSingle();

      if (!cancelled) continue;

      // Refund coins
      const { data: newBalance } = await admin.rpc("increment_coin_balance", {
        p_user_id: wr.user_id,
        p_amount: cancelled.amount,
      });

      if (newBalance != null) {
        const { data: userLang } = await admin.from("profiles").select("language").eq("user_id", wr.user_id).single();
        const tW = await getTranslations({ locale: userLang?.language || "en", namespace: "withdrawal" });
        await admin.from("coin_transactions").insert({
          user_id: wr.user_id,
          type: "refund",
          amount: cancelled.amount,
          balance_after: newBalance,
          description: tW("expiredRefundDescription"),
        });
      }

      expired++;
    } catch (err: unknown) {
      logServerError("[withdrawal-expiry] expire failed", err, { operation: "expire_withdrawal" });
    }
  }

  return NextResponse.json({ expired, total: stale.length });
}
