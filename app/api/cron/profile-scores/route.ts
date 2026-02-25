import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateProfileScore,
  calculateSpamScore,
  checkCopyrightEligibility,
  type ProfileData,
  type ScoreInputs,
  type PostStat,
  type RateLimitHit,
} from "@/lib/profileScore";
import { safeError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const cols = "user_id, role, avatar_url, bio, email_verified, phone_verified, website, birth_date, gender, full_name, account_type, is_verified, is_premium, follower_count, following_count, post_count, status, created_at, shadow_banned, total_earned, total_views_received, last_active_at, copyright_strike_count, copyright_eligible, copyright_revoked_by";
    const { data: users, error: usersError } = await admin
      .from("profiles")
      .select(cols)
      .or(`last_active_at.gte.${twentyFourHoursAgo},spam_score.gt.0`)
      .limit(500);

    if (usersError) {
      return safeError(usersError);
    }

    let targetUsers = users;
    if (!targetUsers || targetUsers.length === 0) {
      const { data: allUsers } = await admin
        .from("profiles")
        .select(cols)
        .neq("status", "deleted")
        .order("last_active_at", { ascending: false })
        .limit(500);
      targetUsers = allUsers || [];
    }

    if (!targetUsers || targetUsers.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const scoreResults: { userId: string; profileScore: number; spamScore: number; copyrightEligible?: boolean; copyrightEligibleSince?: string }[] = [];

    for (let i = 0; i < targetUsers.length; i += 100) {
      const batch = targetUsers.slice(i, i + 100);

      const batchResults = await Promise.all(
        batch.map(async (user) => {
          const userId = user.user_id;

          // Admin always gets max score, zero spam
          if (user.role === 'admin') {
            return { userId, profileScore: 100, spamScore: 0 };
          }

          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

          // ═══ PHASE 1: Parallel queries (26 total) ═══
          const [
            postsByStatus,          // 1
            recentPublished,        // 2
            commentsByStatus,       // 3
            recentComments,         // 4
            blocksReceived,         // 5
            reportsReceived,        // 6
            moderationActions,      // 7
            burstPosts,             // 8
            lastModeration,         // 9
            avgWordCount,           // 10
            postStatsData,          // 11
            qualifiedReads,         // 12
            commentLikes,           // 13
            giftsReceivedData,      // 14
            giftsSent,              // 15
            rateLimitEvents,        // 16
            activeDaysData,         // 17
            followerLossData,       // 18
            userRecentComments,     // 19 — duplicate detection
            massDeleteCount,        // 20
            socialSharesData,       // 21
            totalCommentCount,      // 22
            withdrawalData,         // 23
            followerIdsData,        // 24
            followingIdsData,       // 25
            rejectedNsfwData,       // 26
            likedOtherPostData,     // 31
            savedOtherPostData,     // 32
            commentedOnOtherData,   // 33
            profileVisitData,       // 28
            postAndDeleteData,      // 29
          ] = await Promise.all([
            // 1. Posts grouped by status
            admin.from("posts").select("status")
              .eq("author_id", userId).in("status", ["published", "moderation", "removed"]),
            // 2. Recent published posts (last 30 days)
            admin.from("posts").select("id", { count: "exact", head: true })
              .eq("author_id", userId).eq("status", "published").gte("published_at", thirtyDaysAgo),
            // 3. Comments by status (spam + removed)
            admin.from("comments").select("status")
              .eq("author_id", userId).in("status", ["spam", "removed"]),
            // 4. Recent comments (last 24h)
            admin.from("comments").select("id", { count: "exact", head: true })
              .eq("author_id", userId).gte("created_at", twentyFourHoursAgo),
            // 5. Blocks received
            admin.from("blocks").select("id", { count: "exact", head: true })
              .eq("blocked_id", userId),
            // 6. Reports received
            admin.from("reports").select("id", { count: "exact", head: true })
              .eq("content_author_id", userId).in("status", ["pending", "resolved"]),
            // 7. Moderation actions against user
            admin.from("moderation_logs").select("id", { count: "exact", head: true })
              .eq("target_type", "user").eq("target_id", userId)
              .in("action", ["remove_post", "remove_comment", "ban_user", "warn_user", "mute_user"]),
            // 8. Burst posts (last 1 hour)
            admin.from("posts").select("id", { count: "exact", head: true })
              .eq("author_id", userId).gte("created_at", oneHourAgo),
            // 9. Last moderation event date
            admin.from("moderation_logs").select("created_at")
              .eq("target_type", "user").eq("target_id", userId)
              .in("action", ["remove_post", "remove_comment", "ban_user", "warn_user", "mute_user"])
              .order("created_at", { ascending: false }).limit(1),
            // 10. Average word count
            admin.from("posts").select("word_count")
              .eq("author_id", userId).eq("status", "published")
              .order("created_at", { ascending: false }).limit(20),
            // 11. Post stats (with id + mentions + title + featured_image + content_type + video_thumbnail)
            admin.from("posts")
              .select("id, like_count, comment_count, save_count, share_count, unique_view_count, trending_score, word_count, mentions, title, featured_image, content_type, video_thumbnail")
              .eq("author_id", userId).eq("status", "published")
              .order("created_at", { ascending: false }).limit(50),
            // 12. PLACEHOLDER — qualified reads moved to Phase 2 (needs postIds)
            Promise.resolve({ count: 0 } as any),
            // 13. Comment likes total
            admin.from("comments").select("like_count")
              .eq("author_id", userId).eq("status", "approved"),
            // 14. Gifts received (with sender_id for diversity)
            admin.from("gifts").select("coin_amount, sender_id")
              .eq("receiver_id", userId),
            // 15. Gifts sent
            admin.from("gifts").select("coin_amount")
              .eq("sender_id", userId),
            // 16. Rate limit hits (last 7 days)
            admin.from("security_events").select("metadata")
              .eq("user_id", userId).eq("event_type", "rate_limit_hit")
              .gte("created_at", sevenDaysAgo),
            // 17. Active days (login events, last 30 days)
            admin.from("security_events").select("created_at")
              .eq("user_id", userId).eq("event_type", "login")
              .gte("created_at", thirtyDaysAgo),
            // 18. Follower loss (last 7 days)
            admin.from("follows").select("id", { count: "exact", head: true })
              .eq("following_id", userId).gte("unfollowed_at", sevenDaysAgo),
            // 19. User's recent comments (for duplicate detection)
            admin.from("comments").select("content, post_id")
              .eq("author_id", userId).eq("status", "approved")
              .order("created_at", { ascending: false }).limit(200),
            // 20. Mass post deletion (last 24h)
            admin.from("posts").select("id", { count: "exact", head: true })
              .eq("author_id", userId).eq("status", "deleted")
              .gte("updated_at", twentyFourHoursAgo),
            // 21. Social shares by user
            admin.from("shares").select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            // 22. Total user comment count (for profanity ratio)
            admin.from("comments").select("id", { count: "exact", head: true })
              .eq("author_id", userId),
            // 23. Withdrawal requests (last 90 days)
            admin.from("withdrawal_requests").select("amount, created_at")
              .eq("user_id", userId)
              .gte("created_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())
              .order("created_at", { ascending: false }).limit(20),
            // 24. Follower IDs (sample for mutual + trust)
            admin.from("follows").select("follower_id")
              .eq("following_id", userId).limit(200),
            // 25. Following IDs (sample for mutual)
            admin.from("follows").select("following_id")
              .eq("follower_id", userId).limit(200),
            // 26. Rejected NSFW posts — moderatör tarafından reddedilen NSFW postlar
            admin.from("posts").select("id", { count: "exact", head: true })
              .eq("author_id", userId).eq("status", "removed").eq("is_nsfw", true),
            // 31. Consumer: liked other posts
            admin.from("likes").select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            // 32. Consumer: saved other posts (bookmarks tablosu)
            admin.from("bookmarks").select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            // 33. PLACEHOLDER — commented on other posts calculated from existing data
            Promise.resolve({ count: 0 } as any),
            // 28. Profile visits (son 30 gün — farklı ziyaretçiler)
            admin.from("profile_visits").select("visitor_id")
              .eq("visited_id", userId).gte("created_at", thirtyDaysAgo).limit(500),
            // 29. Post-and-delete: yayınlanıp sonra silinen gönderiler (son 30 gün)
            admin.from("posts").select("id", { count: "exact", head: true })
              .eq("author_id", userId).eq("status", "deleted")
              .not("published_at", "is", "null")
              .gte("updated_at", thirtyDaysAgo),
          ]);

          // ═══ Process Phase 1 results ═══

          // Posts by status
          const postStatusList = postsByStatus.data || [];
          const publishedPostCount = postStatusList.filter((p) => p.status === "published").length;
          const moderationPostCount = postStatusList.filter((p) => p.status === "moderation").length;
          const removedPostCount = postStatusList.filter((p) => p.status === "removed").length;

          // Comments by status
          const commentStatusList = commentsByStatus.data || [];
          const spamCommentCount = commentStatusList.filter((c) => c.status === "spam").length;
          const removedCommentCount = commentStatusList.filter((c) => c.status === "removed").length;

          // Average word count
          const wordCounts = (avgWordCount.data || []).map((p) => p.word_count || 0);
          const avgWc = wordCounts.length > 0
            ? wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length : 0;

          // Post stats
          const postStats: PostStat[] = (postStatsData.data || []).map((p: any) => ({
            id: p.id || 0,
            like_count: p.like_count || 0,
            comment_count: p.comment_count || 0,
            save_count: p.save_count || 0,
            share_count: p.share_count || 0,
            unique_view_count: p.unique_view_count || 0,
            trending_score: p.trending_score || 0,
            word_count: p.word_count || 0,
            mention_count: Array.isArray(p.mentions) ? p.mentions.length : 0,
            content_type: p.content_type || 'post',
            has_media: !!(p.featured_image || p.video_thumbnail),
          }));
          const postIds = postStats.map(p => p.id).filter(Boolean);

          // Comment likes total
          const commentLikesTotal = (commentLikes.data || [])
            .reduce((acc: number, c: any) => acc + (c.like_count || 0), 0);

          // Gifts received — coins + diversity + single source
          const giftData = giftsReceivedData.data || [];
          const giftsReceivedCoins = giftData.reduce((acc: number, g: any) => acc + (g.coin_amount || 0), 0);
          const giftSenderMap = new Map<string, number>();
          for (const g of giftData) {
            const sid = g.sender_id;
            if (sid) giftSenderMap.set(sid, (giftSenderMap.get(sid) || 0) + (g.coin_amount || 0));
          }
          const giftSenderDiversity = giftSenderMap.size;
          const topSenderCoins = giftSenderMap.size > 0
            ? Math.max(...Array.from(giftSenderMap.values())) : 0;
          const topGiftSenderRatio = giftsReceivedCoins > 0 ? topSenderCoins / giftsReceivedCoins : 0;

          // Gifts sent coins
          const giftsSentCoins = (giftsSent.data || [])
            .reduce((acc: number, g: any) => acc + (g.coin_amount || 0), 0);

          // Rate limit hits
          const rlMap = new Map<string, number>();
          for (const ev of rateLimitEvents.data || []) {
            const action = (ev.metadata as any)?.action || "unknown";
            rlMap.set(action, (rlMap.get(action) || 0) + 1);
          }
          const rateLimitHits: RateLimitHit[] = Array.from(rlMap.entries()).map(([action, count]) => ({ action, count }));

          // Active days + login streak
          const loginDays = new Set<string>();
          for (const ev of activeDaysData.data || []) {
            loginDays.add(new Date(ev.created_at).toISOString().slice(0, 10));
          }
          if (user.last_active_at) {
            const lad = new Date(user.last_active_at);
            if (lad.getTime() >= new Date(thirtyDaysAgo).getTime()) {
              loginDays.add(lad.toISOString().slice(0, 10));
            }
          }
          const activeDaysLast30 = loginDays.size;

          // Login streak (consecutive days ending today — 1 gün toleranslı)
          const today = now.toISOString().slice(0, 10);
          const loginDaySet = new Set(loginDays);
          let loginStreak = 0;
          let graceDaysUsed = 0;
          const maxGrace = 1; // 1 gün atlama toleransı
          const todayDate = new Date(today);
          for (let d = 0; d < 90; d++) {
            const expected = new Date(todayDate);
            expected.setDate(expected.getDate() - d);
            const exp = expected.toISOString().slice(0, 10);
            if (loginDaySet.has(exp)) {
              loginStreak++;
            } else {
              graceDaysUsed++;
              if (graceDaysUsed > maxGrace) break;
              // Tolerans günü — streak kırılmaz ama sayılmaz
            }
          }

          // Follower loss
          const followerLossLast7 = followerLossData.count ?? 0;

          // Duplicate comments
          const userComments = userRecentComments.data || [];
          const commentContentMap = new Map<string, Set<number>>();
          for (const c of userComments) {
            const key = (c.content || "").trim().toLowerCase();
            if (key.length < 5) continue;
            if (!commentContentMap.has(key)) commentContentMap.set(key, new Set());
            commentContentMap.get(key)!.add(c.post_id);
          }
          const duplicateCommentGroups = Array.from(commentContentMap.values()).filter(s => s.size >= 3).length;

          // Mass delete
          const massDeleteLast24h = massDeleteCount.count ?? 0;

          // Social shares
          const socialSharesByUser = socialSharesData.count ?? 0;

          // Total comment count + profanity ratio
          const totalUserCommentCount = totalCommentCount.count ?? 0;

          // Suspicious withdrawals (amount <= 600, min is 500)
          const withdrawals = withdrawalData.data || [];
          const suspiciousWithdrawalCount = withdrawals.filter((w: any) => (w.amount || 0) <= 600).length;

          // Mutual follow + follower/following IDs
          const followerIds = (followerIdsData.data || []).map((f: any) => f.follower_id).filter(Boolean);
          const followingIds = (followingIdsData.data || []).map((f: any) => f.following_id).filter(Boolean);
          const followingSet = new Set(followingIds);
          const mutualCount = followerIds.filter((id: string) => followingSet.has(id)).length;
          const mutualFollowRatio = followerIds.length > 0 ? mutualCount / followerIds.length : 0;

          // Avg mention per post
          const avgMentionPerPost = postStats.length > 0
            ? postStats.reduce((a, p) => a + p.mention_count, 0) / postStats.length : 0;

          // Rejected NSFW posts — moderatör tarafından reddedilen NSFW postlar
          const rejectedNsfwPostCount = rejectedNsfwData.count ?? 0;

          // Consumer (reader) signals
          const likedOtherPostCount = likedOtherPostData.count ?? 0;
          const savedOtherPostCount = savedOtherPostData.count ?? 0;
          // commentedOnOtherPostCount Phase 2'de postComments'tan hesaplanacak
          let commentedOnOtherPostCount = 0;

          // Profile visits (son 30 gün)
          const profileVisits = profileVisitData.data || [];
          const profileVisitsLast30 = profileVisits.length;
          const uniqueProfileVisitors = new Set(
            profileVisits.map((v: any) => v.visitor_id).filter(Boolean)
          ).size;

          // ═══ v4: Content Quality Penalty Signals ═══
          const postAndDeleteCount = postAndDeleteData.count ?? 0;

          // Low-effort: word_count < 10 — video/moment hariç (kısa kelime doğal)
          const textOnlyPosts = postStats.filter(p => p.content_type === 'post' || !p.content_type);
          const lowEffortPosts = textOnlyPosts.filter(p => p.word_count < 10).length;
          const lowEffortPostRatio = textOnlyPosts.length > 0 ? lowEffortPosts / textOnlyPosts.length : 0;

          // Duplicate content: posts with identical titles
          const rawPosts = postStatsData.data || [];
          const titleMap = new Map<string, number>();
          for (const p of rawPosts) {
            const t = ((p as any).title || "").trim().toLowerCase();
            if (t.length < 3) continue;
            titleMap.set(t, (titleMap.get(t) || 0) + 1);
          }
          const duplicateContentCount = Array.from(titleMap.values()).filter(c => c >= 2).reduce((a, c) => a + c, 0);

          // One-line no-media posts: word_count < 30, no featured_image/video_thumbnail
          // Video/moment postlar doğası gereği kısa metin + medya olduğundan hariç tutulur
          const oneLineNoMediaPosts = rawPosts.filter(
            (p: any) => (p.content_type === 'post' || !p.content_type) &&
              (p.word_count || 0) < 30 && !p.featured_image && !p.video_thumbnail
          ).length;
          const oneLineNoMediaPostRatio = textOnlyPosts.length > 0 ? oneLineNoMediaPosts / textOnlyPosts.length : 0;

          // Weird character detection (zalgo, excessive emoji, unicode spam)
          const weirdCharRegex = /[\u0300-\u036f]{3,}|[\u2000-\u200f]|[\u2028-\u202f]|[\u0e00-\u0e7f]{5,}|(.)\1{5,}/;
          const weirdCharPosts = rawPosts.filter((p: any) => {
            const title = (p as any).title || "";
            return weirdCharRegex.test(title);
          }).length;
          const weirdCharPostRatio = textOnlyPosts.length > 0 ? weirdCharPosts / textOnlyPosts.length : 0;

          // ═══ PHASE 2: Queries depending on Phase 1 (4 parallel) ═══
          const [followerTrustData, readDurationData, postCommentsData, qualifiedReadsPhase2] = await Promise.all([
            // Follower trust avg
            followerIds.length > 0
              ? admin.from("profiles").select("profile_score")
                  .in("user_id", followerIds.slice(0, 100))
              : Promise.resolve({ data: [] as any[] }),
            // Avg read duration on user's posts
            postIds.length > 0
              ? admin.from("post_views").select("read_duration")
                  .in("post_id", postIds.slice(0, 50))
                  .gt("read_duration", 0).limit(500)
              : Promise.resolve({ data: [] as any[] }),
            // Comments on user's posts (organic analysis)
            postIds.length > 0
              ? admin.from("comments").select("author_id, post_id, parent_id")
                  .in("post_id", postIds.slice(0, 50))
                  .eq("status", "approved").limit(1000)
              : Promise.resolve({ data: [] as any[] }),
            // Qualified reads (BUG FIX: was using userId as post_id, now uses postIds)
            postIds.length > 0
              ? admin.from("post_views").select("id", { count: "exact", head: true })
                  .in("post_id", postIds.slice(0, 50))
                  .eq("is_qualified_read", true)
              : Promise.resolve({ count: 0 } as any),
          ]);

          // Qualified reads (Phase 2 — doğru postIds ile)
          const qualifiedReadCount = qualifiedReadsPhase2.count ?? 0;

          // Network trust avg (based on follower profile scores, normalized to 0-5 scale)
          const followerScores = (followerTrustData.data || []).map((p: any) => p.profile_score || 0);
          const avgFollowerScore = followerScores.length > 0
            ? followerScores.reduce((a: number, b: number) => a + b, 0) / followerScores.length : 0;
          const networkTrustAvg = avgFollowerScore / 20; // 0-100 → 0-5 scale

          // Avg read duration
          const durations = (readDurationData.data || []).map((v: any) => v.read_duration || 0);
          const avgReadDurationOnPosts = durations.length > 0
            ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0;

          // Organic comment analysis
          const postComments = postCommentsData.data || [];
          const totalPostComments = postComments.length;
          const selfComments = postComments.filter((c: any) => c.author_id === userId).length;
          const selfCommentRatio = totalPostComments > 0 ? selfComments / totalPostComments : 0;

          // Consumer: commented on other posts = total comments - self comments on own posts
          commentedOnOtherPostCount = Math.max(0, totalUserCommentCount - selfComments);
          const organicCommentRatio = totalPostComments > 0 ? 1 - selfCommentRatio : 0;
          const commentAuthors = new Set(
            postComments.filter((c: any) => c.author_id !== userId).map((c: any) => c.author_id)
          );
          const commentAuthorDiversity = commentAuthors.size;

          // Discussion posts (5+ unique non-self commenters)
          const postCommentMap = new Map<number, Set<string>>();
          for (const c of postComments) {
            if ((c as any).author_id === userId) continue;
            const pid = (c as any).post_id;
            if (!postCommentMap.has(pid)) postCommentMap.set(pid, new Set());
            postCommentMap.get(pid)!.add((c as any).author_id);
          }
          const discussionPostCount = Array.from(postCommentMap.values()).filter(s => s.size >= 5).length;

          // Comment reply ratio (user replies to others' root comments on own posts)
          const otherRootComments = postComments.filter(
            (c: any) => c.author_id !== userId && !c.parent_id
          ).length;
          const userReplies = postComments.filter(
            (c: any) => c.author_id === userId && c.parent_id
          ).length;
          const commentReplyRatio = otherRootComments > 0
            ? Math.min(1, userReplies / otherRootComments) : 0;

          // ═══ Build profile & inputs ═══
          const profile: ProfileData = {
            avatar_url: user.avatar_url,
            bio: user.bio,
            email_verified: user.email_verified ?? false,
            phone_verified: user.phone_verified ?? false,
            website: user.website,
            birth_date: user.birth_date,
            gender: user.gender,
            full_name: user.full_name,
            account_type: user.account_type,
            is_verified: user.is_verified ?? false,
            is_premium: user.is_premium ?? false,
            follower_count: user.follower_count ?? 0,
            following_count: user.following_count ?? 0,
            post_count: user.post_count ?? 0,
            status: user.status ?? "active",
            created_at: user.created_at,
            shadow_banned: user.shadow_banned ?? false,
            total_earned: user.total_earned ?? 0,
            total_views_received: user.total_views_received ?? 0,
          };

          const inputs: ScoreInputs = {
            profile,
            publishedPostCount,
            moderationPostCount,
            removedPostCount,
            recentPublishedCount: recentPublished.count ?? 0,
            spamCommentCount,
            removedCommentCount,
            recentCommentCount: recentComments.count ?? 0,
            totalUserCommentCount,
            blocksReceived: blocksReceived.count ?? 0,
            reportsReceived: reportsReceived.count ?? 0,
            moderationActionCount: moderationActions.count ?? 0,
            burstPostCount: burstPosts.count ?? 0,
            avgWordCount: avgWc,
            lastModerationDate: lastModeration.data?.[0]?.created_at ?? null,
            postStats,
            qualifiedReadCount,
            commentLikesTotal,
            giftsReceivedCoins,
            giftsSentCoins,
            rateLimitHits,
            activeDaysLast30,
            followerLossLast7,
            loginStreak,
            // v3 spam
            duplicateCommentGroups,
            massDeleteLast24h,
            topGiftSenderRatio,
            suspiciousWithdrawalCount,
            selfCommentRatio,
            commentAuthorDiversity,
            avgMentionPerPost,
            // v3 profile
            mutualFollowRatio,
            commentReplyRatio,
            networkTrustAvg,
            giftSenderDiversity,
            avgReadDurationOnPosts,
            socialSharesByUser,
            organicCommentRatio,
            discussionPostCount,
            rejectedNsfwPostCount,
            // v5: Consumer (reader) profile
            savedOtherPostCount,
            likedOtherPostCount,
            commentedOnOtherPostCount,
            // v5: Penalty decay
            lastPenaltyDate: lastModeration.data?.[0]?.created_at ?? null,
            profileVisitsLast30,
            uniqueProfileVisitors,
            // v4 content quality penalties
            postAndDeleteCount,
            lowEffortPostRatio,
            duplicateContentCount,
            oneLineNoMediaPostRatio,
            weirdCharPostRatio,
            // v6 copyright strikes
            copyrightStrikeCount: user.copyright_strike_count ?? 0,
          };

          const profileScore = calculateProfileScore(inputs);
          const spamScore = calculateSpamScore(inputs);

          // Copyright eligibility: only grant, never revoke (admin-only revoke)
          let copyrightEligible: boolean | undefined;
          let copyrightEligibleSince: string | undefined;
          if (!user.copyright_eligible && !user.copyright_revoked_by) {
            const eligible = checkCopyrightEligibility(profileScore, {
              ...profile,
              copyrightStrikeCount: user.copyright_strike_count ?? 0,
            });
            if (eligible) {
              copyrightEligible = true;
              copyrightEligibleSince = new Date().toISOString();
            }
          }

          return { userId, profileScore, spamScore, copyrightEligible, copyrightEligibleSince };
        })
      );

      scoreResults.push(...batchResults);
    }

    // Batch update
    let updatedCount = 0;
    for (let i = 0; i < scoreResults.length; i += 100) {
      const batch = scoreResults.slice(i, i + 100);
      const promises = batch.map((r) => {
        const updates: Record<string, unknown> = {
          profile_score: r.profileScore,
          spam_score: r.spamScore,
        };
        if (r.copyrightEligible) {
          updates.copyright_eligible = true;
          updates.copyright_eligible_since = r.copyrightEligibleSince;
        }
        return admin.from("profiles").update(updates).eq("user_id", r.userId);
      });
      await Promise.all(promises);
      updatedCount += batch.length;
    }

    return NextResponse.json({ updated: updatedCount });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
