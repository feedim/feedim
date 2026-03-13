import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { CircleAlert } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import LazyAvatar from "@/components/LazyAvatar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeId } from "@/lib/hashId";
import {
  cleanupResolvedSupportRequests,
  finalizeExpiredSupportRequests,
  isSupportReplyWindowExpired,
  parseSupportReviewerNote,
  parseSupportReviewerThread,
  parseSupportStoredMessage,
} from "@/lib/supportRequests";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";
import { formatRelativeDate } from "@/lib/utils";
import SupportReplyForm from "./SupportReplyForm";

function getNestedString(
  source: Record<string, unknown>,
  path: string,
  fallback: string,
) {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);

  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function toSupportMarkup(text: string) {
  return {
    __html: renderMentionsAsHTML(text, 8).replace(/\n/g, "<br />"),
  };
}

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, locale, messages] = await Promise.all([
    params,
    getLocale(),
    getMessages(),
  ]);

  const support = ((messages as Record<string, unknown>).support as Record<string, unknown> | undefined) || {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/support/${id}`);
  }

  const requestId = /^\d+$/.test(id) ? Number(id) : decodeId(id);
  if (!requestId || Number.isNaN(requestId)) {
    notFound();
  }

  const admin = createAdminClient();
  await finalizeExpiredSupportRequests(admin, {
    userId: user.id,
    notificationContent: getNestedString(
      support,
      "notificationFinalized",
      "Destek talebiniz sonuçlandırıldı",
    ),
  });
  await cleanupResolvedSupportRequests(admin, { userId: user.id, olderThanDays: 14 });

  const { data: request } = await supabase
    .from("support_requests")
    .select("id, kind, status, decision_code, message, related_url, reviewer_id, reviewer_note, created_at, reviewed_at")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!request) {
    notFound();
  }

  const parsedMessage = parseSupportStoredMessage(request.message);
  const parsedReviewer = parseSupportReviewerNote(request.reviewer_note);
  const reviewerThread = parseSupportReviewerThread(request.reviewer_note);
  const awaitingUserReply = request.status === "in_review" && parsedReviewer.mode === "await_user";
  const replyWindowExpired = isSupportReplyWindowExpired(request.reviewer_note);
  const requestedReplyCount = reviewerThread.filter((entry) => entry.mode === "await_user").length;

  const profileIds = [user.id, request.reviewer_id].filter((value): value is string => Boolean(value));
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", profileIds)
    : { data: [] as Array<{ user_id: string; username: string | null; avatar_url: string | null }> };

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.user_id, profile] as const),
  );
  const userProfile = profileMap.get(user.id);
  const reviewerProfile = request.reviewer_id ? profileMap.get(request.reviewer_id) : null;

  const title = getNestedString(support, "detailTitle", "Destek Talebi");
  const requestTitle = getNestedString(support, "requestTitle", "Talebiniz");
  const responseTitle = getNestedString(support, "responseTitle", "Yanıt");
  const waitingResponse = getNestedString(
    support,
    "waitingResponse",
    "Destek talebiniz inceleniyor. Yanıt verildiğinde bildirim alacaksınız.",
  );
  const replyNotice = getNestedString(
    support,
    "replyAwaitingUser",
    "Help Center sizden ek bilgi bekliyor. 48 saat içinde yanıt verebilirsiniz.",
  );
  const replySent = getNestedString(
    support,
    "replySent",
    "Yanıtınız iletildi. Help Center incelemeyi sürdürüyor.",
  );
  const awaitingSupportReply = getNestedString(
    support,
    "awaitingSupportReply",
    "Destek yanıtı beklenirken mesaj gönderemezsiniz.",
  );
  const finalizedNotice = getNestedString(
    support,
    "finalizedNotice",
    "Bu destek talebi sonlandırıldı.",
  );
  const replyExpired = getNestedString(
    support,
    "replyWindowExpired",
    "Yanıt süresi doldu. Gerekirse yeni bir destek talebi açabilirsiniz.",
  );
  const userReplyTitle = getNestedString(support, "replyTitle", "Yanıtınız");
  const decisionLabel = getNestedString(support, "decisionLabel", "Karar No");
  const relatedUrlView = getNestedString(support, "relatedUrlView", "Bağlantıyı aç");
  const sentPlaceholder = getNestedString(
    support,
    "replySentShort",
    "Yanıtınız iletildi. İnceleme sürüyor.",
  );
  const awaitingSupportPlaceholder = getNestedString(
    support,
    "awaitingSupportReplyShort",
    "Help Center yanıtı bekleniyor.",
  );
  const replyExpiredPlaceholder = getNestedString(
    support,
    "replyWindowExpiredShort",
    "Yanıt süresi doldu.",
  );
  const finalizedPlaceholder = getNestedString(
    support,
    "finalizedNoticeShort",
    "Destek talebi sonlandırıldı.",
  );
  const kindLabels = {
    moderation_appeal: getNestedString(support, "types.moderation_appeal.label", "Moderatör kararı itirazı"),
    bug_report: getNestedString(support, "types.bug_report.label", "Bir sorun yaşıyorum"),
    other: getNestedString(support, "types.other.label", "Diğer"),
  } as const;
  const canReplyNow = awaitingUserReply && parsedMessage.userReplies.length < requestedReplyCount && !replyWindowExpired;
  let replyCursor = 0;

  const renderReviewerBubble = (createdAt: string | null, message: string, key: string) => (
    <div className="flex" key={key}>
      <div className="w-full flex items-end gap-2.5">
        <div className="shrink-0 flex">
          {reviewerProfile?.avatar_url ? (
            <LazyAvatar
              src={reviewerProfile.avatar_url}
              alt={reviewerProfile.username || ""}
              sizeClass="h-9 w-9 sm:h-10 sm:w-10"
            />
          ) : (
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-bg-secondary flex items-center justify-center">
              <CircleAlert className="h-4 w-4 text-text-muted" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 rounded-[20px] rounded-tr-[3px] rounded-bl-[3px] bg-bg-secondary px-[18px] py-3.5 sm:px-5 sm:py-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-text-muted">
              {responseTitle}
            </div>
            {createdAt ? (
              <div className="shrink-0 text-[0.66rem] font-medium text-text-muted">
                {formatRelativeDate(createdAt, locale)}
              </div>
            ) : null}
          </div>
          <div
            className="text-[0.82rem] leading-[1.6] break-words text-text-readable"
            dangerouslySetInnerHTML={toSupportMarkup(message)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout headerTitle={title} hideRightSidebar>
      <div className="px-4 py-3">
        <div className="mx-auto max-w-[720px] space-y-4">
          <div className="flex justify-end">
            <div className="w-full flex items-end gap-2.5 md:justify-end">
              <div className="order-2 shrink-0">
                <LazyAvatar
                  src={userProfile?.avatar_url}
                  alt={userProfile?.username || ""}
                  sizeClass="h-9 w-9 sm:h-10 sm:w-10"
                />
              </div>
              <div className="order-1 min-w-0 flex-1 rounded-[20px] rounded-tl-[3px] rounded-br-[3px] bg-bg-secondary px-[18px] py-3.5 sm:px-5 sm:py-4 space-y-3">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 text-[0.82rem] font-semibold text-text-primary">
                    {userProfile?.username ? `@${userProfile.username}` : (kindLabels[request.kind as keyof typeof kindLabels] || kindLabels.other)}
                  </div>
                  <div className="shrink-0 text-[0.66rem] font-medium text-text-muted">
                    {formatRelativeDate(request.created_at, locale)}
                  </div>
                </div>

                {request.decision_code && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-[11px] bg-bg-tertiary px-3 py-2 text-[0.75rem]">
                      <span className="text-text-muted">{decisionLabel}:</span>{" "}
                      <span className="font-mono font-semibold">#{request.decision_code}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-text-muted">{requestTitle}</div>
                  <div
                    className="text-[0.82rem] leading-[1.6] break-words text-text-readable"
                    dangerouslySetInnerHTML={toSupportMarkup(parsedMessage.message)}
                  />
                  {parsedMessage.topicLabel ? (
                    <div className="inline-flex rounded-[4px] bg-accent-main/14 px-[9px] py-[1px] text-[0.66rem] font-medium text-accent-main">
                      {parsedMessage.topicLabel}
                    </div>
                  ) : null}
                </div>

                {request.related_url && (
                  <Link
                    href={request.related_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-[0.76rem] font-medium text-accent-main hover:underline"
                  >
                    {relatedUrlView}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {reviewerThread.length > 0 ? (
            reviewerThread.flatMap((entry, index) => {
              const nodes = [
                renderReviewerBubble(entry.createdAt || request.reviewed_at, entry.message, `reviewer-${index}`),
              ];
              const userReply = entry.mode === "await_user"
                ? (parsedMessage.userReplies[replyCursor] || null)
                : null;
              if (userReply) {
                nodes.push(
                  <div className="flex justify-end" key={`user-reply-${index}`}>
                    <div className="w-full flex items-end gap-2.5 md:justify-end">
                      <div className="order-2 shrink-0">
                        <LazyAvatar
                          src={userProfile?.avatar_url}
                          alt={userProfile?.username || ""}
                          sizeClass="h-9 w-9 sm:h-10 sm:w-10"
                        />
                      </div>
                      <div className="order-1 min-w-0 flex-1 rounded-[20px] rounded-tl-[3px] rounded-br-[3px] bg-bg-secondary px-[18px] py-3.5 sm:px-5 sm:py-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-text-muted">
                            {userReplyTitle}
                          </div>
                          {userReply.createdAt ? (
                            <div className="shrink-0 text-[0.66rem] font-medium text-text-muted">
                              {formatRelativeDate(userReply.createdAt, locale)}
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="text-[0.82rem] leading-[1.6] break-words text-text-readable"
                          dangerouslySetInnerHTML={toSupportMarkup(userReply.message)}
                        />
                      </div>
                    </div>
                  </div>,
                );
              }
              if (entry.mode === "await_user") {
                replyCursor += 1;
              }
              return nodes;
            })
          ) : !parsedMessage.userReplies.length ? (
                <div className="rounded-[12px] bg-bg-tertiary px-3 py-2.5 text-[0.78rem] font-medium leading-[1.55] text-text-muted">
                  {waitingResponse}
                </div>
              ) : null}

          <div className="space-y-3">
            {canReplyNow ? (
              <div className="rounded-[12px] bg-bg-tertiary px-3 py-2.5 text-[0.78rem] font-medium leading-[1.55] text-text-muted">
                {replyNotice}
              </div>
            ) : null}
            <SupportReplyForm
              requestId={request.id}
              avatarUrl={userProfile?.avatar_url}
              disabled={!canReplyNow}
              disabledPlaceholder={
                awaitingUserReply && replyWindowExpired
                  ? replyExpiredPlaceholder
                  : request.status === "resolved" || request.status === "rejected"
                    ? finalizedPlaceholder
                    : parsedMessage.userReplies.length > 0 && request.status === "open"
                      ? sentPlaceholder
                      : awaitingSupportPlaceholder
              }
              labels={{
                replyPlaceholder: getNestedString(support, "replyPlaceholder", "Yanıtınızı yazın..."),
                replySubmit: getNestedString(support, "replySubmit", "Yanıtı gönder"),
                replySubmitting: getNestedString(support, "replySubmitting", "Gönderiliyor..."),
                tryAgainLater: getNestedString(support, "tryAgainLater", "Lütfen daha sonra tekrar deneyin"),
              }}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
