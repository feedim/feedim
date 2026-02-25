import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = Date.now();

    // Fetch recent published posts (last 30 days, max 5000)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error } = await admin
      .from("posts")
      .select("id, like_count, comment_count, save_count, share_count, view_count, published_at")
      .eq("status", "published")
      .gte("published_at", thirtyDaysAgo)
      .order("published_at", { ascending: false })
      .limit(5000);

    if (error) {
      return safeError(error);
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    // Calculate trending score for each post
    const updates: { id: number; trending_score: number }[] = [];

    for (const post of posts) {
      const likes = post.like_count || 0;
      const comments = post.comment_count || 0;
      const saves = post.save_count || 0;
      const shares = post.share_count || 0;
      const views = post.view_count || 0;

      // Weighted engagement
      const engagement = likes * 2 + comments * 5 + saves * 10 + shares * 8;

      // Engagement rate (prevent division by zero)
      const engagementRate = views > 0 ? (engagement / views) * 100 : 0;

      // Age decay (Hacker News style)
      const hoursAgo = (now - new Date(post.published_at).getTime()) / (1000 * 60 * 60);
      const ageDecay = Math.pow(hoursAgo + 2, 1.2);

      // Base score
      let score = ((engagement + engagementRate) * 100) / ageDecay;

      // Recency boost
      if (hoursAgo < 6) score += 200;
      else if (hoursAgo < 24) score += 50;

      updates.push({ id: post.id, trending_score: Math.round(score * 100) / 100 });
    }

    // Batch update in groups of 100
    let updatedCount = 0;
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100);
      const promises = batch.map((u) =>
        admin.from("posts").update({ trending_score: u.trending_score }).eq("id", u.id)
      );
      await Promise.all(promises);
      updatedCount += batch.length;
    }

    return NextResponse.json({ updated: updatedCount });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
