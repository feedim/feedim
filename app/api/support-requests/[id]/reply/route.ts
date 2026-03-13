import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanupResolvedSupportRequests,
  encodeSupportUserReply,
  finalizeExpiredSupportRequests,
  isSupportAwaitingUserReply,
  isSupportReplyWindowExpired,
  parseSupportStoredMessage,
  parseSupportReviewerNote,
  parseSupportReviewerThread,
  sanitizeSupportMessage,
} from "@/lib/supportRequests";

function parseNumericId(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [tErrors, tSupport, resolvedParams] = await Promise.all([
    getTranslations("apiErrors"),
    getTranslations("support"),
    params,
  ]);

  try {
    const supportError = (key: string, fallback: string) => {
      try {
        return tSupport(key);
      } catch {
        return fallback;
      }
    };

    const requestId = parseNumericId(resolvedParams.id);
    if (!requestId) {
      return NextResponse.json(
        { error: supportError("errors.invalidRequest", "Geçersiz destek talebi") },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    await finalizeExpiredSupportRequests(admin, {
      userId: user.id,
      notificationContent: supportError("notificationFinalized", "Destek talebiniz sonuçlandırıldı"),
    });
    await cleanupResolvedSupportRequests(admin, { userId: user.id, olderThanDays: 14 });

    const body = await request.json();
    const reply = sanitizeSupportMessage(body?.message || "");
    if (reply.length < 10) {
      return NextResponse.json(
        { error: supportError("errors.messageTooShort", "Mesaj en az 10 karakter olmalı") },
        { status: 400 },
      );
    }

    const { data: supportRequest } = await admin
      .from("support_requests")
      .select("id, user_id, status, message, reviewer_note")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!supportRequest) {
      return NextResponse.json(
        { error: supportError("errors.invalidRequest", "Geçersiz destek talebi") },
        { status: 404 },
      );
    }

    const parsedMessage = parseSupportStoredMessage(supportRequest.message);
    const parsedReviewer = parseSupportReviewerNote(supportRequest.reviewer_note);
    const reviewerThread = parseSupportReviewerThread(supportRequest.reviewer_note);
    const requestedReplyCount = reviewerThread.filter((entry) => entry.mode === "await_user").length;

    if (supportRequest.status !== "in_review" || !isSupportAwaitingUserReply(supportRequest.reviewer_note)) {
      return NextResponse.json(
        { error: supportError("errors.replyNotAllowed", "Bu destek talebi için yanıt beklenmiyor") },
        { status: 400 },
      );
    }

    if (isSupportReplyWindowExpired(supportRequest.reviewer_note)) {
      return NextResponse.json(
        { error: supportError("errors.replyWindowExpired", "Yanıt süresi doldu") },
        { status: 400 },
      );
    }

    if (parsedMessage.userReplies.length >= requestedReplyCount) {
      return NextResponse.json(
        { error: supportError("errors.replyAlreadySent", "Bu destek talebine zaten yanıt verdiniz") },
        { status: 400 },
      );
    }

    const nextMessage = encodeSupportUserReply(supportRequest.message, reply);
    const { error } = await admin
      .from("support_requests")
      .update({
        status: "open",
        message: nextMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("status", "in_review");

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      request: {
        id: requestId,
        status: "open",
        reviewerNote: parsedReviewer.message,
      },
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
