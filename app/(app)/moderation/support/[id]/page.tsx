import { CircleAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import LazyAvatar from "@/components/LazyAvatar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeId } from "@/lib/hashId";
import {
  canAccessModerationArea,
  getModeratorAccess,
  getModeratorCountryFilter,
} from "@/lib/moderationAdmin";
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
import { getSupportReplyPresets } from "@/lib/supportReplyPresets";
import { COUNTRIES } from "@/lib/countries";
import ModerationSupportActionPanel from "./ModerationSupportActionPanel";

const COUNTRY_NAME = Object.fromEntries(
  COUNTRIES.map((country) => [country.code, { tr: country.name_tr, en: country.name_en, az: country.name_az }]),
);

function getCountryName(code?: string | null, lang?: string | null): string | null {
  if (!code) return null;
  const entry = COUNTRY_NAME[String(code).toUpperCase()];
  if (!entry) return code;
  const key = (lang || "tr") as "tr" | "en" | "az";
  return entry[key] || entry.tr || code;
}

function toSupportMarkup(text: string) {
  return {
    __html: renderMentionsAsHTML(text, 8).replace(/\n/g, "<br />"),
  };
}

export default async function ModerationSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, locale, t, ts] = await Promise.all([
    params,
    getLocale(),
    getTranslations("moderation"),
    getTranslations("support"),
  ]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/moderation/support/${id}`);
  }

  const requestId = /^\d+$/.test(id) ? Number(id) : decodeId(id);
  if (!requestId || Number.isNaN(requestId)) notFound();

  const admin = createAdminClient();
  const moderator = await getModeratorAccess(admin, user.id);
  if (!moderator || !canAccessModerationArea(moderator, "review")) {
    redirect("/moderation");
  }

  await finalizeExpiredSupportRequests(admin, {
    notificationContent: ts("notificationFinalized"),
  });
  await cleanupResolvedSupportRequests(admin, { olderThanDays: 14 });

  const { data: request } = await admin
    .from("support_requests")
    .select(`
      id, user_id, kind, status, decision_code, decision_target_type, decision_target_id, message, related_url,
      reviewer_id, reviewer_note, created_at, reviewed_at,
      requester:profiles!support_requests_user_id_fkey(user_id, username, full_name, avatar_url, language, country)
    `)
    .eq("id", requestId)
    .maybeSingle();

  if (!request) notFound();

  const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
  const countryFilter = getModeratorCountryFilter(moderator);
  if (countryFilter && requester?.country !== countryFilter) {
    notFound();
  }
  if (request.reviewer_id && request.reviewer_id !== user.id) {
    notFound();
  }

  const parsedMessage = parseSupportStoredMessage(request.message);
  const parsedReviewer = parseSupportReviewerNote(request.reviewer_note);
  const reviewerThread = parseSupportReviewerThread(request.reviewer_note);
  const awaitingUserReply = request.status === "in_review" && parsedReviewer.mode === "await_user";
  const replyWindowExpired = isSupportReplyWindowExpired(request.reviewer_note);
  const requestedReplyCount = reviewerThread.filter((entry) => entry.mode === "await_user").length;
  const userReplied = parsedMessage.userReplies.length > 0 && request.status === "open";
  let replyCursor = 0;

  const profileIds = [request.reviewer_id].filter((value): value is string => Boolean(value));
  const { data: profiles } = profileIds.length
    ? await admin
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", profileIds)
    : { data: [] as Array<{ user_id: string; username: string | null; avatar_url: string | null }> };
  const reviewerProfile = (profiles || []).find((profile) => profile.user_id === request.reviewer_id) || null;

  const supportPresets = getSupportReplyPresets(request.kind, {
    language: requester?.language,
    username: requester?.username,
    topicId: parsedMessage.topicId,
  });

  const localeBadge = [requester?.language, getCountryName(requester?.country, requester?.language)].filter(Boolean).join(" · ");
  const kindLabel = request.kind === "moderation_appeal" ? t("appeals") : t("generalSupport");

  const renderReviewerBubble = (createdAt: string | null, message: string, key: string) => (
    <div className="flex" key={key}>
      <div className="w-full flex items-end gap-2.5">
        <div className="shrink-0 flex">
          {reviewerProfile?.avatar_url ? (
            <LazyAvatar src={reviewerProfile.avatar_url} alt={reviewerProfile.username || ""} sizeClass="h-9 w-9 sm:h-10 sm:w-10" />
          ) : (
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-bg-secondary flex items-center justify-center">
              <CircleAlert className="h-4 w-4 text-text-muted" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 rounded-[20px] rounded-tr-[3px] rounded-bl-[3px] bg-bg-secondary px-[18px] py-3.5 sm:px-5 sm:py-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-text-muted">
              {ts("responseTitle")}
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
    <AppLayout headerTitle={ts("detailTitle")} hideRightSidebar>
      <div className="px-4 py-3">
        <div className="mx-auto max-w-[760px] space-y-4">
          <div className="rounded-[15px] bg-bg-secondary p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main">
                    {kindLabel}
                  </span>
                  {localeBadge ? (
                    <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main">
                      {localeBadge}
                    </span>
                  ) : null}
                  <span className="text-[0.65rem] text-text-muted">
                    {formatRelativeDate(request.created_at, locale)}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  {requester?.avatar_url ? (
                    <LazyAvatar src={requester.avatar_url} alt="" sizeClass="h-4 w-4" />
                  ) : null}
                  <p className="text-[0.72rem] text-text-muted">
                    {t("supportRequester")}: @{requester?.username || "—"}
                  </p>
                </div>

                <p className="mt-1.5 text-[0.82rem] font-medium text-text-primary">
                  {request.kind === "moderation_appeal" ? ts("types.moderation_appeal.label") : ts("types.bug_report.label")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-full flex items-end gap-2.5 md:justify-end">
              <div className="order-2 shrink-0">
                <LazyAvatar src={requester?.avatar_url} alt={requester?.username || ""} sizeClass="h-9 w-9 sm:h-10 sm:w-10" />
              </div>
              <div className="order-1 min-w-0 flex-1 rounded-[20px] rounded-tl-[3px] rounded-br-[3px] bg-bg-secondary px-[18px] py-3.5 sm:px-5 sm:py-4 space-y-3">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 text-[0.82rem] font-semibold text-text-primary">
                    {requester?.username ? `@${requester.username}` : kindLabel}
                  </div>
                  <div className="shrink-0 text-[0.66rem] font-medium text-text-muted">
                    {formatRelativeDate(request.created_at, locale)}
                  </div>
                </div>

                {request.decision_code ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-[11px] bg-bg-tertiary px-3 py-2 text-[0.75rem]">
                      <span className="text-text-muted">{ts("decisionLabel")}:</span>{" "}
                      <span className="font-mono font-semibold">#{request.decision_code}</span>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-text-muted">{ts("requestTitle")}</div>
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

                {request.related_url ? (
                  <a
                    href={request.related_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-[0.76rem] font-medium text-accent-main hover:underline"
                  >
                    {ts("relatedUrlView")}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {reviewerThread.length > 0
            ? reviewerThread.flatMap((entry, index) => {
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
                          <LazyAvatar src={requester?.avatar_url} alt={requester?.username || ""} sizeClass="h-9 w-9 sm:h-10 sm:w-10" />
                        </div>
                        <div className="order-1 min-w-0 flex-1 rounded-[20px] rounded-tl-[3px] rounded-br-[3px] bg-bg-secondary px-[18px] py-3.5 sm:px-5 sm:py-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-3 min-w-0">
                            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-text-muted">
                              {ts("replyTitle")}
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
            : !parsedMessage.userReplies.length ? (
                <div className="rounded-[12px] bg-bg-tertiary px-3 py-2.5 text-[0.78rem] font-medium leading-[1.55] text-text-muted">
                  {ts("waitingResponse")}
                </div>
              ) : null}

          {request.status !== "resolved" && request.status !== "rejected" ? (
            <div className="rounded-[15px] bg-bg-secondary p-4 space-y-3">
              {awaitingUserReply && parsedMessage.userReplies.length < requestedReplyCount ? (
                <div className="rounded-[10px] bg-bg-tertiary px-3 py-2 text-[0.74rem] font-medium text-text-primary">
                  {replyWindowExpired ? ts("replyWindowExpired") : ts("replyAwaitingUser")}
                </div>
              ) : null}

              {userReplied ? (
                <div className="rounded-[10px] bg-bg-tertiary px-3 py-2 text-[0.74rem] font-medium text-text-primary">
                  {t("supportUserReplied")}
                </div>
              ) : null}

              <ModerationSupportActionPanel
                requestId={request.id}
                initialValue={parsedReviewer.message}
                presets={supportPresets}
                labels={{
                  placeholder: t("reviewerNotePlaceholder"),
                  awaitUserAction: t("supportAwaitUserAction"),
                  resolveAction: t("supportResolveAction"),
                  actionHint: t("supportActionHint"),
                  tryAgainLater: ts("tryAgainLater"),
                  awaitUserSuccess: ts("notificationAwaitingReply"),
                  resolveSuccess: ts("notificationResolved"),
                }}
              />
            </div>
          ) : (
            <div className="rounded-[12px] bg-bg-tertiary px-3 py-2.5 text-[0.78rem] font-medium leading-[1.55] text-text-muted">
              {ts("cleanupNotice")}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
