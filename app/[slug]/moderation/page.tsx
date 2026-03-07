import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { decodeId } from "@/lib/hashId";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import HeaderTitle from "@/components/HeaderTitle";
import ModerationBadge from "@/components/ModerationBadge";
import { ShieldAlert } from "lucide-react";
import ModerationContent from "./ModerationContent";
import CopyrightVerificationForm from "@/components/CopyrightVerificationForm";

/** Strip technical score patterns like (Porn=0.98) from AI-generated reasons */
function cleanReason(reason: string): string {
  return reason
    .replace(/\s*\([A-Za-z]+=[\d.]+\)/g, '')
    .replace(/\s*[A-Za-z]+=[\d.]+(?:,\s*[A-Za-z]+=[\d.]+)*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getHoursSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}

interface ModerationPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  is_nsfw: boolean;
  moderation_reason?: string | null;
  moderation_category?: string | null;
  moderation_due_at?: string | null;
  author_id: string;
  removal_reason?: string | null;
  removal_decision_id?: number | null;
  content_type?: string | null;
  copyright_claim_status?: string | null;
  copyright_match_id?: number | null;
  copyright_similarity?: number | null;
}

interface ModerationCommentData {
  id: number;
  content: string;
  is_nsfw: boolean;
  status: string;
  moderation_reason?: string | null;
  moderation_category?: string | null;
  author_id: string;
}

interface OriginalPostRow {
  title: string;
  slug: string;
  author_id: string;
}

interface CopyrightClaim {
  id: number;
  status: string;
  matched_post_id?: number | null;
  matched_author_id?: string | null;
  similarity_percent?: number | null;
  proof_description?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
}

interface MatchedPostInfo {
  id: number;
  title: string;
  slug: string;
  author_id: string;
  username?: string | null;
}

interface MatchedVerification {
  owner_name?: string | null;
  company_name?: string | null;
}

