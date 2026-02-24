import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import { decodeId } from "@/lib/hashId";
import Link from "next/link";
import HeaderTitle from "@/components/HeaderTitle";
import ModerationBadge from "@/components/ModerationBadge";
import { ShieldAlert } from "lucide-react";
import ModerationContent from "./ModerationContent";
import CopyrightVerificationForm from "@/components/CopyrightVerificationForm";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ comment?: string }>;
}

export default async function ModerationStatusPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { comment: commentParam } = await searchParams;
  const currentUserId = await getAuthUserId();
  if (!currentUserId) notFound();

  const admin = createAdminClient();
  const decodedSlug = decodeURIComponent(slug);

  const { data: post } = await admin
    .from("posts")
    .select("id, title, slug, status, is_nsfw, moderation_reason, moderation_category, moderation_due_at, author_id, removal_reason, removal_decision_id, content_type, copyright_claim_status, copyright_match_id, copyright_similarity")
    .eq("slug", decodedSlug)
    .single();

  if (!post) notFound();
  if (post.author_id !== currentUserId) notFound();

  // 48-hour rule
  if (post.moderation_due_at) {
    const dueAt = new Date(post.moderation_due_at).getTime();
    const hoursSince = (Date.now() - dueAt) / (1000 * 60 * 60);
    if (hoursSince > 48 && post.status === "published" && !post.is_nsfw) {
      redirect(`/${post.slug}`);
    }
  }

  // If comment param, load comment info
  let commentData: any = null;
  if (commentParam) {
    const commentId = decodeId(commentParam) ?? Number(commentParam);
    if (commentId && !isNaN(commentId)) {
      const { data: c } = await admin
        .from("comments")
        .select("id, content, is_nsfw, status, moderation_reason, moderation_category, author_id")
        .eq("id", commentId)
        .single();
      if (c && c.author_id === currentUserId) {
        commentData = c;
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
  if ((post.moderation_category === "kopya_icerik" || post.moderation_category === "copyright") && (post as any).copyright_match_id) {
    const { data: op } = await admin
      .from("posts")
      .select("title, slug, author_id")
      .eq("id", (post as any).copyright_match_id)
      .single();
    if (op) {
      const { data: opProfile } = await admin
        .from("profiles")
        .select("username")
        .eq("user_id", op.author_id)
        .single();
      originalPost = { title: op.title, slug: op.slug, username: opProfile?.username || "bilinmeyen" };
    }
  }

  // Fetch copyright strike count for warning
  let copyrightStrikeCount = 0;
  if (post.moderation_category === "copyright" || post.moderation_category === "kopya_icerik") {
    const { data: authorProfile } = await admin
      .from("profiles")
      .select("copyright_strike_count")
      .eq("user_id", currentUserId)
      .single();
    copyrightStrikeCount = authorProfile?.copyright_strike_count || 0;
  }

  // Fetch copyright claim info if pending verification
  let copyrightClaim: any = null;
  let matchedPostInfo: any = null;
  let matchedVerification: any = null;
  if ((post as any).copyright_claim_status === 'pending_verification') {
    const { data: claim } = await admin
      .from('copyright_claims')
      .select('id, status, matched_post_id, matched_author_id, similarity_percent, proof_description, owner_name, owner_email')
      .eq('post_id', post.id)
      .eq('claimant_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    copyrightClaim = claim;

    if (claim?.matched_post_id) {
      const { data: mp } = await admin
        .from('posts')
        .select('id, title, slug, author_id')
        .eq('id', claim.matched_post_id)
        .single();
      matchedPostInfo = mp;

      // Get matched author username for profile link
      if (mp?.author_id) {
        const { data: matchedProfile } = await admin
          .from('profiles')
          .select('username')
          .eq('user_id', mp.author_id)
          .single();
        if (matchedProfile) matchedPostInfo.username = matchedProfile.username;
      }

      // Check if matched post has a verified owner
      const { data: ver } = await admin
        .from('copyright_verifications')
        .select('owner_name, company_name')
        .eq('post_id', claim.matched_post_id)
        .single();
      matchedVerification = ver;
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
  const contentTypeLabel = post.content_type === "moment" ? "moment" : post.content_type === "video" ? "video" : "gönderi";

  // Comment moderation view
  if (commentData) {
    const isCommentReview = commentData.is_nsfw;
    const isCommentRejected = commentData.status === "rejected" || commentData.status === "removed";
    const variant = isCommentReview ? "review" : isCommentRejected ? "rejected" : "approved";
    const badgeLabel = isCommentReview ? "Yorumunuz inceleniyor" : isCommentRejected ? "Yorum kaldırıldı" : "Yorum yayında";

    return (
      <>
        <HeaderTitle title="Moderasyon" />
        <div className="min-h-screen pb-20">
          <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
            <div className="bg-bg-secondary rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className={
                  isCommentReview ? "text-[var(--accent-color)]" :
                  isCommentRejected ? "text-error" : "text-success"
                } />
                <h2 className="text-base font-semibold">Moderasyon Durumu</h2>
              </div>
              <ModerationBadge label={badgeLabel} variant={variant} />
              {isCommentReview && (
                <p className="text-sm text-text-muted">
                  İnceleme tamamlanana kadar yorumunuz sadece size görünür.
                </p>
              )}
              {!isCommentReview && !isCommentRejected && (
                <p className="text-sm text-text-muted">
                  Moderasyon ekibimiz tarafından incelendi ve içeriğin erişimi açıldı.
                </p>
              )}
              <div className="border border-border-primary rounded-lg p-3">
                <p className="text-sm text-text-muted line-clamp-3">{commentData.content}</p>
              </div>
              {!isCommentReview && !isCommentRejected && (
                <a href="/help/moderation" target="_blank" rel="noopener noreferrer" className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full">
                  Daha Fazla Bilgi Al
                </a>
              )}
              {(isCommentReview || isCommentRejected) && commentData.moderation_reason && (
                <div className={`${isCommentReview ? "bg-[var(--accent-color)]/5" : "bg-error/5"} rounded-lg p-3`}>
                  <p className={`text-xs font-medium ${isCommentReview ? "text-[var(--accent-color)]" : "text-error"}`}>Neden</p>
                  <p className="text-sm text-text-primary mt-0.5">{commentData.moderation_reason}</p>
                  <p className="text-[0.65rem] text-text-muted mt-1.5">
                    {isCommentReview ? "Feedim AI tarafından oluşturuldu" : "İçerik moderasyon ekibimiz tarafından kontrol edildi"}
                  </p>
                </div>
              )}
              {isCommentRejected && (
                <ModerationContent decisionCode={commentDecisionCode} />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Post moderation view
  return (
    <>
      <HeaderTitle title="Moderasyon" />
      <div className="min-h-screen pb-20">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="bg-bg-secondary rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className={isRemoved ? "text-error" : isUnderReview ? "text-[var(--accent-color)]" : "text-success"} />
              <h2 className="text-base font-semibold">Moderasyon Durumu</h2>
            </div>

            {isUnderReview && post.moderation_category !== 'kopya_icerik' && <ModerationBadge label="İçeriğiniz inceleniyor" variant="review" />}
            {isRemoved && <ModerationBadge label="İçerik kaldırıldı" variant="rejected" />}
            {isPublished && <ModerationBadge label="İçerik yayında" variant="approved" />}

            {post.moderation_category !== 'kopya_icerik' && (
            <div className="border border-border-primary rounded-lg p-3">
              <p className="text-sm font-medium">{post.title}</p>
            </div>
            )}

            {isPublished && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  Moderasyon ekibimiz tarafından incelendi ve içeriğin erişimi açıldı.
                </p>
                {approvedDecisionCode && (
                  <ModerationContent decisionCode={approvedDecisionCode} />
                )}
                {!approvedDecisionCode && (
                  <a href="/help/moderation" target="_blank" rel="noopener noreferrer" className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full">
                    Daha Fazla Bilgi Al
                  </a>
                )}
              </div>
            )}

            {isUnderReview && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  İnceleme tamamlanana kadar bu {contentTypeLabel} sadece size görünür. Moderatörlerimiz en kısa sürede inceleyecek.
                </p>
                {post.moderation_category && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                      {post.moderation_category === 'kopya_icerik' ? 'Kopya İçerik' : post.moderation_category === 'copyright' ? 'Telif Hakkı' : post.moderation_category === 'copyright_protected' ? 'Kopya İçerik' : post.moderation_category}
                    </span>
                  </div>
                )}
                {(post.moderation_category === 'kopya_icerik' || post.moderation_category === 'copyright') && (
                  <p className="text-sm text-text-primary font-semibold">
                    &ldquo;{post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title}&rdquo; adlı içeriğiniz için uyarı
                  </p>
                )}
                {post.moderation_reason && (
                  <div className="bg-[var(--accent-color)]/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-[var(--accent-color)]">Neden</p>
                    <p className="text-sm text-text-primary mt-0.5">{post.moderation_reason}</p>
                    <p className="text-[0.65rem] text-text-muted mt-1.5">Feedim AI tarafından oluşturuldu</p>
                  </div>
                )}
                {originalPost && (post.moderation_category === 'kopya_icerik' || post.moderation_category === 'copyright') && (
                  <a href={`/${originalPost.slug}`} target="_blank" rel="noopener noreferrer" className="t-btn accept flex items-center justify-center w-full">
                    Eşleşen içeriği görüntüle
                  </a>
                )}
                {(post as any).copyright_claim_status === 'pending_verification' && copyrightClaim && (
                  copyrightClaim.proof_description ? (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Telif hakkı talebiniz iletildi.</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        Moderatörlerimiz tarafından inceleniyor. Sonuç hakkında bildirim alacaksınız.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="mb-3">
                        <p className="text-sm font-medium">Doğrulama Gerekli</p>
                        <p className="text-sm text-text-muted mt-0.5">
                          İçeriğiniz mevcut bir telif hakkı korumalı içerikle eşleşti.
                          İçeriğin size ait olduğunu doğrulamak için aşağıdaki formu doldurun.
                        </p>
                      </div>
                      <CopyrightVerificationForm
                        postId={post.id}
                        matchedAuthor={matchedPostInfo?.username}
                        matchedCompany={matchedVerification?.company_name || matchedVerification?.owner_name}
                        similarity={copyrightClaim.similarity_percent}
                      />
                    </div>
                  )
                )}
              </div>
            )}

            {(post.moderation_category === 'copyright' || post.moderation_category === 'kopya_icerik') && copyrightStrikeCount > 0 && (
              <div className="bg-error/5 border border-error/20 rounded-lg p-3">
                <p className="text-xs font-medium text-error">Telif Hakkı Uyarısı</p>
                <p className="text-sm text-text-primary mt-0.5">
                  Şu ana kadar <span className="font-semibold">{copyrightStrikeCount}</span> telif hakkı ihlaliniz bulunmaktadır.
                  10 adet telif hakkı ihlalinde hesabınız kalıcı olarak silinir.
                </p>
              </div>
            )}

            {isRemoved && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  Bu {contentTypeLabel} moderatörler tarafından incelendi ve topluluk kurallarına aykırı bulunarak kaldırıldı.
                </p>
                {(post.removal_reason || post.moderation_reason) && (
                  <div className="bg-error/5 rounded-lg p-3">
                    <p className="text-xs font-medium text-error">Sebep</p>
                    <p className="text-sm text-text-primary mt-0.5 font-semibold">{post.removal_reason || post.moderation_reason}</p>
                    <p className="text-[0.65rem] text-text-muted mt-1.5">İçerik moderasyon ekibimiz tarafından kontrol edildi</p>
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
