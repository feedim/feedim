import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  analyzeHtmlContent,
  calculatePostQualityScore,
  calculatePostSpamScore,
  type PostData,
  type PostScoreInputs,
} from "@/lib/postScore";
import { MAX_READ_DURATION } from "@/lib/constants";
import { getTranslations } from "next-intl/server";

import { verifyCronSecret } from "@/lib/cronAuth";

interface CronPostRow extends Omit<PostData, "published_at"> {
  content: string | null;
  quality_score: number | null;
  spam_score: number | null;
  published_at: string;
}

interface TagIdRow {
  tag_id: number;
}

interface PostViewRow {
  viewer_id: string | null;
  read_duration: number | null;
  read_percentage: number | null;
  is_premium_viewer: boolean | null;
  ip_address: string | null;
}

interface CommentRow {
  author_id: string;
  parent_id: number | null;
  content: string | null;
}

interface GiftRow {
  sender_id: string | null;
}

interface ReportRow {
  id: number;
  status: string | null;
}

interface ModerationDecisionRow {
  decision: string | null;
  moderator_id: string | null;
}

interface UserIdRow {
  user_id: string;
}

interface AuthorProfileRow {
  profile_score: number | null;
  is_verified: boolean | null;
  spam_score: number | null;
  language: string | null;
}

interface QualityScoreRow {
  quality_score: number | null;
}

interface WatchEventRow {
  duration: number | null;
  percentage: number | null;
}

interface PostIdRow {
  post_id: number;
}

interface AuthorIdRow {
  author_id: string;
}

interface ViewerProfileRow {
  profile_score: number | null;
  created_at: string | null;
  last_active_at: string | null;
}

interface LikerProfileRow {
  user_id: string;
  profile_score: number | null;
  language: string | null;
}

function emptyDataResult<T>(): { data: T[] } {
  return { data: [] };
}

