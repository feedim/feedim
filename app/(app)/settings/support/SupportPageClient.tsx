"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { feedimAlert } from "@/components/FeedimAlert";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import { encodeId } from "@/lib/hashId";
import type {
  SupportDecisionOption,
  SupportRequestKind,
} from "@/lib/supportRequests";

export interface SupportPageLabels {
  title: string;
  description: string;
  typeLabel: string;
  bugTopicLabel: string;
  decisionCode: string;
  decisionCodePlaceholder: string;
  noAppealableDecisions: string;
  appealHint: string;
  appealSearchLabel: string;
  appealSearchPlaceholder: string;
  appealSearchHint: string;
  noMatchingDecision: string;
  relatedUrl: string;
  relatedUrlHint: string;
  appealTextLabel: string;
  messageLabel: string;
  appealPlaceholder: string;
  messagePlaceholder: string;
  minLength: string;
  submitting: string;
  submit: string;
  submitted: string;
  activeRequestNotice: string;
  viewActiveRequest: string;
  tryAgainLater: string;
  types: Record<SupportRequestKind, { label: string; desc: string }>;
  bugTopics: Array<{ value: string; label: string }>;
}

const SUPPORT_TYPES: SupportRequestKind[] = ["moderation_appeal", "bug_report"];
const FALLBACK_BUG_TOPICS = [
  { value: "account", label: "Hesabımla ilgili sorun yaşıyorum" },
];

