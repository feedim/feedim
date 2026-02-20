import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Verify post ownership
    const { data: post } = await admin
      .from("posts")
      .select("id, title, slug, view_count, like_count, comment_count, save_count, published_at, featured_image, author_id, content_type, video_duration")
      .eq("id", id)
      .single();

    if (!post || post.author_id !== user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const isVideo = post.content_type === "video";

    // All-time counts + views data for chart (last 30 days) + peak hours
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalShares },
      { data: viewsData },
      { data: allViewsData },
      { data: recentComments },
    ] = await Promise.all([
      admin.from("shares").select("id", { count: "exact", head: true }).eq("post_id", id),
      admin.from("post_views").select("created_at").eq("post_id", id).gte("created_at", thirtyDaysAgo).order("created_at", { ascending: true }),
      admin.from("post_views").select("read_duration, read_percentage, is_qualified_read").eq("post_id", id),
      admin.from("comments")
        .select("id, content, created_at, profiles!comments_user_id_fkey(username, full_name, avatar_url)")
        .eq("post_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Video analytics events (separate query)
    let videoEvents: any[] = [];
    if (isVideo) {
      const { data } = await admin
        .from("analytics_events")
        .select("data")
        .eq("event_type", "video_watch")
        .eq("post_id", Number(id));
      videoEvents = data || [];
    }

    // Day-by-day views (last 30 days for mini chart)
    const viewsByDay: { date: string; count: number }[] = [];
    const dayMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      dayMap.set(d.toISOString().split("T")[0], 0);
    }
    for (const v of viewsData || []) {
      const day = new Date(v.created_at).toISOString().split("T")[0];
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    for (const [date, count] of dayMap) {
      viewsByDay.push({ date, count });
    }

    // Peak hours (from last 30 days data)
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    for (const v of viewsData || []) {
      const h = new Date(v.created_at).getHours();
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    }
    const peakHours = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));

    // Read/Watch stats from all views
    const validReads = (allViewsData || []).filter(v => v.read_duration > 0);
    const avgReadDuration = validReads.length > 0
      ? Math.round(validReads.reduce((s, v) => s + v.read_duration, 0) / validReads.length)
      : 0;
    const avgReadPercentage = validReads.length > 0
      ? Math.round(validReads.reduce((s, v) => s + v.read_percentage, 0) / validReads.length)
      : 0;
    const qualifiedReads = (allViewsData || []).filter(v => v.is_qualified_read).length;

    // Engagement rate (all-time)
    const totalViews = post.view_count || 0;
    const totalInteractions = (post.like_count || 0) + (post.comment_count || 0) + (post.save_count || 0) + (totalShares || 0);
    const engagementRate = totalViews > 0
      ? Math.round((totalInteractions / totalViews) * 1000) / 10 : 0;

    // Video-specific analytics
    let videoStats = null;
    if (isVideo && videoEvents.length > 0) {
      const events = videoEvents.map((e: any) => e.data).filter(Boolean);
      const totalWatchSeconds = events.reduce((s: number, e: any) => s + (e.watch_duration || 0), 0);
      const totalWatchHours = Math.round((totalWatchSeconds / 3600) * 10) / 10;
      const completedCount = events.filter((e: any) => e.completed).length;
      const completionRate = events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0;
      const avgWatchDuration = events.length > 0
        ? Math.round(events.reduce((s: number, e: any) => s + (e.watch_duration || 0), 0) / events.length)
        : 0;
      const avgWatchPercentage = events.length > 0
        ? Math.round(events.reduce((s: number, e: any) => s + (e.watch_percentage || 0), 0) / events.length)
        : 0;

      // Retention: bucket exit_time into 10% segments of video duration
      const vDuration = post.video_duration || 0;
      let retentionBuckets: number[] = [];
      if (vDuration > 0 && events.length > 0) {
        retentionBuckets = Array(10).fill(0);
        for (const e of events) {
          const exitPct = vDuration > 0 ? ((e.exit_time || 0) / vDuration) : 0;
          const bucket = Math.min(9, Math.floor(exitPct * 10));
          for (let b = 0; b <= bucket; b++) {
            retentionBuckets[b]++;
          }
        }
        const maxViewers = retentionBuckets[0] || 1;
        retentionBuckets = retentionBuckets.map(v => Math.round((v / maxViewers) * 100));
      }

      videoStats = {
        totalWatchHours,
        avgWatchDuration,
        avgWatchPercentage,
        completionRate,
        completedCount,
        totalWatchers: events.length,
        retentionBuckets,
      };
    }

    const response = NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        featured_image: post.featured_image,
        published_at: post.published_at,
        content_type: post.content_type,
        video_duration: post.video_duration,
      },
      totals: {
        views: totalViews,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        saves: post.save_count || 0,
        shares: totalShares || 0,
      },
      engagementRate: Math.min(engagementRate, 99),
      readStats: { avgReadDuration, avgReadPercentage, qualifiedReads },
      videoStats,
      viewsByDay,
      peakHours,
      recentComments: (recentComments || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        author: c.profiles,
      })),
    });
    response.headers.set('Cache-Control', 'private, max-age=120');
    return response;
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
