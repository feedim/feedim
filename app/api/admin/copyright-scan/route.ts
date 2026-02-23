import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  stripHtmlToText,
  normalizeForComparison,
  getWordShingles,
  jaccardSimilarity,
} from '@/lib/copyright';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check admin role
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { slug } = await request.json();
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug gerekli' }, { status: 400 });
    }

    // Find the source post
    const { data: sourcePost } = await admin
      .from('posts')
      .select('id, title, content, author_id')
      .eq('slug', slug.trim())
      .single();

    if (!sourcePost) {
      return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
    }

    // Prepare source shingles
    const plainText = stripHtmlToText(sourcePost.content || '');
    const fullText = `${sourcePost.title} ${plainText}`;
    const normalized = normalizeForComparison(fullText);
    const sourceShingles = getWordShingles(normalized);

    if (sourceShingles.size < 3) {
      return NextResponse.json({ results: [] });
    }

    // Fetch candidates from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates } = await admin
      .from('posts')
      .select('id, slug, title, content, author_id, profiles!posts_author_id_fkey(username)')
      .eq('status', 'published')
      .neq('id', sourcePost.id)
      .gte('published_at', ninetyDaysAgo)
      .order('published_at', { ascending: false })
      .limit(500);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Compare each candidate
    const results: {
      post_id: number;
      slug: string;
      title: string;
      author: string;
      similarity: number;
      matchType: 'exact' | 'high' | 'moderate' | 'low';
    }[] = [];

    for (const c of candidates) {
      const cPlain = stripHtmlToText(c.content || '');
      const cFull = `${c.title} ${cPlain}`;
      const cNormalized = normalizeForComparison(cFull);
      const cShingles = getWordShingles(cNormalized);

      if (cShingles.size < 3) continue;

      const sim = jaccardSimilarity(sourceShingles, cShingles);
      const simPercent = Math.round(sim * 100);

      if (simPercent >= 30) {
        const author = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        let matchType: 'exact' | 'high' | 'moderate' | 'low' = 'low';
        if (simPercent >= 95) matchType = 'exact';
        else if (simPercent >= 80) matchType = 'high';
        else if (simPercent >= 60) matchType = 'moderate';

        results.push({
          post_id: c.id,
          slug: c.slug,
          title: c.title,
          author: (author as any)?.username || '?',
          similarity: simPercent,
          matchType,
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
