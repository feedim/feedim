import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { GIFT_TYPES } from "@/lib/constants";
import { checkEmailVerified } from "@/lib/emailGate";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";

type GiftKey = keyof typeof GIFT_TYPES;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const supabase = await createClient();
    const tErrors = await getTranslations("apiErrors");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);

    // Burst rate limit — max 5 gifts per minute
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count: recentGifts } = await admin
      .from("gifts")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", oneMinuteAgo);
    if (!isAdminUser && recentGifts && recentGifts >= 5) {
      return NextResponse.json({ error: tErrors("tooFastAction") }, { status: 429 });
    }

    // Email verification gate
    const emailCheck = await checkEmailVerified(admin, user.id, "gift");
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const giftType = body.gift_type as GiftKey;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 200) : "";

    if (!giftType || !GIFT_TYPES[giftType]) {
      return NextResponse.json({ error: tErrors("invalidGiftType") }, { status: 400 });
    }

    const giftInfo = GIFT_TYPES[giftType];
    const coinCost = giftInfo.coins;

    if (typeof coinCost !== "number" || coinCost <= 0) {
      return NextResponse.json({ error: tErrors("invalidGiftValue") }, { status: 400 });
    }

    // Get post author + private account check
    const { data: post } = await admin
      .from("posts")
      .select("author_id, title, content_type, profiles!posts_author_id_fkey(account_private)")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });

    // Gifts are only allowed for posts and videos
    if (post.content_type === "note" || post.content_type === "moment") {
      return NextResponse.json({ error: tErrors("giftNotAllowed") }, { status: 400 });
    }
    if (post.author_id === user.id) return NextResponse.json({ error: tErrors("cannotGiftSelf") }, { status: 400 });
    const _a = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    if ((_a as any)?.account_private) {
      const { data: _f } = await admin.from('follows').select('id')
        .eq('follower_id', user.id).eq('following_id', post.author_id).maybeSingle();
      if (!_f) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });
    }

    // Check sender balance
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("coin_balance")
      .eq("user_id", user.id)
      .single();

    if (!senderProfile || (senderProfile.coin_balance || 0) < coinCost) {
      return NextResponse.json({ error: tErrors("insufficientBalance") }, { status: 400 });
    }

    // Get receiver profile
    const { data: receiverProfile } = await admin
      .from("profiles")
      .select("coin_balance, total_earned, username, full_name")
      .eq("user_id", post.author_id)
      .single();

    if (!receiverProfile) return NextResponse.json({ error: tErrors("recipientNotFound") }, { status: 404 });

    // Atomic deduct from sender via RPC
    const { data: senderNewBalance, error: deductError } = await admin.rpc("increment_coin_balance", {
      p_user_id: user.id,
      p_amount: -coinCost,
    });

    if (deductError || senderNewBalance == null) {
      return NextResponse.json({ error: tErrors("insufficientBalance") }, { status: 400 });
    }

    // Safety: if RPC allowed negative balance, reverse and reject
    if (senderNewBalance < 0) {
      await admin.rpc("increment_coin_balance", {
        p_user_id: user.id,
        p_amount: coinCost,
      });
      return NextResponse.json({ error: tErrors("insufficientBalance") }, { status: 400 });
    }

    // Atomic increment receiver balance via RPC (race-safe)
    const { data: receiverNewBalance } = await admin.rpc("increment_coin_balance", {
      p_user_id: post.author_id,
      p_amount: coinCost,
    });

    // Insert gift record
    const { data: giftResult } = await admin.from("gifts").insert({
      sender_id: user.id,
      receiver_id: post.author_id,
      post_id: postId,
      gift_type: giftType,
      coin_amount: coinCost,
      message: message || null,
    }).select("id").single();

    const actualSenderBalance = senderNewBalance;
    const actualReceiverBalance = typeof receiverNewBalance === "number" ? receiverNewBalance : 0;

    // Log transactions for both parties
    const tNotif = await getTranslations("notifications");
    const { data: receiverLang } = await admin.from("profiles").select("language").eq("user_id", post.author_id).single();
    const tRecipient = await getTranslations({ locale: receiverLang?.language || "en", namespace: "notifications" });
    await Promise.all([
      admin.from("coin_transactions").insert({
        user_id: user.id,
        type: "gift_sent",
        amount: -coinCost,
        balance_after: actualSenderBalance,
        related_post_id: postId,
        related_user_id: post.author_id,
        description: tNotif("giftSentDescription", { emoji: giftInfo.emoji, name: giftInfo.name }),
      }),
      admin.from("coin_transactions").insert({
        user_id: post.author_id,
        type: "gift_received",
        amount: coinCost,
        balance_after: actualReceiverBalance,
        related_post_id: postId,
        related_user_id: user.id,
        description: tRecipient("giftReceivedContent", { emoji: giftInfo.emoji, name: giftInfo.name }),
      }),
      // Notification
      createNotification({
        admin,
        user_id: post.author_id,
        actor_id: user.id,
        type: "gift_received",
        object_type: "post",
        object_id: postId,
        content: tRecipient("giftReceivedContent", { emoji: giftInfo.emoji, name: giftInfo.name }),
      }),
    ]);

    return NextResponse.json({
      success: true,
      gift_id: giftResult?.id,
      sender_balance: actualSenderBalance,
      gift_emoji: giftInfo.emoji,
      gift_name: giftInfo.name,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// GET: get gift count and recent gifts for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const [{ count: totalGifts }, { data: recentGifts }] = await Promise.all([
      admin.from("gifts").select("id", { count: "exact", head: true }).eq("post_id", id),
      admin.from("gifts")
        .select("gift_type, coin_amount, created_at, profiles!gifts_sender_id_fkey(username, full_name, avatar_url)")
        .eq("post_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      totalGifts: totalGifts || 0,
      recentGifts: (recentGifts || []).map(g => ({
        gift_type: g.gift_type,
        coin_amount: g.coin_amount,
        created_at: g.created_at,
        sender: (g as any).profiles,
      })),
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
