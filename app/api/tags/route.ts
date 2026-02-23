import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { transliterateTurkish, formatTagName } from '@/lib/utils';
import { VALIDATION } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const q = request.nextUrl.searchParams.get('q') || '';
    const followed = request.nextUrl.searchParams.get('followed');

    // Return followed tag IDs for the current user
    if (followed === 'true') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ followedTagIds: [] });
      const { data } = await supabase
        .from('tag_follows')
        .select('tag_id')
        .eq('user_id', user.id);
      return NextResponse.json({ followedTagIds: (data || []).map(d => d.tag_id) });
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 20, 100);

    // Best-effort cleanup: remove tags with 0 posts
    void admin.from('tags').delete().eq('post_count', 0).then(() => {});

    let query = supabase
      .from('tags')
      .select('id, name, slug, post_count')
      .order('post_count', { ascending: false })
      .limit(limit);

    if (q.trim()) {
      // Sanitize query for tag search (same rules as tag creation)
      const sanitized = formatTagName(q.trim());
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`);
      }
    }

    // Only return tags that have at least 1 post
    const { data, error } = await query.gt('post_count', 0);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json({ tags: data });
    response.headers.set('Cache-Control', 'public, s-maxage=300');
    return response;
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Etiket adı gerekli' }, { status: 400 });
    }

    const trimmedName = name.trim().replace(/\s+/g, ' ').substring(0, VALIDATION.tagName.max);

    if (trimmedName.length < VALIDATION.tagName.min) {
      return NextResponse.json({ error: `Etiket en az ${VALIDATION.tagName.min} karakter olmalı` }, { status: 400 });
    }

    // Only allowed characters (letters, numbers, spaces, hyphens, dots, &, #, +)
    if (!VALIDATION.tagName.pattern.test(trimmedName)) {
      return NextResponse.json({ error: 'Etiket adı geçersiz karakterler içeriyor' }, { status: 400 });
    }

    // No HTML tags
    if (/<[^>]+>/.test(trimmedName)) {
      return NextResponse.json({ error: 'Etiket adında HTML kullanılamaz' }, { status: 400 });
    }

    // No URLs
    if (/^(https?:\/\/|www\.)\S+$/i.test(trimmedName)) {
      return NextResponse.json({ error: 'Etiket adı bir URL olamaz' }, { status: 400 });
    }

    // No only numbers
    if (/^\d+$/.test(trimmedName)) {
      return NextResponse.json({ error: 'Etiket sadece sayılardan oluşamaz' }, { status: 400 });
    }

    // Sanitize: Turkish chars → ASCII, only a-z0-9, max 50 chars
    const sanitizedName = formatTagName(trimmedName);

    if (!sanitizedName || sanitizedName.length < VALIDATION.tagName.min) {
      return NextResponse.json({ error: 'Geçersiz etiket adı' }, { status: 400 });
    }

    // Name and slug are now identical (social media style)
    const slug = sanitizedName;

    // Use admin client to bypass RLS for lookup only
    const admin = createAdminClient();

    // Check if exists
    const { data: existing } = await admin
      .from('tags')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ tag: existing });
    }
    // Do not create tags here; they will be created when a post is published
    return NextResponse.json({ tag: { id: slug, name: sanitizedName, slug, post_count: 0, virtual: true } }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
