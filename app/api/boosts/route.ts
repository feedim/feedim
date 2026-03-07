import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPrivateCacheControl, FRESHNESS_WINDOWS } from '@/lib/freshnessPolicy';
import { getTranslations } from 'next-intl/server';
import { safePage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = safePage(searchParams.get('page'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    // Get total count and paginated boosts in parallel
    const [countResult, boostsResult] = await Promise.all([
      admin
        .from('post_boosts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      admin
        .from('post_boosts')
        .select('id, post_id, status, goal, daily_budget, duration_days, total_budget, spent_budget, impressions, clicks, starts_at, started_at, ends_at, paused_at, boost_code, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ]);

    if (boostsResult.error) {
      return NextResponse.json({ error: tErrors("dataFetchFailed") }, { status: 500 });
    }

    const boosts = boostsResult.data || [];
    const total = countResult.count || 0;

    // Batch enrichment: collect all post_ids and fetch in one query
    const postIds = [...new Set(boosts.map((b: any) => b.post_id))];
    let postMap = new Map<number, any>();

    if (postIds.length > 0) {
      const { data: posts } = await admin
        .from('posts')
        .select('id, title, slug, content_type')
        .in('id', postIds);
      if (posts) {
        postMap = new Map(posts.map(p => [p.id, p]));
      }
    }

    const enriched = boosts.map((boost: any) => ({
      ...boost,
      post: postMap.get(boost.post_id) || null,
    }));

    const response = NextResponse.json({
      boosts: enriched,
      hasMore: offset + limit < total,
      total,
    });
    response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.boostInventory));
    return response;
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
