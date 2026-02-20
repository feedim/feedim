import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const period = req.nextUrl.searchParams.get("period") || "7d";
    const admin = createAdminClient();

    const now = new Date();
    let daysBack = 7;
    if (period === "30d") daysBack = 30;
    else if (period === "90d") daysBack = 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();
    const prevStartDate = new Date(now.getTime() - daysBack * 2 * 24 * 60 * 60 * 1000).toISOString();

    // ─── User posts ───
    const { data: userPosts } = await admin
      .from("posts")
      .select("id, title, slug, view_count, like_count, comment_count, save_count, published_at, featured_image, reading_time, content_type, video_duration")
      .eq("author_id", user.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    const postIds = (userPosts || []).map(p => p.id);

    // ─── Profile ───
    const { data: profile } = await admin
      .from("profiles")
      .select("follower_count, following_count, coin_balance, total_earned")
      .eq("user_id", user.id)
      .single();

    const empty = {
      overview: {
        totalViews: 0, totalLikes: 0, totalComments: 0, totalSaves: 0,
        totalShares: 0, followerCount: profile?.follower_count || 0,
        followingCount: profile?.following_count || 0,
        newFollowers: 0, postCount: 0, engagementRate: 0,
        avgViewsPerPost: 0, avgLikesPerPost: 0, avgCommentsPerPost: 0, avgReadingTime: 0,
      },
      periodCounts: { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followers: 0 },
      prev: { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followers: 0 },
      viewsByDay: [], likesByDay: [], commentsByDay: [], followersByDay: [],
      peakHours: [] as { hour: number; count: number }[],
      weekdayBreakdown: [] as { day: number; views: number; likes: number }[],
      topPosts: [], allPosts: [], recentViews: [], period,
      earnings: {
        coinBalance: profile?.coin_balance || 0,
        totalEarned: profile?.total_earned || 0,
        periodEarned: 0,
        qualifiedReads: 0,
        premiumReads: 0,
      },
      videoAnalytics: null,
    };

    if (postIds.length === 0) return NextResponse.json(empty);

    // ─── Totals ───
    const totalViews = (userPosts || []).reduce((s, p) => s + (p.view_count || 0), 0);
    const totalLikes = (userPosts || []).reduce((s, p) => s + (p.like_count || 0), 0);
    const totalComments = (userPosts || []).reduce((s, p) => s + (p.comment_count || 0), 0);
    const totalSaves = (userPosts || []).reduce((s, p) => s + (p.save_count || 0), 0);
    const postCount = (userPosts || []).length;

    const { count: totalShares } = await admin
      .from("shares").select("id", { count: "exact", head: true })
      .in("post_id", postIds);

    // ─── Period counts (current) ───
    const [
      { count: periodViews }, { count: periodLikes }, { count: periodComments },
      { count: periodSaves }, { count: periodShares }, { count: newFollowers },
    ] = await Promise.all([
      admin.from("post_views").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("viewer_id", user.id).gte("created_at", startDate),
      admin.from("likes").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("user_id", user.id).gte("created_at", startDate),
      admin.from("comments").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("author_id", user.id).gte("created_at", startDate),
      admin.from("bookmarks").select("id", { count: "exact", head: true }).in("post_id", postIds).gte("created_at", startDate),
      admin.from("shares").select("id", { count: "exact", head: true }).in("post_id", postIds).gte("created_at", startDate),
      admin.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id).gte("created_at", startDate),
    ]);

    // ─── Period counts (previous) ───
    const [
      { count: prevViews }, { count: prevLikes }, { count: prevComments },
      { count: prevSaves }, { count: prevShares }, { count: prevFollowers },
    ] = await Promise.all([
      admin.from("post_views").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("viewer_id", user.id).gte("created_at", prevStartDate).lt("created_at", startDate),
      admin.from("likes").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("user_id", user.id).gte("created_at", prevStartDate).lt("created_at", startDate),
      admin.from("comments").select("id", { count: "exact", head: true }).in("post_id", postIds).neq("author_id", user.id).gte("created_at", prevStartDate).lt("created_at", startDate),
      admin.from("bookmarks").select("id", { count: "exact", head: true }).in("post_id", postIds).gte("created_at", prevStartDate).lt("created_at", startDate),
      admin.from("shares").select("id", { count: "exact", head: true }).in("post_id", postIds).gte("created_at", prevStartDate).lt("created_at", startDate),
      admin.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id).gte("created_at", prevStartDate).lt("created_at", startDate),
    ]);

    // ─── Day-by-day data ───
    function groupByDay(data: { created_at: string }[] | null) {
      const map = new Map<string, number>();
      for (let i = 0; i < daysBack; i++) {
        const d = new Date(now.getTime() - (daysBack - 1 - i) * 24 * 60 * 60 * 1000);
        map.set(d.toISOString().split("T")[0], 0);
      }
      for (const v of data || []) {
        const day = new Date(v.created_at).toISOString().split("T")[0];
        map.set(day, (map.get(day) || 0) + 1);
      }
      return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
    }

    const [
      { data: viewsData }, { data: likesData }, { data: commentsData }, { data: followersData },
    ] = await Promise.all([
      admin.from("post_views").select("created_at").in("post_id", postIds).neq("viewer_id", user.id).gte("created_at", startDate).order("created_at", { ascending: true }),
      admin.from("likes").select("created_at").in("post_id", postIds).neq("user_id", user.id).gte("created_at", startDate),
      admin.from("comments").select("created_at").in("post_id", postIds).neq("author_id", user.id).gte("created_at", startDate),
      admin.from("follows").select("created_at").eq("following_id", user.id).gte("created_at", startDate),
    ]);

    const viewsByDay = groupByDay(viewsData);
    const likesByDay = groupByDay(likesData);
    const commentsByDay = groupByDay(commentsData);
    const followersByDay = groupByDay(followersData);

    // ─── Peak hours (0-23) ───
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    for (const v of viewsData || []) {
      const h = new Date(v.created_at).getHours();
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    }
    const peakHours = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));

    // ─── Weekday breakdown ───
    const weekdayViews = new Map<number, number>();
    const weekdayLikes = new Map<number, number>();
    for (let d = 0; d < 7; d++) { weekdayViews.set(d, 0); weekdayLikes.set(d, 0); }
    for (const v of viewsData || []) {
      const d = new Date(v.created_at).getDay();
      weekdayViews.set(d, (weekdayViews.get(d) || 0) + 1);
    }
    for (const l of likesData || []) {
      const d = new Date(l.created_at).getDay();
      weekdayLikes.set(d, (weekdayLikes.get(d) || 0) + 1);
    }
    const weekdayBreakdown = Array.from({ length: 7 }, (_, i) => ({
      day: i, views: weekdayViews.get(i) || 0, likes: weekdayLikes.get(i) || 0,
    }));

    // ─── Engagement rate ───
    const totalInteractions = (periodLikes || 0) + (periodComments || 0) + (periodSaves || 0) + (periodShares || 0);
    const engagementRate = (periodViews || 0) > 0
      ? Math.round((totalInteractions / (periodViews || 1)) * 1000) / 10 : 0;

    // ─── Per-post averages ───
    const avgViewsPerPost = postCount > 0 ? Math.round(totalViews / postCount) : 0;
    const avgLikesPerPost = postCount > 0 ? Math.round(totalLikes / postCount * 10) / 10 : 0;
    const avgCommentsPerPost = postCount > 0 ? Math.round(totalComments / postCount * 10) / 10 : 0;
    const totalReadingTime = (userPosts || []).reduce((s, p) => s + (p.reading_time || 0), 0);
    const avgReadingTime = postCount > 0 ? Math.round(totalReadingTime / postCount) : 0;

    // ─── Top 5 posts ───
    const topPosts = [...(userPosts || [])]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id, title: p.title, slug: p.slug,
        views: p.view_count || 0, likes: p.like_count || 0,
        comments: p.comment_count || 0, saves: p.save_count || 0,
        featured_image: p.featured_image, published_at: p.published_at,
      }));

    // ─── All posts (sorted by views) ───
    const allPosts = [...(userPosts || [])]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .map(p => ({
        id: p.id, title: p.title, slug: p.slug,
        views: p.view_count || 0, likes: p.like_count || 0,
        comments: p.comment_count || 0, saves: p.save_count || 0,
        featured_image: p.featured_image, published_at: p.published_at,
      }));

    // ─── Recent views ───
    const { data: recentViewsData } = await admin
      .from("post_views")
      .select("viewer_id, post_id, created_at")
      .in("post_id", postIds)
      .not("viewer_id", "is", null)
      .neq("viewer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const viewerIds = [...new Set((recentViewsData || []).map(v => v.viewer_id).filter(Boolean))].slice(0, 15);
    let recentViews: any[] = [];
    if (viewerIds.length > 0) {
      const { data: viewerProfiles } = await admin
        .from("profiles").select("user_id, username, full_name, avatar_url")
        .in("user_id", viewerIds);
      const profileMap = new Map((viewerProfiles || []).map(p => [p.user_id, p]));
      const postMap = new Map((userPosts || []).map(p => [p.id, p]));
      const seen = new Set<string>();
      for (const v of recentViewsData || []) {
        if (!v.viewer_id || seen.has(v.viewer_id)) continue;
        seen.add(v.viewer_id);
        const vp = profileMap.get(v.viewer_id);
        const post = postMap.get(v.post_id);
        if (vp) recentViews.push({ viewer: vp, post_title: post?.title, post_slug: post?.slug, viewed_at: v.created_at });
      }
    }

    // ─── Earnings ───
    const [
      { data: periodTransactions },
      { count: qualifiedReads },
      { count: premiumReads },
    ] = await Promise.all([
      admin.from("coin_transactions").select("amount").eq("user_id", user.id).eq("type", "read_earning").gte("created_at", startDate),
      admin.from("post_views").select("id", { count: "exact", head: true }).in("post_id", postIds).eq("is_qualified_read", true).gte("created_at", startDate),
      admin.from("post_views").select("id", { count: "exact", head: true }).in("post_id", postIds).eq("is_premium_viewer", true).gte("created_at", startDate),
    ]);

    const periodEarned = (periodTransactions || []).reduce((s, t) => s + (t.amount || 0), 0);

    // ─── Video Analytics ───
    const videoPosts = (userPosts || []).filter(p => p.content_type === "video");
    const videoPostIds = videoPosts.map(p => p.id);
    let videoAnalytics = null;

    if (videoPostIds.length > 0) {
      const { data: videoEvents } = await admin
        .from("analytics_events")
        .select("data, post_id, created_at")
        .eq("event_type", "video_watch")
        .in("post_id", videoPostIds)
        .gte("created_at", startDate);

      const events = (videoEvents || []).map((e: any) => ({ ...e.data, post_id: e.post_id })).filter(Boolean);

      if (events.length > 0) {
        const totalWatchSeconds = events.reduce((s: number, e: any) => s + (e.watch_duration || 0), 0);
        const totalWatchHours = Math.round((totalWatchSeconds / 3600) * 10) / 10;
        const completedCount = events.filter((e: any) => e.completed).length;
        const completionRate = events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0;
        const avgWatchDuration = Math.round(totalWatchSeconds / events.length);
        const avgWatchPercentage = Math.round(events.reduce((s: number, e: any) => s + (e.watch_percentage || 0), 0) / events.length);

        // Top videos by watch time in period
        const videoWatchMap = new Map<number, number>();
        for (const e of events) {
          videoWatchMap.set(e.post_id, (videoWatchMap.get(e.post_id) || 0) + (e.watch_duration || 0));
        }
        const topVideos = videoPosts
          .map(vp => ({
            id: vp.id, title: vp.title, slug: vp.slug,
            featured_image: vp.featured_image,
            views: vp.view_count || 0,
            watchHours: Math.round(((videoWatchMap.get(vp.id) || 0) / 3600) * 10) / 10,
            video_duration: vp.video_duration,
          }))
          .filter(v => v.watchHours > 0)
          .sort((a, b) => b.watchHours - a.watchHours)
          .slice(0, 5);

        videoAnalytics = {
          videoCount: videoPosts.length,
          totalWatchHours,
          avgWatchDuration,
          avgWatchPercentage,
          completionRate,
          totalWatchers: events.length,
          topVideos,
        };
      }
    }

    const response = NextResponse.json({
      overview: {
        totalViews, totalLikes, totalComments, totalSaves,
        totalShares: totalShares || 0,
        followerCount: profile?.follower_count || 0,
        followingCount: profile?.following_count || 0,
        newFollowers: newFollowers || 0,
        postCount, engagementRate,
        avgViewsPerPost, avgLikesPerPost, avgCommentsPerPost, avgReadingTime,
      },
      periodCounts: {
        views: periodViews || 0, likes: periodLikes || 0, comments: periodComments || 0,
        saves: periodSaves || 0, shares: periodShares || 0, followers: newFollowers || 0,
      },
      prev: {
        views: prevViews || 0, likes: prevLikes || 0, comments: prevComments || 0,
        saves: prevSaves || 0, shares: prevShares || 0, followers: prevFollowers || 0,
      },
      viewsByDay, likesByDay, commentsByDay, followersByDay,
      peakHours, weekdayBreakdown,
      topPosts, allPosts, recentViews, period,
      earnings: {
        coinBalance: profile?.coin_balance || 0,
        totalEarned: profile?.total_earned || 0,
        periodEarned,
        qualifiedReads: qualifiedReads || 0,
        premiumReads: premiumReads || 0,
      },
      videoAnalytics,
    });
    response.headers.set('Cache-Control', 'private, max-age=300');
    return response;
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
