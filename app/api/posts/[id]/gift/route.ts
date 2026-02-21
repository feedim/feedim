import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { GIFT_TYPES } from "@/lib/constants";

type GiftKey = keyof typeof GIFT_TYPES;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });

    const body = await request.json();
    const giftType = body.gift_type as GiftKey;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 200) : "";

    if (!giftType || !GIFT_TYPES[giftType]) {
      return NextResponse.json({ error: "Geçersiz hediye türü" }, { status: 400 });
    }

    const giftInfo = GIFT_TYPES[giftType];
    const coinCost = giftInfo.coins;

    if (typeof coinCost !== "number" || coinCost <= 0) {
      return NextResponse.json({ error: "Gecersiz hediye degeri" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get post author
    const { data: post } = await admin
      .from("posts")
      .select("author_id, title")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
    if (post.author_id === user.id) return NextResponse.json({ error: "Kendi gönderinize hediye gönderemezsiniz" }, { status: 400 });

    // Check sender balance
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("coin_balance")
      .eq("user_id", user.id)
      .single();

    if (!senderProfile || (senderProfile.coin_balance || 0) < coinCost) {
      return NextResponse.json({ error: "Yetersiz jeton bakiyesi" }, { status: 400 });
    }

    // Get receiver profile
    const { data: receiverProfile } = await admin
      .from("profiles")
      .select("coin_balance, total_earned, username, full_name")
      .eq("user_id", post.author_id)
      .single();

    if (!receiverProfile) return NextResponse.json({ error: "Alıcı bulunamadı" }, { status: 404 });

    const senderNewBalance = (senderProfile.coin_balance || 0) - coinCost;
    if (senderNewBalance < 0) {
      return NextResponse.json({ error: "Yetersiz jeton bakiyesi" }, { status: 400 });
    }

    // Atomic deduct from sender — only succeeds if balance is still sufficient
    const { data: deductResult, error: deductError } = await admin
      .from("profiles")
      .update({ coin_balance: senderNewBalance })
      .eq("user_id", user.id)
      .gte("coin_balance", coinCost)
      .select("coin_balance")
      .single();

    if (deductError || !deductResult) {
      return NextResponse.json({ error: "Yetersiz jeton bakiyesi" }, { status: 400 });
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

    const actualSenderBalance = deductResult.coin_balance;
    const actualReceiverBalance = typeof receiverNewBalance === "number" ? receiverNewBalance : 0;

    // Log transactions for both parties
    await Promise.all([
      admin.from("coin_transactions").insert({
        user_id: user.id,
        type: "gift_sent",
        amount: -coinCost,
        balance_after: actualSenderBalance,
        related_post_id: postId,
        related_user_id: post.author_id,
        description: `${giftInfo.emoji} ${giftInfo.name} hediye gönderildi`,
      }),
      admin.from("coin_transactions").insert({
        user_id: post.author_id,
        type: "gift_received",
        amount: coinCost,
        balance_after: actualReceiverBalance,
        related_post_id: postId,
        related_user_id: user.id,
        description: `${giftInfo.emoji} ${giftInfo.name} hediye alındı`,
      }),
      // Notification
      createNotification({
        admin,
        user_id: post.author_id,
        actor_id: user.id,
        type: "gift_received",
        object_type: "post",
        object_id: postId,
        content: `${giftInfo.emoji} ${giftInfo.name} hediye gönderdi`,
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
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
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
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