export async function GET(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const postCols = "id, author_id, content, word_count, status, is_nsfw, is_for_kids, featured_image, source_links, like_count, comment_count, save_count, share_count, view_count, unique_view_count, premium_view_count, total_coins_earned, allow_comments, published_at, quality_score, spam_score, content_type, video_duration, reading_time";

    // Son 7 gün yayınlanmış yazılar (sık yeniden puanlama)
    const { data: recentPosts } = await admin
      .from("posts")
      .select(postCols)
      .eq("status", "published")
      .gte("published_at", sevenDaysAgo)
      .order("published_at", { ascending: false })
      .limit(300);

    const remaining = 500 - (recentPosts?.length || 0);

    // Henüz puanlanmamış eski yazılar (quality_score = 0)
    const { data: unscoredPosts } = remaining > 0
      ? await admin
          .from("posts")
          .select(postCols)
          .eq("status", "published")
          .lt("published_at", sevenDaysAgo)
          .gte("published_at", thirtyDaysAgo)
          .eq("quality_score", 0)
          .order("published_at", { ascending: false })
          .limit(remaining)
      : emptyDataResult<CronPostRow>();

    const allPosts: CronPostRow[] = [...((recentPosts || []) as CronPostRow[]), ...((unscoredPosts || []) as CronPostRow[])];

    if (allPosts.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const scoreResults: { id: number; qualityScore: number; spamScore: number }[] = [];

    // 50'şer gruplarda işle
    for (let i = 0; i < allPosts.length; i += 50) {
      const batch = allPosts.slice(i, i + 50);

      const batchResults = await Promise.all(
        batch.map(async (post) => {
          const postId = post.id;
          const contentType = post.content_type || 'post';
          const isVideoContent = contentType === 'video' || contentType === 'moment';
          const publishedAt = post.published_at;
          const twentyFourHoursAfterPublish = new Date(
            new Date(publishedAt).getTime() + 24 * 60 * 60 * 1000
          ).toISOString();

          // ═══ PHASE 1: Paralel sorgular ═══
          const [
            tagCountData,     // 1
            viewsData,        // 2
            commentsData,     // 3
            giftsData,        // 4
            reportsData,      // 5 — status dahil
            moderationData,   // 6 — moderation_decisions
            likesData,        // 7
            bookmarksData,    // 8
            authorData,       // 9 — language dahil
            authorPostsData,  // 10
            watchEventsData,  // 11 — video analytics (video/moment)
            authorLikedAfter, // 12 — karşılıklı etkileşim tespiti
          ] = await Promise.all([
            // 1. Etiket sayısı
            admin.from("post_tags").select("tag_id", { count: "exact", head: true })
              .eq("post_id", postId),
            // 2. Görüntüleme detayları (okuma süresi, yüzde, IP, premium)
            admin.from("post_views")
              .select("viewer_id, read_duration, read_percentage, is_premium_viewer, ip_address")
              .eq("post_id", postId).limit(500),
            // 3. Yorumlar (organik analiz + tartışma + kalite)
            admin.from("comments").select("author_id, parent_id, content")
              .eq("post_id", postId).eq("status", "approved").limit(500),
            // 4. Hediyeler
            admin.from("gifts").select("sender_id")
              .eq("post_id", postId),
            // 5. Şikayetler — status dahil (in-memory filtreleme)
            admin.from("reports").select("id, status")
              .eq("content_id", postId).eq("content_type", "post"),
            // 6. Moderasyon kararları (decision, moderator_id)
            admin.from("moderation_decisions").select("decision, moderator_id")
              .eq("target_type", "post").eq("target_id", String(postId))
              .limit(10),
            // 7. Beğeniler (quick liker tespiti için user_id)
            admin.from("likes").select("user_id")
              .eq("post_id", postId).limit(500),
            // 8. Kaydetmeler (quick saver tespiti için user_id)
            admin.from("bookmarks").select("user_id")
              .eq("post_id", postId).limit(500),
            // 9. Yazar profili — language dahil
            admin.from("profiles")
              .select("profile_score, is_verified, spam_score, language")
              .eq("user_id", post.author_id).single(),
            // 10. Yazarın diğer yazılarının quality_score ortalaması (tutarlılık)
            admin.from("posts")
              .select("quality_score")
              .eq("author_id", post.author_id).eq("status", "published")
              .neq("id", postId)
              .gt("quality_score", 0)
              .order("published_at", { ascending: false }).limit(20),
            // 11. Video/moment izlenme verileri (analytics_events)
            isVideoContent
              ? admin.from("analytics_events")
                  .select("duration, percentage")
                  .eq("post_id", postId).eq("event_type", "video_watch")
                  .limit(500)
              : Promise.resolve(emptyDataResult<WatchEventRow>()),
            // 12. Yazarın bu postu paylaştıktan sonra 24s içinde beğendiği postlar
            admin.from("likes").select("post_id")
              .eq("user_id", post.author_id)
              .gte("created_at", publishedAt)
              .lte("created_at", twentyFourHoursAfterPublish)
              .limit(100),
          ]);

          // ═══ Phase 1 Sonuçlarını İşle ═══

          // İçerik yapısı analizi (HTML)
          const contentAnalysis = analyzeHtmlContent(post.content || "");

          // Görüntüleme verisi → okuma kalitesi + ziyaretçi haritası
          const views = (viewsData.data || []) as PostViewRow[];
          const viewerMap = new Map<string, { readDuration: number; readPercentage: number }>();
          for (const v of views) {
            if (v.viewer_id) {
              viewerMap.set(v.viewer_id, {
                readDuration: v.read_duration || 0,
                readPercentage: v.read_percentage || 0,
              });
            }
          }

          // Okuma kalitesi metrikleri
          const viewsWithDuration = views.filter((view) => (view.read_duration || 0) > 0 && (view.read_duration || 0) <= MAX_READ_DURATION);
          const avgReadDuration = viewsWithDuration.length > 0
            ? viewsWithDuration.reduce((sum, view) => sum + (view.read_duration || 0), 0) / viewsWithDuration.length
            : 0;
          const viewsWithPercentage = views.filter((view) => (view.read_percentage || 0) > 0);
          const avgReadPercentage = viewsWithPercentage.length > 0
            ? viewsWithPercentage.reduce((sum, view) => sum + (view.read_percentage || 0), 0) / viewsWithPercentage.length
            : 0;
          // Content-type aware qualified read thresholds
          const qrDurationThreshold = contentType === 'note' ? 5 : contentType === 'moment' ? 8 : contentType === 'video' ? 15 : 30;
          const qrPercentageThreshold = contentType === 'note' ? 50 : 40;
          const qualifiedReadCount = views.filter((view) =>
            (view.read_duration || 0) >= qrDurationThreshold && (view.read_percentage || 0) >= qrPercentageThreshold
          ).length;

          // Bounce rate (hemen çıkma: read_duration < 5 VE read_percentage < 5)
          const bounceViewers = views.filter((view) =>
            (view.read_duration || 0) < 5 && (view.read_percentage || 0) < 5
          ).length;
          const bounceRate = views.length > 0 ? bounceViewers / views.length : 0;

          // Video/moment izlenme metrikleri
          let avgWatchDuration = 0;
          let avgWatchPercentage = 0;
          let completionRate = 0;
          if (isVideoContent) {
            const watchEvents = (watchEventsData.data || []) as WatchEventRow[];
            if (watchEvents.length > 0) {
              avgWatchDuration = watchEvents.reduce((sum, event) => sum + (event.duration || 0), 0) / watchEvents.length;
              const eventsWithPct = watchEvents.filter((event) => (event.percentage || 0) > 0);
              avgWatchPercentage = eventsWithPct.length > 0
                ? eventsWithPct.reduce((sum, event) => sum + (event.percentage || 0), 0) / eventsWithPct.length
                : 0;
              // Tamamlama: yüzde >= 90 olan izlemeler
              const completedCount = watchEvents.filter((event) => (event.percentage || 0) >= 90).length;
              completionRate = completedCount / watchEvents.length;
            }
          }

          // Yorum analizi — organik yorumcular + tartışma derinliği + kalite
          const comments = (commentsData.data || []) as CommentRow[];
          const nonAuthorCommenters = new Set(
            comments.filter((comment) => comment.author_id !== post.author_id).map((comment) => comment.author_id)
          );
          const uniqueCommentersCount = nonAuthorCommenters.size;
          const replyCount = comments.filter((comment) => Boolean(comment.parent_id)).length;

          // Yorum kalite analizi
          const nonAuthorComments = comments.filter((comment) => comment.author_id !== post.author_id);
          const qualityCommentCount = nonAuthorComments.filter((comment) => {
            const words = (comment.content || "").trim().split(/\s+/).length;
            return words >= 20;
          }).length;
          const shortComments = nonAuthorComments.filter((comment) => {
            const words = (comment.content || "").trim().split(/\s+/).length;
            return words < 5;
          }).length;
          const shortCommentRatio = nonAuthorComments.length > 0 ? shortComments / nonAuthorComments.length : 0;

          // Yazar tutarlılık (diğer yazılarının ort quality_score)
          const authorOtherPosts = (authorPostsData.data || []) as QualityScoreRow[];
          const authorAvgQualityScore = authorOtherPosts.length > 0
            ? authorOtherPosts.reduce((sum, authorPost) => sum + (authorPost.quality_score || 0), 0) / authorOtherPosts.length
            : 0;
          const authorPublishedCount = authorOtherPosts.length;

          // Hediye analizi
          const gifts = (giftsData.data || []) as GiftRow[];
          const giftCount = gifts.length;
          const giftSenders = new Set(gifts.map((gift) => gift.sender_id).filter(Boolean));
          const giftDiversity = giftSenders.size;

          // Rapor analizi — ham ve kesinleşmiş ayrımı
          const allReports = (reportsData.data || []) as ReportRow[];
          const reportCount = allReports.length;
          const confirmedReportCount = allReports.filter((report) => report.status === 'resolved').length;

          // Moderasyon kararları — insan vs AI ayrımı
          const modDecisions = (moderationData.data || []) as ModerationDecisionRow[];
          const humanRemovedDecision = modDecisions.some(
            (decision) => decision.decision === 'remove' && decision.moderator_id && decision.moderator_id !== 'system'
          );
          const aiFlagged = modDecisions.some(
            (decision) => decision.moderator_id === 'system'
          ) || ((post.spam_score || 0) > 0 && (post.quality_score || 0) === 0);

          // ═══ Okumadan Etkileşim Tespiti (Quick Engagement) ═══

          // İçerik tipine göre quick engagement eşiği
          const quickThreshold = contentType === 'note' ? 3
            : contentType === 'moment' ? 3
            : contentType === 'video' ? 5
            : 10;

          // Beğenenlerin okuma süresi kontrolü
          const likerIds = ((likesData.data || []) as UserIdRow[]).map((like) => like.user_id).filter(Boolean);
          let quickLikers = 0;
          for (const likerId of likerIds) {
            const view = viewerMap.get(likerId);
            if (!view || view.readDuration < quickThreshold) quickLikers++;
          }
          const quickLikerRatio = likerIds.length > 0 ? quickLikers / likerIds.length : 0;

          // Kaydedenlerin okuma süresi kontrolü
          const saverIds = ((bookmarksData.data || []) as UserIdRow[]).map((bookmark) => bookmark.user_id).filter(Boolean);
          let quickSavers = 0;
          for (const saverId of saverIds) {
            const view = viewerMap.get(saverId);
            if (!view || view.readDuration < quickThreshold) quickSavers++;
          }
          const quickSaverRatio = saverIds.length > 0 ? quickSavers / saverIds.length : 0;

          // Premium izleyici oranı
          const premiumViewers = views.filter((view) => view.is_premium_viewer).length;
          const premiumViewerRatio = views.length > 0 ? premiumViewers / views.length : 0;

          // Aynı IP kümesi tespiti (3+ görüntüleme aynı IP'den)
          const ipMap = new Map<string, number>();
          for (const v of views) {
            const ip = v.ip_address;
            if (ip) ipMap.set(ip, (ipMap.get(ip) || 0) + 1);
          }
          let sameIpViewers = 0;
          for (const count of ipMap.values()) {
            if (count >= 3) sameIpViewers += count;
          }
          const sameIpClusterRatio = views.length > 0 ? sameIpViewers / views.length : 0;

          // Yazar verisi
          const author = authorData.data as AuthorProfileRow | null;
          const authorLanguage = author?.language || 'tr';

          // ═══ Karşılıklı Etkileşim Tespiti ═══
          // Yazarın bu postu paylaştıktan sonra beğendiği postların yazarlarını bul
          const likedPostIds = ((authorLikedAfter.data || []) as PostIdRow[]).map((like) => like.post_id).filter(Boolean);
          let authorLikedSet = new Set<string>();
          if (likedPostIds.length > 0) {
            const { data: likedAuthors } = await admin
              .from("posts")
              .select("author_id")
              .in("id", likedPostIds.slice(0, 100));
            authorLikedSet = new Set(((likedAuthors || []) as AuthorIdRow[]).map((likedPost) => likedPost.author_id));
          }
          const reciprocalLikers = likerIds.filter(id => authorLikedSet.has(id));
          const reciprocalEngagementRatio = likerIds.length > 0
            ? reciprocalLikers.length / likerIds.length : 0;

          // ═══ PHASE 2: Ziyaretçi + Beğenen profilleri (Phase 1 viewer/liker ID'lerine bağlı) ═══

          const uniqueViewerIds = [...new Set(
            views
              .map((view) => view.viewer_id)
              .filter((id): id is string => Boolean(id && id !== post.author_id))
          )];

          let avgVisitorProfileScore = 0;
          let avgVisitorAccountAgeDays = 0;
          let activeVisitorRatio = 0;
          let newAccountViewerRatio = 0;

          // Beğenen kalite metrikleri
          let avgLikerProfileScore = 0;
          let highScoreLikerRatio = 0;
          let likerLanguageDiversity = 0;
          let likerLanguageMismatchRatio = 0;

          // Phase 2 paralel sorgular
          const [viewerProfilesResult, likerProfilesResult] = await Promise.all([
            // Ziyaretçi profilleri
            uniqueViewerIds.length > 0
              ? admin.from("profiles")
                  .select("profile_score, created_at, last_active_at")
                  .in("user_id", uniqueViewerIds.slice(0, 200))
              : Promise.resolve(emptyDataResult<ViewerProfileRow>()),
            // Beğenen profilleri (profile_score + language)
            likerIds.length > 0
              ? admin.from("profiles")
                  .select("user_id, profile_score, language")
                  .in("user_id", likerIds.slice(0, 200))
              : Promise.resolve(emptyDataResult<LikerProfileRow>()),
          ]);

          // Ziyaretçi profil analizi
          const vp = (viewerProfilesResult.data || []) as ViewerProfileRow[];
          if (vp.length > 0) {
            avgVisitorProfileScore = vp.reduce((sum, profile) => sum + (profile.profile_score || 0), 0) / vp.length;

            const ages = vp
              .filter((profile) => Boolean(profile.created_at))
              .map((profile) => (now - new Date(profile.created_at as string).getTime()) / (1000 * 60 * 60 * 24));
            avgVisitorAccountAgeDays = ages.reduce((a, b) => a + b, 0) / ages.length;

            const activeCount = vp.filter((profile) => {
              if (!profile.last_active_at) return false;
              return new Date(profile.last_active_at).getTime() >= new Date(thirtyDaysAgo).getTime();
            }).length;
            activeVisitorRatio = activeCount / vp.length;

            const newAccountCount = ages.filter(a => a < 7).length;
            newAccountViewerRatio = newAccountCount / vp.length;
          }

          // Beğenen profil analizi
          const lp = (likerProfilesResult.data || []) as LikerProfileRow[];
          if (lp.length > 0) {
            // Ortalama beğenen profil puanı
            avgLikerProfileScore = lp.reduce((sum, profile) => sum + (profile.profile_score || 0), 0) / lp.length;

            // Yüksek puanlı beğenen oranı (profile_score >= 40)
            const highScoreLikers = lp.filter((profile) => (profile.profile_score || 0) >= 40).length;
            highScoreLikerRatio = highScoreLikers / lp.length;

            // Dil çeşitliliği
            const likerLanguages = new Set(lp.map((profile) => profile.language || 'tr').filter(Boolean));
            likerLanguageDiversity = likerLanguages.size;

            // Yazar dili ile uyumsuz beğenen oranı
            const mismatchLikers = lp.filter((profile) => (profile.language || 'tr') !== authorLanguage).length;
            likerLanguageMismatchRatio = mismatchLikers / lp.length;
          }

          // ═══ Skor hesaplama ═══

          const postData: PostData = {
            id: post.id,
            author_id: post.author_id,
            word_count: post.word_count || 0,
            status: post.status,
            is_nsfw: post.is_nsfw || false,
            is_for_kids: post.is_for_kids || false,
            featured_image: post.featured_image,
            source_links: post.source_links || [],
            like_count: post.like_count || 0,
            comment_count: post.comment_count || 0,
            save_count: post.save_count || 0,
            share_count: post.share_count || 0,
            view_count: post.view_count || 0,
            unique_view_count: post.unique_view_count || 0,
            premium_view_count: post.premium_view_count || 0,
            total_coins_earned: post.total_coins_earned || 0,
            allow_comments: post.allow_comments ?? true,
            published_at: post.published_at,
            content_type: contentType,
            video_duration: post.video_duration || 0,
            reading_time: post.reading_time || 0,
          };

          const inputs: PostScoreInputs = {
            post: postData,
            imageCount: contentAnalysis.imageCount,
            headingCount: contentAnalysis.headingCount,
            tagCount: tagCountData.count ?? 0,
            hasBlockquote: contentAnalysis.hasBlockquote,
            hasList: contentAnalysis.hasList,
            hasTable: contentAnalysis.hasTable,
            avgReadDuration,
            avgReadPercentage,
            qualifiedReadCount,
            avgWatchDuration,
            avgWatchPercentage,
            completionRate,
            uniqueCommentersCount,
            replyCount,
            avgVisitorProfileScore,
            avgVisitorAccountAgeDays,
            activeVisitorRatio,
            premiumViewerRatio,
            newAccountViewerRatio,
            avgLikerProfileScore,
            highScoreLikerRatio,
            likerLanguageDiversity,
            likerLanguageMismatchRatio,
            quickLikerRatio,
            quickSaverRatio,
            authorProfileScore: author?.profile_score ?? 0,
            authorIsVerified: author?.is_verified ?? false,
            authorSpamScore: author?.spam_score ?? 0,
            giftCount,
            giftDiversity,
            reportCount,
            confirmedReportCount,
            humanRemovedDecision,
            aiFlagged,
            sameIpClusterRatio,
            bounceRate,
            authorAvgQualityScore,
            authorPublishedCount,
            qualityCommentCount,
            shortCommentRatio,
            reciprocalEngagementRatio,
          };

          const qualityScore = calculatePostQualityScore(inputs);
          const spamScore = calculatePostSpamScore(inputs);

          return { id: postId, qualityScore, spamScore };
        })
      );

      scoreResults.push(...batchResults);
    }

    // Toplu güncelleme (100'lük gruplar)
    let updatedCount = 0;
    for (let i = 0; i < scoreResults.length; i += 100) {
      const batch = scoreResults.slice(i, i + 100);
      const promises = batch.map((r) =>
        admin.from("posts").update({
          quality_score: r.qualityScore,
          spam_score: r.spamScore,
        }).eq("id", r.id)
      );
      await Promise.all(promises);
      updatedCount += batch.length;
    }

    return NextResponse.json({ updated: updatedCount });
  } catch (e) {
    const tCatch = await getTranslations("apiErrors");
    return NextResponse.json({ error: tCatch("serverError") }, { status: 500 });
  }
}
