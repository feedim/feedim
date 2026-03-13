import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import {
  canAccessModerationArea,
  getModeratorAccess,
  getModeratorCountryFilter,
} from "@/lib/moderationAdmin";
import { appendSupportSignature } from "@/lib/supportReplyPresets";
import {
  buildSupportNotificationContent,
  appendSupportReviewerNote,
  cleanupResolvedSupportRequests,
  finalizeExpiredSupportRequests,
  parseSupportStoredMessage,
  sanitizeSupportMessage,
} from "@/lib/supportRequests";

function safeSupportMessage(
  translate: (key: string) => string,
  key: string,
  fallback: string,
) {
  try {
    const value = translate(key);
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const [tErrors, tSupport] = await Promise.all([
    getTranslations("apiErrors"),
    getTranslations("support"),
  ]);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    await finalizeExpiredSupportRequests(admin, {
      notificationContentBuilder: (requestId) => buildSupportNotificationContent(
        tSupport,
        "notificationFinalized",
        requestId,
      ),
    });
    await cleanupResolvedSupportRequests(admin, { olderThanDays: 14 });
    const moderator = await getModeratorAccess(admin, user.id);
    if (!moderator || !canAccessModerationArea(moderator, "review")) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }

    const countryFilter = getModeratorCountryFilter(moderator);
    const rawPage = Number(request.nextUrl.searchParams.get("page") || "1");
    const page = Math.max(1, Math.min(Number.isNaN(rawPage) ? 1 : rawPage, 500));
    const limit = 10;
    const offset = (page - 1) * limit;
    const status = request.nextUrl.searchParams.get("status") || "active";
    const kind = request.nextUrl.searchParams.get("kind");

    let query = admin
      .from("support_requests")
      .select(
        `
          id, kind, status, decision_code, decision_target_type, decision_target_id, message, related_url, reviewer_note, reviewer_id, created_at, reviewed_at,
          requester:profiles!support_requests_user_id_fkey${countryFilter ? "!inner" : ""}(user_id, username, full_name, avatar_url, language, country)
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (status === "active") {
      query = query.in("status", ["open", "in_review"]);
    } else if (status !== "all") {
      query = query.eq("status", status);
    }

    if (kind === "moderation_appeal" || kind === "bug_report") {
      query = query.eq("kind", kind);
    }

    if (countryFilter) {
      query = query.eq("requester.country", countryFilter);
    }

    if (status === "active") {
      query = query.or(`reviewer_id.is.null,reviewer_id.eq.${user.id}`);
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      requests: data || [],
      total: count || 0,
      page,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const [tErrors, tSupport] = await Promise.all([
    getTranslations("apiErrors"),
    getTranslations("support"),
  ]);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    const moderator = await getModeratorAccess(admin, user.id);
    if (!moderator || !canAccessModerationArea(moderator, "review")) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }

    const body = await request.json();
    const requestId = Number(body?.request_id);
    const action = String(body?.action || "");
    const reviewerNote = sanitizeSupportMessage(body?.reviewer_note || "");

    if (!requestId || Number.isNaN(requestId)) {
      return NextResponse.json({
        error: safeSupportMessage(tSupport, "errors.invalidRequest", "Geçersiz destek talebi"),
      }, { status: 400 });
    }

    if (action === "claim") {
      const { count: activeAssignmentsCount, error: assignmentCountError } = await admin
        .from("support_requests")
        .select("id", { count: "exact", head: true })
        .eq("reviewer_id", user.id)
        .in("status", ["open", "in_review"]);

      if (assignmentCountError) {
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }

      if ((activeAssignmentsCount || 0) >= 10) {
        return NextResponse.json({
          error: safeSupportMessage(
            tSupport,
            "errors.assignmentLimitReached",
            "En fazla 10 aktif destek talebi devir alabilirsiniz",
          ),
        }, { status: 400 });
      }

      const { data: existingRequest } = await admin
        .from("support_requests")
        .select("id, reviewer_id, status")
        .eq("id", requestId)
        .maybeSingle();

      if (!existingRequest) {
        return NextResponse.json({
          error: safeSupportMessage(tSupport, "errors.invalidRequest", "Geçersiz destek talebi"),
        }, { status: 400 });
      }

      if (existingRequest.status === "resolved" || existingRequest.status === "rejected") {
        return NextResponse.json({
          error: safeSupportMessage(
            tSupport,
            "errors.finalizedRequest",
            "Bu destek talebi zaten sonuçlandırılmış",
          ),
        }, { status: 400 });
      }

      if (existingRequest.reviewer_id && existingRequest.reviewer_id !== user.id) {
        return NextResponse.json({
          error: safeSupportMessage(
            tSupport,
            "errors.alreadyAssigned",
            "Bu destek talebi başka bir moderatör tarafından devralınmış",
          ),
        }, { status: 400 });
      }

      if (existingRequest.reviewer_id === user.id) {
        return NextResponse.json({ success: true, claimed: true });
      }

      const { error } = await admin
        .from("support_requests")
        .update({
          reviewer_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .is("reviewer_id", null);

      if (error) {
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }

      return NextResponse.json({ success: true, claimed: true });
    }

    let nextStatus: "resolved" | "in_review";
    if (action === "resolve") nextStatus = "resolved";
    else if (action === "await_user") nextStatus = "in_review";
    else {
      return NextResponse.json({
        error: safeSupportMessage(tSupport, "errors.invalidAction", "Geçersiz işlem"),
      }, { status: 400 });
    }

    await finalizeExpiredSupportRequests(admin, {
      notificationContentBuilder: (requestId) => buildSupportNotificationContent(
        tSupport,
        "notificationFinalized",
        requestId,
      ),
    });
    await cleanupResolvedSupportRequests(admin, { olderThanDays: 14 });

    const { data: existingRequest } = await admin
      .from("support_requests")
      .select(`
        id, user_id, status, message, reviewer_id, reviewer_note,
        requester:profiles!support_requests_user_id_fkey(username, language)
      `)
      .eq("id", requestId)
      .maybeSingle();

    if (!existingRequest) {
      return NextResponse.json({
        error: safeSupportMessage(tSupport, "errors.invalidRequest", "Geçersiz destek talebi"),
      }, { status: 400 });
    }

    if (existingRequest.status === "resolved" || existingRequest.status === "rejected") {
      return NextResponse.json({
        error: safeSupportMessage(
          tSupport,
          "errors.finalizedRequest",
          "Bu destek talebi zaten sonuçlandırılmış",
        ),
      }, { status: 400 });
    }

    if (existingRequest.reviewer_id && existingRequest.reviewer_id !== user.id) {
      return NextResponse.json({
        error: safeSupportMessage(
          tSupport,
          "errors.alreadyAssigned",
          "Bu destek talebi başka bir moderatör tarafından devralınmış",
        ),
      }, { status: 400 });
    }

    if (!reviewerNote) {
      return NextResponse.json({
        error: safeSupportMessage(
          tSupport,
          "errors.reviewerNoteRequired",
          "Yanıt verirken bir açıklama yazın",
        ),
      }, { status: 400 });
    }

    const parsedSupportMessage = parseSupportStoredMessage(existingRequest.message);
    const requester = Array.isArray(existingRequest.requester)
      ? existingRequest.requester[0]
      : existingRequest.requester;
    const reviewerMessage = appendSupportSignature(reviewerNote, requester?.language);
    const payload: Record<string, string | null> = {
      status: nextStatus,
      reviewer_id: user.id,
      updated_at: new Date().toISOString(),
    };

    if (nextStatus === "in_review") {
      const deadlineAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      payload.reviewer_note = appendSupportReviewerNote(existingRequest.reviewer_note, {
        mode: "await_user",
        deadlineAt,
        message: reviewerMessage,
        createdAt: new Date().toISOString(),
      });
      payload.reviewed_at = new Date().toISOString();
    } else {
      payload.reviewer_note = appendSupportReviewerNote(existingRequest.reviewer_note, {
        mode: "final",
        message: reviewerMessage,
        createdAt: new Date().toISOString(),
      });
      payload.reviewed_at = new Date().toISOString();
    }

    const { error } = await admin
      .from("support_requests")
      .update(payload)
      .eq("id", requestId);

    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (nextStatus === "in_review") {
      const notificationContent = safeSupportMessage(
        tSupport,
        "notificationAwaitingReply",
        "Destek talebiniz için yanıtınız bekleniyor",
      );
      await createNotification({
        admin,
        user_id: existingRequest.user_id,
        actor_id: existingRequest.user_id,
        type: "system",
        object_type: "support_request",
        object_id: requestId,
        content: buildSupportNotificationContent(tSupport, "notificationAwaitingReply", requestId),
      });
    }

    if (nextStatus === "resolved") {
      await createNotification({
        admin,
        user_id: existingRequest.user_id,
        actor_id: existingRequest.user_id,
        type: "system",
        object_type: "support_request",
        object_id: requestId,
        content: buildSupportNotificationContent(
          tSupport,
          parsedSupportMessage.userReply ? "notificationAnswered" : "notificationResolved",
          requestId,
        ),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
