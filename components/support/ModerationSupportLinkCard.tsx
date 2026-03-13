 "use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { encodeId } from "@/lib/hashId";
import { formatRelativeDate } from "@/lib/utils";
import { parseSupportStoredMessage } from "@/lib/supportRequests";
import LazyAvatar from "@/components/LazyAvatar";
import { feedimAlert } from "@/components/FeedimAlert";

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

export default function ModerationSupportLinkCard({
  request,
  locale,
  currentModeratorId,
  labels,
}: {
  request: any;
  locale: string;
  currentModeratorId: string | null;
  labels: {
    appeals: string;
    generalSupport: string;
    supportRequester: string;
    openSupportRequest: string;
    takeSupportRequest: string;
    supportAssignedToYou: string;
    supportClaimSuccess: string;
    supportClaimError: string;
    supportClaimLimit: string;
    supportNewMessage: string;
  };
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
  const isAppeal = request.kind === "moderation_appeal";
  const parsedSupport = parseSupportStoredMessage(request.message);
  const localeCode = requester?.language || null;
  const countryName = getCountryName(requester?.country, requester?.language);
  const localeBadge = [localeCode, countryName].filter(Boolean).join(" · ");
  const isAssignedToCurrentModerator = Boolean(currentModeratorId) && request.reviewer_id === currentModeratorId;
  const subject = isAppeal
    ? parsedSupport.topicLabel || (request.decision_code ? `#${request.decision_code}` : labels.appeals)
    : parsedSupport.topicLabel || labels.generalSupport;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/admin/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: request.id,
          action: "claim",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        feedimAlert("error", data.error || labels.supportClaimError);
        return;
      }
      feedimAlert("success", labels.supportClaimSuccess);
      router.refresh();
    } catch {
      feedimAlert("error", labels.supportClaimError);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="rounded-[15px] bg-bg-secondary p-4 transition hover:bg-bg-tertiary">
      <div className="space-y-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main">
              {isAppeal ? labels.appeals : labels.generalSupport}
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
              {labels.supportRequester}: @{requester?.username || "—"}
            </p>
          </div>

          <div className="mt-1.5 space-y-1">
            <p className="text-[0.82rem] font-medium text-text-primary">
              {subject}
            </p>
            {request.pending_user_reply ? (
              <div className="inline-flex rounded px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main">
                {labels.supportNewMessage}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-[0.72rem] text-text-muted">
            {isAppeal && request.decision_code ? `#${request.decision_code}` : localeBadge}
          </div>
          {isAssignedToCurrentModerator ? (
            <Link
              href={`/moderation/support/${encodeId(Number(request.id))}`}
              className="inline-flex items-center gap-1 text-[0.76rem] font-semibold text-text-primary"
            >
              <span>{labels.openSupportRequest}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="t-btn accept !h-8 px-3 disabled:opacity-60"
            >
              {claiming ? labels.takeSupportRequest : labels.takeSupportRequest}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