function normalizeDecisionDigits(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function normalizeSupportUrlInput(value: string) {
  const next = String(value || "").trimStart();
  if (/^http:\/\//i.test(next)) {
    return next.replace(/^http:\/\//i, "https://");
  }
  return next;
}

function formatDecisionOption(item: SupportDecisionOption, fallbackLabel: string) {
  const segments = [`#${item.decisionCode}`];
  if (item.reason) segments.push(item.reason);
  else if (item.decision) segments.push(item.decision);
  else segments.push(fallbackLabel);
  return segments.join(" · ");
}

export default function SupportPageClient({
  labels,
  locale,
}: {
  labels: SupportPageLabels;
  locale: string;
}) {
  const bugTopics = labels.bugTopics?.length ? labels.bugTopics : FALLBACK_BUG_TOPICS;
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type");
  const requestedDecisionCode = searchParams.get("decisionCode") || "";
  const initialType = requestedType === "bug_report"
    ? requestedType
    : "moderation_appeal";

  const [type, setType] = useState<SupportRequestKind>(initialType);
  const [decisionCode, setDecisionCode] = useState(normalizeDecisionDigits(requestedDecisionCode));
  const [decisionQuery, setDecisionQuery] = useState(normalizeDecisionDigits(requestedDecisionCode).slice(0, 3));
  const [bugTopic, setBugTopic] = useState(bugTopics[0]?.value || "");
  const [message, setMessage] = useState("");
  const [relatedUrl, setRelatedUrl] = useState("");
  const [availableDecisions, setAvailableDecisions] = useState<SupportDecisionOption[]>([]);
  const [activeRequest, setActiveRequest] = useState<{ id: number | string; status: string; created_at?: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const isAppeal = type === "moderation_appeal";
  const isBugReport = type === "bug_report";
  const needsDecisionSearch = availableDecisions.length > 8;

  const filteredDecisions = useMemo(() => {
    if (!isAppeal) return [];
    if (!needsDecisionSearch) return availableDecisions;
    const normalizedQuery = normalizeDecisionDigits(decisionQuery);
    if (normalizedQuery.length < 3) return [];
    return availableDecisions.filter((item) => item.decisionCode.includes(normalizedQuery));
  }, [availableDecisions, decisionQuery, isAppeal, needsDecisionSearch]);

  const canSubmit = useMemo(() => {
    if (submitting || activeRequest) return false;
    if (isAppeal && decisionCode.trim().length === 0) return false;
    if (isAppeal && needsDecisionSearch && filteredDecisions.length === 0) return false;
    return message.trim().length >= 10;
  }, [activeRequest, decisionCode, filteredDecisions.length, isAppeal, message, needsDecisionSearch, submitting]);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!isBugReport) return;
    if (!bugTopics.some((item) => item.value === bugTopic)) {
      setBugTopic(bugTopics[0]?.value || "");
    }
  }, [bugTopic, bugTopics, isBugReport]);

  useEffect(() => {
    const normalized = normalizeDecisionDigits(requestedDecisionCode);
    setDecisionCode(normalized);
    setDecisionQuery(normalized.slice(0, 3));
  }, [requestedDecisionCode]);

  useEffect(() => {
    if (!isAppeal) return;
    if (availableDecisions.length === 0) {
      setDecisionCode("");
      return;
    }

    if (needsDecisionSearch && filteredDecisions.length === 0) {
      const requested = normalizeDecisionDigits(requestedDecisionCode);
      if (requested && availableDecisions.some((item) => item.decisionCode === requested)) {
        setDecisionCode(requested);
      } else {
        setDecisionCode("");
      }
      return;
    }

    const pool = filteredDecisions.length > 0 ? filteredDecisions : availableDecisions;
    if (decisionCode && pool.some((item) => item.decisionCode === decisionCode)) {
      return;
    }

    const requested = normalizeDecisionDigits(requestedDecisionCode);
    const nextCode = pool.find((item) => item.decisionCode === requested)?.decisionCode
      || pool[0]?.decisionCode
      || "";
    setDecisionCode(nextCode);
  }, [availableDecisions, decisionCode, filteredDecisions, isAppeal, requestedDecisionCode]);

  const loadRequests = async () => {
    try {
      const params = new URLSearchParams();
      if (requestedDecisionCode) params.set("decisionCode", requestedDecisionCode);
      const res = await fetch(
        params.size > 0 ? `/api/support-requests?${params.toString()}` : "/api/support-requests",
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "server_error");
      setAvailableDecisions(data.availableDecisions || []);
      setActiveRequest(data.activeRequest || null);
    } catch {
      feedimAlert("error", labels.tryAgainLater);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, [requestedDecisionCode]);

  const handleCaptchaVerify = async (captchaToken: string) => {
    setCaptchaOpen(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: type,
          decisionCode,
          topicId: isBugReport ? bugTopic : null,
          topicLabel: isBugReport
            ? bugTopics.find((item) => item.value === bugTopic)?.label || ""
            : null,
          message,
          relatedUrl,
          captchaToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.activeRequest) {
          setActiveRequest(data.activeRequest);
        }
        feedimAlert("error", data.error || labels.tryAgainLater);
        return;
      }
      setActiveRequest(data.request ? {
        id: data.request.id,
        status: data.request.status || "open",
        created_at: data.request.created_at || null,
      } : {
        id: `temp-${Date.now()}`,
        status: "open",
        created_at: new Date().toISOString(),
      });
      setDecisionCode("");
      setDecisionQuery("");
      setBugTopic(bugTopics[0]?.value || "");
      setMessage("");
      setRelatedUrl("");
      setAvailableDecisions((prev) => prev.filter((item) => item.decisionCode !== decisionCode));
      setType(initialType);
    } catch {
      feedimAlert("error", labels.tryAgainLater);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setCaptchaOpen(true);
  };

  const activeRequestHref = useMemo(() => {
    if (!activeRequest) return null;
    const numericId = Number(activeRequest.id);
    if (!Number.isFinite(numericId) || numericId <= 0) return null;
    return `/support/${encodeId(numericId)}`;
  }, [activeRequest]);

  return (
    <AppLayout headerTitle={labels.title} hideRightSidebar>
      <div className="px-4 py-3 space-y-5">
        {!activeRequest ? (
          <div className="space-y-1">
            <p className="text-[0.82rem] leading-[1.5] text-text-muted">{labels.description}</p>
          </div>
        ) : null}

        {activeRequest ? (
          <div className="space-y-3">
            <div className="text-[0.82rem] font-medium leading-[1.5] text-text-primary">
              {labels.activeRequestNotice}
            </div>
            {activeRequestHref ? (
              <Link href={activeRequestHref} className="t-btn accept !w-full justify-center">
                {labels.viewActiveRequest}
              </Link>
            ) : null}
          </div>
        ) : null}

        {!activeRequest ? (
          <div className="space-y-1.5">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as SupportRequestKind)}
              className="select-modern w-full"
            >
              {SUPPORT_TYPES.map((id) => (
                <option key={id} value={id}>
                  {labels.types[id].label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {!activeRequest ? (
        <div className="rounded-[18px] bg-bg-secondary p-4 space-y-4">
          {isAppeal && (
            <div className="space-y-1.5">
              <label className="text-[0.78rem] font-semibold text-text-primary">{labels.decisionCode}</label>

              {needsDecisionSearch && (
                <div className="space-y-1.5">
                  <label className="text-[0.73rem] font-medium text-text-muted">{labels.appealSearchLabel}</label>
                  <input
                    value={decisionQuery}
                    onChange={(event) => setDecisionQuery(normalizeDecisionDigits(event.target.value))}
                    inputMode="numeric"
                    maxLength={12}
                    className="input-modern w-full font-mono"
                    placeholder={labels.appealSearchPlaceholder}
                  />
                  <p className="text-[0.72rem] text-text-muted">{labels.appealSearchHint}</p>
                </div>
              )}

              {availableDecisions.length === 0 ? (
                <div className="rounded-[12px] bg-bg-tertiary px-3 py-3 text-[0.78rem] font-medium text-text-muted">
                  {labels.noAppealableDecisions}
                </div>
              ) : filteredDecisions.length > 0 ? (
                <select
                  value={decisionCode}
                  onChange={(event) => setDecisionCode(event.target.value)}
                  className="select-modern w-full font-mono"
                >
                  {filteredDecisions.map((item) => (
                    <option key={item.decisionCode} value={item.decisionCode}>
                      {formatDecisionOption(item, labels.decisionCodePlaceholder)}
                    </option>
                  ))}
                </select>
              ) : needsDecisionSearch ? (
                <div className="rounded-[12px] bg-bg-tertiary px-3 py-3 text-[0.78rem] font-medium text-text-muted">
                  {normalizeDecisionDigits(decisionQuery).length < 3 ? labels.appealSearchHint : labels.noMatchingDecision}
                </div>
              ) : null}

              <p className="text-[0.72rem] text-text-muted">{labels.appealHint}</p>

            </div>
          )}

          {isBugReport && bugTopics.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[0.78rem] font-semibold text-text-primary">{labels.bugTopicLabel}</label>
              <select
                value={bugTopic}
                onChange={(event) => setBugTopic(event.target.value)}
                className="select-modern w-full"
              >
                {bugTopics.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[0.78rem] font-semibold text-text-primary">
              {isAppeal ? labels.appealTextLabel : labels.messageLabel}
            </label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              maxLength={4000}
              className="input-modern w-full resize-none"
              placeholder={isAppeal ? labels.appealPlaceholder : labels.messagePlaceholder}
            />
            <div className="flex justify-between text-[0.72rem] text-text-muted">
              <span>{labels.minLength}</span>
              <span>{message.trim().length}/4000</span>
            </div>
          </div>

          {!isAppeal && (
            <div className="space-y-1.5">
              <label className="text-[0.78rem] font-semibold text-text-primary">{labels.relatedUrl}</label>
              <input
                value={relatedUrl}
                onChange={(event) => setRelatedUrl(normalizeSupportUrlInput(event.target.value))}
                className="input-modern w-full"
                placeholder="https://..."
                maxLength={1000}
              />
              <p className="text-[0.72rem] text-text-muted">{labels.relatedUrlHint}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="t-btn accept w-full disabled:opacity-40"
          >
            {submitting ? labels.submitting : labels.submit}
          </button>
        </div>
        ) : null}
      </div>
      <PuzzleCaptcha
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerify={handleCaptchaVerify}
      />
    </AppLayout>
  );
}
