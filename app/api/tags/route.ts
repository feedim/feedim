import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTagName } from '@/lib/utils';
import { VALIDATION } from '@/lib/constants';
import { safeError } from '@/lib/apiError';
import { getTranslations } from 'next-intl/server';

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

    let query = supabase
      .from('tags')
      .select('id, name, slug, post_count')
      .order('post_count', { ascending: false })
      .limit(limit);

    if (q.trim()) {
      // Sanitize query for tag search (same rules as tag creation)
      const sanitized = formatTagName(q.trim());
      if (sanitized) {
        const { data: exactTag } = await admin
          .from('tags')
          .select('id, name, slug, post_count')
          .eq('slug', sanitized)
          .maybeSingle();

        if (exactTag) {
          const { data: similarTags } = await supabase
            .from('tags')
            .select('id, name, slug, post_count')
            .neq('id', exactTag.id)
            .or(`name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`)
            .order('post_count', { ascending: false })
            .limit(Math.max(limit - 1, 0));

          const response = NextResponse.json({ tags: [exactTag, ...(similarTags || [])].slice(0, limit) });
          response.headers.set('Cache-Control', 'public, s-maxage=300');
          return response;
        }

        query = query.or(`name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      return safeError(error);
    }

    const response = NextResponse.json({ tags: data });
    response.headers.set('Cache-Control', 'public, s-maxage=300');
    return response;
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }
    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: tErrors("tagNameRequired") }, { status: 400 });
    }

    const normalizedInput = name.trim().replace(/^#+/, "").replace(/\s+/g, " ");
    if (!normalizedInput) {
      return NextResponse.json({ error: tErrors("tagNameRequired") }, { status: 400 });
    }

    // No HTML tags
    if (/<[^>]+>/.test(normalizedInput)) {
      return NextResponse.json({ error: tErrors("tagNameNoHtml") }, { status: 400 });
    }

    // No URLs
    if (/^(https?:\/\/|www\.)\S+$/i.test(normalizedInput)) {
      return NextResponse.json({ error: tErrors("tagNameNoUrl") }, { status: 400 });
    }

    // Sanitize first so create flow is tolerant to pasted hashtags / punctuation.
    const sanitizedName = formatTagName(normalizedInput);

    if (!sanitizedName || sanitizedName.length < VALIDATION.tagName.min) {
      return NextResponse.json({ error: tErrors("invalidTagName") }, { status: 400 });
    }

    // No only numbers
    if (/^\d+$/.test(sanitizedName)) {
      return NextResponse.json({ error: tErrors("tagNameOnlyNumbers") }, { status: 400 });
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
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
