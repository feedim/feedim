import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  analyzeHtmlContent,
  calculatePostQualityScore,
  calculatePostSpamScore,
  type PostData,
  type PostScoreInputs,
} from "@/lib/postScore";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const postCols = "id, author_id, content, word_count, status, is_nsfw, is_for_kids, featured_image, source_links, like_count, comment_count, save_count, share_count, view_count, unique_view_count, premium_view_count, total_coins_earned, allow_comments, published_at, quality_score, spam_score";

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
      : { data: [] as any[] };

    const allPosts = [...(recentPosts || []), ...(unscoredPosts || [])];

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

          // ═══ PHASE 1: 9 paralel sorgu ═══
          const [
            tagCountData,     // 1
            viewsData,        // 2
            commentsData,     // 3
            giftsData,        // 4
            reportsData,      // 5
            moderationData,   // 6
            likesData,        // 7
            bookmarksData,    // 8
            authorData,       // 9
            authorPostsData,  // 10
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
            // 5. Şikayetler
            admin.from("reports").select("id", { count: "exact", head: true })
              .eq("content_id", postId).eq("content_type", "post"),
            // 6. Moderasyon geçmişi (yazı daha önce moderasyona alındı mı)
            admin.from("moderation_logs").select("action")
              .eq("target_type", "post").eq("target_id", String(postId))
              .limit(5),
            // 7. Beğeniler (quick liker tespiti için user_id)
            admin.from("likes").select("user_id")
              .eq("post_id", postId).limit(500),
            // 8. Kaydetmeler (quick saver tespiti için user_id)
            admin.from("bookmarks").select("user_id")
              .eq("post_id", postId).limit(500),
            // 9. Yazar profili
            admin.from("profiles")
              .select("profile_score, is_verified, spam_score")
              .eq("user_id", post.author_id).single(),
            // 10. Yazarın diğer yazılarının quality_score ortalaması (tutarlılık)
            admin.from("posts")
              .select("quality_score")
              .eq("author_id", post.author_id).eq("status", "published")
              .neq("id", postId)
              .gt("quality_score", 0)
              .order("published_at", { ascending: false }).limit(20),
          ]);

          // ═══ Phase 1 Sonuçlarını İşle ═══

          // İçerik yapısı analizi (HTML)
          const contentAnalysis = analyzeHtmlContent(post.content || "");

          // Görüntüleme verisi → okuma kalitesi + ziyaretçi haritası
          const views = viewsData.data || [];
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
          const viewsWithDuration = views.filter((v: any) => v.read_duration > 0);
          const avgReadDuration = viewsWithDuration.length > 0
            ? viewsWithDuration.reduce((a: number, v: any) => a + (v.read_duration || 0), 0) / viewsWithDuration.length
            : 0;
          const viewsWithPercentage = views.filter((v: any) => v.read_percentage > 0);
          const avgReadPercentage = viewsWithPercentage.length > 0
            ? viewsWithPercentage.reduce((a: number, v: any) => a + (v.read_percentage || 0), 0) / viewsWithPercentage.length
            : 0;
          const qualifiedReadCount = views.filter((v: any) =>
            (v.read_duration || 0) >= 30 && (v.read_percentage || 0) >= 40
          ).length;

          // Bounce rate (hemen çıkma: read_duration < 5 VE read_percentage < 5)
          const bounceViewers = views.filter((v: any) =>
            (v.read_duration || 0) < 5 && (v.read_percentage || 0) < 5
          ).length;
          const bounceRate = views.length > 0 ? bounceViewers / views.length : 0;

          // Yorum analizi — organik yorumcular + tartışma derinliği + kalite
          const comments = commentsData.data || [];
          const nonAuthorCommenters = new Set(
            comments.filter((c: any) => c.author_id !== post.author_id).map((c: any) => c.author_id)
          );
          const uniqueCommentersCount = nonAuthorCommenters.size;
          const replyCount = comments.filter((c: any) => c.parent_id).length;

          // Yorum kalite analizi
          const nonAuthorComments = comments.filter((c: any) => c.author_id !== post.author_id);
          const qualityCommentCount = nonAuthorComments.filter((c: any) => {
            const words = ((c.content || "") as string).trim().split(/\s+/).length;
            return words >= 20;
          }).length;
          const shortComments = nonAuthorComments.filter((c: any) => {
            const words = ((c.content || "") as string).trim().split(/\s+/).length;
            return words < 5;
          }).length;
          const shortCommentRatio = nonAuthorComments.length > 0 ? shortComments / nonAuthorComments.length : 0;

          // Yazar tutarlılık (diğer yazılarının ort quality_score)
          const authorOtherPosts = authorPostsData.data || [];
          const authorAvgQualityScore = authorOtherPosts.length > 0
            ? authorOtherPosts.reduce((a: number, p: any) => a + (p.quality_score || 0), 0) / authorOtherPosts.length
            : 0;
          const authorPublishedCount = authorOtherPosts.length;

          // Hediye analizi
          const gifts = giftsData.data || [];
          const giftCount = gifts.length;
          const giftSenders = new Set(gifts.map((g: any) => g.sender_id).filter(Boolean));
          const giftDiversity = giftSenders.size;

          // Moderasyon geçmişi
          const modActions = moderationData.data || [];
          const wasInModeration = modActions.length > 0;
          // AI flag tespiti: yazı yayınlanırken spam_score > 0 atanmış ama quality_score henüz hesaplanmamış
          const aiFlagged = (post.spam_score || 0) > 0 && (post.quality_score || 0) === 0;

          // ═══ Okumadan Etkileşim Tespiti (Quick Engagement) ═══

          // Beğenenlerin okuma süresi kontrolü
          const likerIds = (likesData.data || []).map((l: any) => l.user_id).filter(Boolean);
          let quickLikers = 0;
          for (const likerId of likerIds) {
            const view = viewerMap.get(likerId);
            // View kaydı yok veya okuma süresi < 10s → okumadan beğenmiş
            if (!view || view.readDuration < 10) quickLikers++;
          }
          const quickLikerRatio = likerIds.length > 0 ? quickLikers / likerIds.length : 0;

          // Kaydedenlerin okuma süresi kontrolü
          const saverIds = (bookmarksData.data || []).map((b: any) => b.user_id).filter(Boolean);
          let quickSavers = 0;
          for (const saverId of saverIds) {
            const view = viewerMap.get(saverId);
            if (!view || view.readDuration < 10) quickSavers++;
          }
          const quickSaverRatio = saverIds.length > 0 ? quickSavers / saverIds.length : 0;

          // Premium izleyici oranı
          const premiumViewers = views.filter((v: any) => v.is_premium_viewer).length;
          const premiumViewerRatio = views.length > 0 ? premiumViewers / views.length : 0;

          // Aynı IP kümesi tespiti (3+ görüntüleme aynı IP'den)
          const ipMap = new Map<string, number>();
          for (const v of views) {
            const ip = (v as any).ip_address;
            if (ip) ipMap.set(ip, (ipMap.get(ip) || 0) + 1);
          }
          let sameIpViewers = 0;
          for (const count of ipMap.values()) {
            if (count >= 3) sameIpViewers += count;
          }
          const sameIpClusterRatio = views.length > 0 ? sameIpViewers / views.length : 0;

          // Yazar verisi
          const author = authorData.data;

          // ═══ PHASE 2: Ziyaretçi profilleri (Phase 1 viewer ID'lerine bağlı) ═══

          const uniqueViewerIds = [...new Set(
            views.map((v: any) => v.viewer_id).filter((id: any) => id && id !== post.author_id)
          )] as string[];

          let avgVisitorProfileScore = 0;
          let avgVisitorAccountAgeDays = 0;
          let activeVisitorRatio = 0;
          let newAccountViewerRatio = 0;

          if (uniqueViewerIds.length > 0) {
            const { data: viewerProfiles } = await admin
              .from("profiles")
              .select("profile_score, created_at, last_active_at")
              .in("user_id", uniqueViewerIds.slice(0, 200));

            const vp = viewerProfiles || [];
            if (vp.length > 0) {
              // Ortalama profil puanı
              avgVisitorProfileScore = vp.reduce((a: number, p: any) => a + (p.profile_score || 0), 0) / vp.length;

              // Ortalama hesap yaşı (gün)
              const ages = vp.map((p: any) => (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
              avgVisitorAccountAgeDays = ages.reduce((a, b) => a + b, 0) / ages.length;

              // Aktif ziyaretçi oranı (son 30 günde giriş yapmış)
              const activeCount = vp.filter((p: any) => {
                if (!p.last_active_at) return false;
                return new Date(p.last_active_at).getTime() >= new Date(thirtyDaysAgo).getTime();
              }).length;
              activeVisitorRatio = activeCount / vp.length;

              // Yeni hesap oranı (< 7 gün)
              const newAccountCount = ages.filter(a => a < 7).length;
              newAccountViewerRatio = newAccountCount / vp.length;
            }
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
            uniqueCommentersCount,
            replyCount,
            avgVisitorProfileScore,
            avgVisitorAccountAgeDays,
            activeVisitorRatio,
            premiumViewerRatio,
            newAccountViewerRatio,
            quickLikerRatio,
            quickSaverRatio,
            authorProfileScore: author?.profile_score ?? 0,
            authorIsVerified: author?.is_verified ?? false,
            authorSpamScore: author?.spam_score ?? 0,
            giftCount,
            giftDiversity,
            reportCount: reportsData.count ?? 0,
            wasInModeration,
            aiFlagged,
            sameIpClusterRatio,
            bounceRate,
            authorAvgQualityScore,
            authorPublishedCount,
            qualityCommentCount,
            shortCommentRatio,
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
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
