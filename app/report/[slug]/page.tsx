import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { decodeId } from "@/lib/hashId";
import { getTranslations } from "next-intl/server";
import HeaderTitle from "@/components/HeaderTitle";
import ModerationBadge from "@/components/ModerationBadge";
import { ShieldAlert } from "lucide-react";
import ModerationContent from "@/app/[slug]/moderation/ModerationContent";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}

export default async function ReportStatusPage({ params, searchParams }: PageProps) {
  const t = await getTranslations("moderation");
  const { slug } = await params;
  const { comment: commentParam } = await searchParams;
  const currentUserId = await getAuthUserId();
  if (!currentUserId) notFound();

  const admin = createAdminClient();
  const decodedSlug = decodeURIComponent(slug);

  // Find the post by slug
  const { data: post } = await admin
    .from("posts")
    .select("id, title, slug, status, is_nsfw, content_type")
    .eq("slug", decodedSlug)
    .single();

  if (!post) notFound();

  // Comment report view
  if (commentParam) {
    const commentId = decodeId(commentParam) ?? Number(commentParam);
    if (!commentId || isNaN(commentId)) notFound();

    // Verify reporter has a report notification for this comment
    const { data: notif } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", currentUserId)
      .in("type", ["report_resolved", "report_dismissed"])
      .eq("object_type", "comment")
      .eq("object_id", commentId)
      .limit(1)
      .single();

    if (!notif) notFound();

    // Load comment data
    const { data: commentData } = await admin
      .from("comments")
      .select("id, content, is_nsfw, status, moderation_reason, moderation_category")
      .eq("id", commentId)
      .single();

    if (!commentData) notFound();

    const isCommentReview = commentData.is_nsfw;
    const isCommentRejected = commentData.status === "rejected" || commentData.status === "removed";

    let statusMessage: string;
    let variant: "review" | "rejected" | "approved";
    let badgeLabel: string;

    if (isCommentReview) {
      statusMessage = t("reportCommentUnderReview");
      variant = "review";
      badgeLabel = t("commentUnderReview");
    } else if (isCommentRejected) {
      statusMessage = t("reportCommentRemoved");
      variant = "rejected";
      badgeLabel = t("commentRemoved");
    } else {
      statusMessage = t("reportCommentNoViolation");
      variant = "approved";
      badgeLabel = t("commentPublished");
    }

    // Fetch decision code for rejected comment
    let commentDecisionCode: string | null = null;
    if (isCommentRejected) {
      const { data: cDecision } = await admin
        .from("moderation_decisions")
        .select("decision_code")
        .eq("target_type", "comment")
        .eq("target_id", String(commentData.id))
        .eq("decision", "removed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      commentDecisionCode = cDecision?.decision_code || null;
    }

    return (
      <>
        <HeaderTitle title={t("reportStatus")} />
        <div className="min-h-screen pb-20">
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
            <div className="bg-bg-secondary rounded-[30px] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className={
                  isCommentReview ? "text-[var(--accent-color)]" :
                  isCommentRejected ? "text-error" : "text-success"
                } />
                <h2 className="text-base font-semibold">{t("reportStatus")}</h2>
              </div>
              <ModerationBadge label={badgeLabel} variant={variant} />
              <p className="text-sm text-text-muted">{statusMessage}</p>
              <div className="border border-border-primary rounded-lg p-3">
                <p className="text-sm text-text-muted line-clamp-3">{commentData.content}</p>
              </div>
              <ModerationContent decisionCode={isCommentRejected ? commentDecisionCode : null} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Post report view — verify reporter has a report notification for this post
  const { data: notif } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", currentUserId)
    .in("type", ["report_resolved", "report_dismissed"])
    .eq("object_type", "post")
    .eq("object_id", post.id)
    .limit(1)
    .single();

  if (!notif) notFound();

  const isUnderReview = post.status === "moderation" || post.is_nsfw;
  const isRemoved = post.status === "removed";

  let statusMessage: string;
  let variant: "review" | "rejected" | "approved";
  let badgeLabel: string;

  if (isUnderReview) {
    statusMessage = t("reportUnderReview");
    variant = "review";
    badgeLabel = t("contentUnderReview");
  } else if (isRemoved) {
    statusMessage = t("reportContentRemoved");
    variant = "rejected";
    badgeLabel = t("contentRemoved");
  } else {
    statusMessage = t("reportNoViolation");
    variant = "approved";
    badgeLabel = t("contentPublished");
  }

  // Fetch decision code if post is removed
  let decisionCode: string | null = null;
  if (isRemoved) {
    const { data: decision } = await admin
      .from("moderation_decisions")
      .select("decision_code")
      .eq("target_type", "post")
      .eq("target_id", String(post.id))
      .eq("decision", "removed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    decisionCode = decision?.decision_code || null;
  }

  return (
    <>
      <HeaderTitle title={t("reportStatus")} />
      <div className="min-h-screen pb-20">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="bg-bg-secondary rounded-[30px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className={isRemoved ? "text-error" : isUnderReview ? "text-[var(--accent-color)]" : "text-success"} />
              <h2 className="text-base font-semibold">{t("reportStatus")}</h2>
            </div>
            <ModerationBadge label={badgeLabel} variant={variant} />
            <p className="text-sm text-text-muted">{statusMessage}</p>
            <div className="border border-border-primary rounded-lg p-3">
              <p className="text-sm font-medium">{post.title}</p>
            </div>
            <ModerationContent decisionCode={isRemoved ? decisionCode : null} />
          </div>
        </div>
      </div>
    </>
  );
}
