import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { verifyPuzzleToken } from "@/lib/puzzleCaptcha";
import {
  buildSupportNotificationContent,
  cleanupResolvedSupportRequests,
  encodeSupportStoredMessage,
  finalizeExpiredSupportRequests,
  isSupportBugTopicId,
  listOwnedAppealableDecisions,
  normalizeDecisionCode,
  normalizeSupportUrl,
  resolveOwnedModerationDecision,
  sanitizeSupportMessage,
  type SupportRequestKind,
} from "@/lib/supportRequests";

const SUPPORT_KINDS: SupportRequestKind[] = ["moderation_appeal", "bug_report"];

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

function canRetrySupportInsert(error: { message?: string | null; details?: string | null } | null) {
  const errorText = `${error?.message || ""} ${error?.details || ""}`;
  return /column .* does not exist/i.test(errorText)
    || /decision_target_type/i.test(errorText)
    || /decision_target_id/i.test(errorText)
    || /reviewed_at/i.test(errorText)
    || /reviewer_note/i.test(errorText);
}

function sanitizeSupportTopicLabel(input: unknown) {
  return String(input || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function parseSupportRequestId(input: unknown) {
  const numeric = Number(input);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildSupportCreatedNotification(
  translate: (key: string) => string,
  requestId: number,
  _kind: SupportRequestKind,
  _topicLabel?: string | null,
) {
  return buildSupportNotificationContent(
    translate,
    "notificationCreated",
    requestId,
  );
}

async function insertSupportRequest(
  _userClient: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  payload: {
    user_id: string;
    kind: SupportRequestKind;
    decision_code: string | null;
    decision_target_type: string | null;
    decision_target_id: string | null;
    message: string;
    related_url: string | null;
  },
) {
  const extendedPayload = {
    user_id: payload.user_id,
    kind: payload.kind,
    status: "open",
    decision_code: payload.decision_code,
    decision_target_type: payload.decision_target_type,
    decision_target_id: payload.decision_target_id,
    message: payload.message,
    related_url: payload.related_url,
  };
  const fallbackPayload = {
    user_id: payload.user_id,
    kind: payload.kind,
    status: "open",
    decision_code: payload.decision_code,
    message: payload.message,
    related_url: payload.related_url,
  };
  const legacyPayload = {
    user_id: payload.user_id,
    kind: payload.kind,
    decision_code: payload.decision_code,
    message: payload.message,
    related_url: payload.related_url,
  };
  const minimalPayload = {
    user_id: payload.user_id,
    kind: payload.kind,
    decision_code: payload.decision_code,
    message: payload.message,
  };

  let insertError: { code?: string | null; message?: string | null; details?: string | null } | null = null;
  const attempts = [minimalPayload, fallbackPayload, legacyPayload, extendedPayload];

  for (let index = 0; index < attempts.length; index += 1) {
    const candidate = attempts[index];
    const { data, error } = await admin
      .from("support_requests")
      .insert(candidate)
      .select("id, kind, status, decision_code, decision_target_type, message, related_url, reviewer_note, created_at, reviewed_at")
      .single();

    if (!error && data) {
      if (typeof data === "object" && "status" in data) {
        return {
          data: {
            ...data,
            decision_target_type: (data as { decision_target_type?: string | null }).decision_target_type ?? payload.decision_target_type,
            reviewer_note: (data as { reviewer_note?: string | null }).reviewer_note ?? null,
            reviewed_at: (data as { reviewed_at?: string | null }).reviewed_at ?? null,
          },
          error: null,
        };
      }

      return {
        data: {
          id: `temp-${Date.now()}`,
          kind: payload.kind,
          status: "open",
          decision_code: payload.decision_code,
          decision_target_type: payload.decision_target_type,
          message: payload.message,
          related_url: payload.related_url,
          reviewer_note: null,
          created_at: new Date().toISOString(),
          reviewed_at: null,
        },
        error: null,
      };
    }

    insertError = error;
    if (index === 0 && canRetrySupportInsert(error)) {
      continue;
    }
    break;
  }

  return { data: null, error: insertError };
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
      userId: user.id,
      notificationContentBuilder: (requestId) => buildSupportNotificationContent(
        tSupport,
        "notificationFinalized",
        requestId,
      ),
    });
    await cleanupResolvedSupportRequests(admin, { userId: user.id, olderThanDays: 14 });
    const requestedDecisionCode = normalizeDecisionCode(request.nextUrl.searchParams.get("decisionCode") || "");

    const [{ data, error }, availableDecisionList, requestedDecision] = await Promise.all([
      admin
        .from("support_requests")
        .select("id, kind, status, decision_code, decision_target_type, decision_target_id, message, related_url, reviewer_id, reviewer_note, created_at, reviewed_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      listOwnedAppealableDecisions(admin, user.id),
      requestedDecisionCode
        ? resolveOwnedModerationDecision(admin, user.id, requestedDecisionCode)
        : Promise.resolve(null),
    ]);
    const rawRequests = error ? [] : (data || []);

    // Enrich reviewer avatar
    const reviewerIds = [...new Set(rawRequests.filter((r: any) => r.reviewer_id).map((r: any) => r.reviewer_id))];
    let reviewerAvatarMap = new Map<string, string>();
    if (reviewerIds.length > 0) {
      const { data: reviewerProfiles } = await admin
        .from("profiles")
        .select("user_id, avatar_url")
        .in("user_id", reviewerIds);
      for (const rp of (reviewerProfiles || [])) {
        if (rp.avatar_url) reviewerAvatarMap.set(rp.user_id, rp.avatar_url);
      }
    }
    const requests = rawRequests.map((r: any) => ({
      ...r,
      reviewer_avatar_url: r.reviewer_id ? (reviewerAvatarMap.get(r.reviewer_id) || null) : null,
    }));

    const activeRequest = requests.find((item: any) => item.status === "open" || item.status === "in_review") || null;

    const availableDecisions = [...availableDecisionList];
    if (
      requestedDecision &&
      !availableDecisions.some((item) => item.decisionCode === requestedDecision.decisionCode)
    ) {
      const { data: existingAppeal } = await admin
        .from("support_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", "moderation_appeal")
        .eq("decision_code", requestedDecision.decisionCode)
        .limit(1)
        .maybeSingle();

      if (!existingAppeal) {
        availableDecisions.unshift(requestedDecision);
      }
    }

    return NextResponse.json({ requests, availableDecisions, activeRequest });
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

    const body = await request.json();
    const kind = String(body?.kind || "") as SupportRequestKind;
    const message = sanitizeSupportMessage(body?.message || "");
    const rawTopicId = String(body?.topicId || "");
    const topicId = isSupportBugTopicId(rawTopicId) ? rawTopicId : null;
    const topicLabel = sanitizeSupportTopicLabel(body?.topicLabel);
    const decisionCode = normalizeDecisionCode(body?.decisionCode || "");
    const relatedUrl = normalizeSupportUrl(body?.relatedUrl);
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";

    const supportErrors = {
      invalidType: safeSupportMessage(tSupport, "errors.invalidType", "Geçersiz destek türü"),
      messageTooShort: safeSupportMessage(tSupport, "errors.messageTooShort", "Mesaj en az 10 karakter olmalı"),
      invalidUrl: safeSupportMessage(tSupport, "errors.invalidUrl", "Geçerli bir bağlantı girin"),
      decisionCodeRequired: safeSupportMessage(
        tSupport,
        "errors.decisionCodeRequired",
        "Karar numarası seçin",
      ),
      invalidDecisionCode: safeSupportMessage(
        tSupport,
        "errors.invalidDecisionCode",
        "Bu karar numarası hesabınıza ait değil veya itiraz edilemez durumda",
      ),
      appealAlreadyExists: safeSupportMessage(
        tSupport,
        "errors.appealAlreadyExists",
        "Bu karar için zaten bir itiraz talebi oluşturulmuş",
      ),
      activeRequestExists: safeSupportMessage(
        tSupport,
        "errors.activeRequestExists",
        "İşlemde olan destek talebiniz var",
      ),
    };

    if (!SUPPORT_KINDS.includes(kind)) {
      return NextResponse.json({ error: supportErrors.invalidType }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!captchaToken || !(await verifyPuzzleToken(captchaToken, ip))) {
      return NextResponse.json({ error: tErrors("captchaFailed") }, { status: 403 });
    }

    if (message.length < 10) {
      return NextResponse.json({ error: supportErrors.messageTooShort }, { status: 400 });
    }

    if ((body?.relatedUrl || "").trim() && !relatedUrl) {
      return NextResponse.json({ error: supportErrors.invalidUrl }, { status: 400 });
    }

    const admin = createAdminClient();
    await finalizeExpiredSupportRequests(admin, {
      userId: user.id,
      notificationContentBuilder: (requestId) => buildSupportNotificationContent(
        tSupport,
        "notificationFinalized",
        requestId,
      ),
    });
    await cleanupResolvedSupportRequests(admin, { userId: user.id, olderThanDays: 14 });
    const { data: activeRequest } = await admin
      .from("support_requests")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["open", "in_review"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRequest) {
      return NextResponse.json(
        { error: supportErrors.activeRequestExists, activeRequest },
        { status: 409 },
      );
    }

    let decisionTargetType: string | null = null;
    let decisionTargetId: string | null = null;

    if (kind === "moderation_appeal") {
      if (!decisionCode) {
        return NextResponse.json({ error: supportErrors.decisionCodeRequired }, { status: 400 });
      }

      const ownedDecision = await resolveOwnedModerationDecision(admin, user.id, decisionCode);
      if (!ownedDecision) {
        return NextResponse.json({ error: supportErrors.invalidDecisionCode }, { status: 400 });
      }

      const { data: existingAppeal } = await admin
        .from("support_requests")
        .select("id")
        .eq("kind", "moderation_appeal")
        .eq("decision_code", ownedDecision.decisionCode)
        .limit(1)
        .maybeSingle();

      if (existingAppeal) {
        return NextResponse.json({ error: supportErrors.appealAlreadyExists }, { status: 400 });
      }

      decisionTargetType = ownedDecision.targetType;
      decisionTargetId = ownedDecision.targetId;
    }

    const storedMessage = kind === "bug_report"
      ? encodeSupportStoredMessage({
        topicId,
        topicLabel: topicLabel || null,
        message,
      })
      : message;

    const { data, error } = await insertSupportRequest(supabase, admin, {
      user_id: user.id,
      kind,
      decision_code: kind === "moderation_appeal" ? decisionCode : null,
      decision_target_type: decisionTargetType,
      decision_target_id: decisionTargetId,
      message: storedMessage,
      related_url: kind === "moderation_appeal" ? null : relatedUrl,
    });

    if (error) {
      const duplicateAppeal = error.code === "23505";
      console.error("support_requests_insert_failed", error);
      return NextResponse.json(
        { error: duplicateAppeal ? supportErrors.appealAlreadyExists : "server_error" },
        { status: duplicateAppeal ? 400 : 500 },
      );
    }

    const supportRequestId = parseSupportRequestId(data?.id);
    if (supportRequestId) {
      try {
        await createNotification({
          admin,
          user_id: user.id,
          actor_id: user.id,
          type: "system",
          object_type: "support_request",
          object_id: supportRequestId,
          content: buildSupportCreatedNotification(tSupport, supportRequestId, kind, topicLabel),
        });
      } catch (notificationError) {
        console.error("support_requests_created_notification_failed", notificationError);
      }
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error) {
    console.error("support_requests_post_failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