export default async function ModerationStatusPage({ params, searchParams }: PageProps) {
  const t = await getTranslations("moderation");
  const { slug } = await params;
  const { comment: commentParam } = await searchParams;
  const currentUserId = await getAuthUserId();
  if (!currentUserId) notFound();

  const admin = createAdminClient();
  const decodedSlug = decodeURIComponent(slug);

  // Check if current user is admin/moderator
  let isStaff = false;
  const { data: viewerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', currentUserId)
    .single();
  isStaff = viewerProfile?.role === 'admin' || viewerProfile?.role === 'moderator';

  const { data: postData } = await admin
    .from("posts")
    .select("id, title, slug, status, is_nsfw, moderation_reason, moderation_category, moderation_due_at, author_id, removal_reason, removal_decision_id, content_type, copyright_claim_status, copyright_match_id, copyright_similarity")
    .eq("slug", decodedSlug)
    .single();

  const post = postData as ModerationPost | null;
  if (!post) notFound();

  // Allow post author, staff, or comment author (when ?comment= param is present)
  let isCommentAuthor = false;
  if (commentParam && post.author_id !== currentUserId && !isStaff) {
    const commentId = decodeId(commentParam) ?? Number(commentParam);
    if (commentId && !isNaN(commentId)) {
      const { data: commentCheck } = await admin
        .from("comments")
        .select("author_id")
        .eq("id", commentId)
        .eq("author_id", currentUserId)
        .single();
      isCommentAuthor = !!commentCheck;
    }
  }

  if (post.author_id !== currentUserId && !isStaff && !isCommentAuthor) notFound();

  // 48-hour rule
  if (post.moderation_due_at) {
    const hoursSince = getHoursSince(post.moderation_due_at);
    if (hoursSince > 48 && post.status === "published" && !post.is_nsfw) {
      redirect(`/${post.slug}`);
    }
  }

  // If comment param, load comment info
  let commentData: ModerationCommentData | null = null;
  if (commentParam) {
    const commentId = decodeId(commentParam) ?? Number(commentParam);
    if (commentId && !isNaN(commentId)) {
      const { data: c } = await admin
        .from("comments")
        .select("id, content, is_nsfw, status, moderation_reason, moderation_category, author_id")
        .eq("id", commentId)
        .single();
      const commentRecord = c as ModerationCommentData | null;
      if (commentRecord && (commentRecord.author_id === currentUserId || isStaff)) {
        commentData = commentRecord;
      }
    }
  }

  // Fetch decision code if post is removed
  let decisionCode: string | null = null;
  if (post.status === "removed" && post.removal_decision_id) {
    const { data: decision } = await admin
      .from("moderation_decisions")
      .select("decision_code, reason")
      .eq("id", post.removal_decision_id)
      .single();
    decisionCode = decision?.decision_code || null;
  }

  // Fetch decision code for approved/cleared posts too
  let approvedDecisionCode: string | null = null;
  if (post.status === "published" && !post.is_nsfw) {
    const { data: approvedDecision } = await admin
      .from("moderation_decisions")
      .select("decision_code")
      .eq("target_type", "post")
      .eq("target_id", String(post.id))
      .in("decision", ["approved", "cleared"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    approvedDecisionCode = approvedDecision?.decision_code || null;
  }

  // Fetch original post info for kopya_icerik
  let originalPost: { title: string; slug: string; username: string } | null = null;
  if ((post.moderation_category === "kopya_icerik" || post.moderation_category === "copyright") && post.copyright_match_id) {
    const { data: opData } = await admin
      .from("posts")
      .select("title, slug, author_id")
      .eq("id", post.copyright_match_id)
      .single();
    const op = opData as OriginalPostRow | null;
    if (op) {
      const { data: opProfile } = await admin
        .from("profiles")
        .select("username")
        .eq("user_id", op.author_id)
        .single();
      originalPost = { title: op.title, slug: op.slug, username: opProfile?.username || t("unknown") };
    }
  }

  // Fetch copyright strike count for warning
  let copyrightStrikeCount = 0;
  if (post.moderation_category === "copyright" || post.moderation_category === "kopya_icerik") {
    const { data: authorProfile } = await admin
      .from("profiles")
      .select("copyright_strike_count")
      .eq("user_id", post.author_id)
      .single();
    copyrightStrikeCount = authorProfile?.copyright_strike_count || 0;
  }

  // Fetch copyright claim info if pending verification
  let copyrightClaim: CopyrightClaim | null = null;
  let matchedPostInfo: MatchedPostInfo | null = null;
  let matchedVerification: MatchedVerification | null = null;
  if (post.copyright_claim_status === 'pending_verification') {
    const { data: claim } = await admin
      .from('copyright_claims')
      .select('id, status, matched_post_id, matched_author_id, similarity_percent, proof_description, owner_name, owner_email')
      .eq('post_id', post.id)
      .eq('claimant_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    copyrightClaim = claim as CopyrightClaim | null;

    if (copyrightClaim?.matched_post_id) {
      const { data: mpData } = await admin
        .from('posts')
        .select('id, title, slug, author_id')
        .eq('id', copyrightClaim.matched_post_id)
        .single();
      matchedPostInfo = mpData as MatchedPostInfo | null;

      // Get matched author username for profile link
      if (matchedPostInfo?.author_id) {
        const { data: matchedProfile } = await admin
          .from('profiles')
          .select('username')
          .eq('user_id', matchedPostInfo.author_id)
          .single();
        if (matchedProfile) matchedPostInfo.username = matchedProfile.username;
      }

      // Check if matched post has a verified owner
      const { data: ver } = await admin
        .from('copyright_verifications')
        .select('owner_name, company_name')
        .eq('post_id', copyrightClaim.matched_post_id)
        .single();
      matchedVerification = ver as MatchedVerification | null;
    }
  }

  // Fetch decision code for rejected comment
  let commentDecisionCode: string | null = null;
  if (commentData && (commentData.status === "rejected" || commentData.status === "removed")) {
    const { data: cDecision } = await admin
      .from("moderation_decisions")
      .select("decision_code, reason")
      .eq("target_type", "comment")
      .eq("target_id", String(commentData.id))
      .eq("decision", "removed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    commentDecisionCode = cDecision?.decision_code || null;
  }

  const isUnderReview = post.status === "moderation" || post.is_nsfw;
  const isRemoved = post.status === "removed";
  const isPublished = post.status === "published" && !post.is_nsfw;
  const contentTypeLabel = post.content_type === "moment" ? "moment" : post.content_type === "video" ? "video" : t("post");

  // Comment moderation view
  if (commentData) {
    const isCommentReview = commentData.is_nsfw;
    const isCommentRejected = commentData.status === "rejected" || commentData.status === "removed";
    const variant = isCommentReview ? "review" : isCommentRejected ? "rejected" : "approved";
    const badgeLabel = isCommentReview ? t("commentUnderReview") : isCommentRejected ? t("commentRemoved") : t("commentPublished");

    return (
      <>
        <HeaderTitle title={t("moderationTitle")} />
        <div className="min-h-screen pb-20">
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
            <div className="bg-bg-secondary rounded-[30px] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className={
                  isCommentReview ? "text-[var(--accent-color)]" :
                  isCommentRejected ? "text-error" : "text-success"
                } />
                <h2 className="text-base font-semibold">{t("moderationStatus")}</h2>
              </div>
              <ModerationBadge label={badgeLabel} variant={variant} />
              {isCommentReview && (
                <p className="text-sm text-text-muted">
                  {t("commentVisibleOnlyToYou")}
                </p>
              )}
              {!isCommentReview && !isCommentRejected && (
                <p className="text-sm text-text-muted">
                  {t("reviewedAndCleared")}
                </p>
              )}
              <div className="border border-border-primary rounded-lg p-3">
                <p className="text-sm text-text-muted line-clamp-3">{commentData.content}</p>
              </div>
              {(isCommentReview || isCommentRejected) && commentData.moderation_reason && (
                <div className={`${isCommentReview ? "bg-[var(--accent-color)]/5" : "bg-error/5"} rounded-lg p-3`}>
                  <p className={`text-xs font-medium ${isCommentReview ? "text-[var(--accent-color)]" : "text-error"}`}>{t("reason")}</p>
                  <p className="text-sm text-text-primary mt-0.5">{cleanReason(commentData.moderation_reason)}</p>
                  <p className="text-[0.65rem] text-text-muted mt-1.5">
                    {isCommentReview ? t("generatedByAI") : t("reviewedByTeam")}
                  </p>
                </div>
              )}
              <ModerationContent decisionCode={isCommentRejected ? commentDecisionCode : null} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Post moderation view
  return (
    <>
      <HeaderTitle title={t("moderationTitle")} />
      <div className="min-h-screen pb-20">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="bg-bg-secondary rounded-[30px] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className={isRemoved ? "text-error" : isUnderReview ? "text-[var(--accent-color)]" : "text-success"} />
              <h2 className="text-base font-semibold">{t("moderationStatus")}</h2>
            </div>

            {isUnderReview && post.moderation_category !== 'kopya_icerik' && <ModerationBadge label={t("contentUnderReview")} variant="review" />}
            {isRemoved && <ModerationBadge label={t("contentRemoved")} variant="rejected" />}
            {isPublished && <ModerationBadge label={t("contentPublished")} variant="approved" />}

            {post.moderation_category !== 'kopya_icerik' && (
            <div className="border border-border-primary rounded-lg p-3">
              <p className="text-sm font-medium">{post.title}</p>
            </div>
            )}

            {isPublished && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  {t("reviewedAndCleared")}
                </p>
                <ModerationContent decisionCode={approvedDecisionCode} />
              </div>
            )}

            {isUnderReview && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  {t("contentVisibleOnlyToYou", { type: contentTypeLabel })}
                </p>
                {post.moderation_category && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                      {post.moderation_category === 'kopya_icerik' ? t("copiedContent") : post.moderation_category === 'copyright' ? t("copyrightLabel") : post.moderation_category === 'copyright_protected' ? t("copiedContent") : post.moderation_category}
                    </span>
                  </div>
                )}
                {(post.moderation_category === 'kopya_icerik' || post.moderation_category === 'copyright') && (
                  <p className="text-sm text-text-primary font-semibold">
                    {t("copyrightWarningForContent", { title: post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title })}
                  </p>
                )}
                {post.moderation_reason && (
                  <div className="bg-[var(--accent-color)]/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-[var(--accent-color)]">{t("reason")}</p>
                    <p className="text-sm text-text-primary mt-0.5">{cleanReason(post.moderation_reason)}</p>
                    <p className="text-[0.65rem] text-text-muted mt-1.5">{t("generatedByAI")}</p>
                  </div>
                )}
                {originalPost && (post.moderation_category === 'kopya_icerik' || post.moderation_category === 'copyright') && (
                  <a href={`/${originalPost.slug}`} target="_blank" rel="noopener noreferrer" className="t-btn accept flex items-center justify-center w-full">
                    {t("viewMatchedContent")}
                  </a>
                )}
                {post.copyright_claim_status === 'pending_verification' && copyrightClaim && (
                  copyrightClaim.proof_description ? (
                    <div className="mt-2">
                      <p className="text-sm font-medium">{t("copyrightClaimSubmitted")}</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {t("copyrightClaimUnderReview")}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="mb-3">
                        <p className="text-sm font-medium">{t("verificationRequired")}</p>
                        <p className="text-sm text-text-muted mt-0.5">
                          {t("verificationRequiredDesc")}
                        </p>
                      </div>
                      <CopyrightVerificationForm
                        postId={post.id}
                        matchedAuthor={matchedPostInfo?.username || undefined}
                        matchedCompany={matchedVerification?.company_name || matchedVerification?.owner_name || undefined}
                        similarity={copyrightClaim.similarity_percent ?? undefined}
                      />
                    </div>
                  )
                )}
                <ModerationContent decisionCode={null} />
              </div>
            )}

            {(post.moderation_category === 'copyright' || post.moderation_category === 'kopya_icerik') && copyrightStrikeCount > 0 && (
              <div className="bg-error/5 border border-error/20 rounded-lg p-3">
                <p className="text-xs font-medium text-error">{t("copyrightWarning")}</p>
                <p className="text-sm text-text-primary mt-0.5">
                  {t("copyrightStrikeCount", { count: copyrightStrikeCount })}
                </p>
              </div>
            )}

            {isRemoved && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  {t("contentRemovedDesc", { type: contentTypeLabel })}
                </p>
                {(post.removal_reason || post.moderation_reason) && (
                  <div className="bg-error/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-error">{t("reason")}</p>
                    <p className="text-sm text-text-primary mt-0.5 font-semibold">{cleanReason(post.removal_reason || post.moderation_reason || '')}</p>
                    <p className="text-[0.65rem] text-text-muted mt-1.5">{t("reviewedByTeam")}</p>
                  </div>
                )}
                <ModerationContent decisionCode={decisionCode} />
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
