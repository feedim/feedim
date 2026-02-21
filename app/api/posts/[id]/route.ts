import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { slugify, calculateReadingTime, generateExcerpt, formatTagName } from '@/lib/utils';
import { generateMetaTitle, generateMetaDescription, generateMetaKeywords, generateSeoFieldsAI } from '@/lib/seo';
import { VALIDATION } from '@/lib/constants';
import { checkImageContent, checkTextContent } from '@/lib/moderation';
import { createAdminClient } from '@/lib/supabase/admin';
import sanitizeHtml from 'sanitize-html';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const isSlug = isNaN(Number(id));
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, is_premium, status, account_private),
        post_tags(tag_id, tags(id, name, slug)),
        post_categories(category_id, categories(id, name, slug))
      `)
      .eq(isSlug ? 'slug' : 'id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
    }

    // Draft / removed check: only author can see
    if (post.status !== 'published') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== post.author_id) {
        return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
      }
    } else {
      // NSFW check: only author can see NSFW posts
      if (post.is_nsfw) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== post.author_id) {
          return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
        }
      }
      // Published post: check author status + private account
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      if (author?.status && author.status !== 'active') {
        return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
      }
      if (author?.account_private) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id !== post.author_id) {
          const { createAdminClient } = await import('@/lib/supabase/admin');
          const admin = createAdminClient();
          const { data: follow } = await admin
            .from('follows').select('id')
            .eq('follower_id', user?.id || '')
            .eq('following_id', post.author_id).single();
          if (!follow) return NextResponse.json({ error: 'private_account', redirect: `/u/${author?.username}` }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from('posts')
      .select('id, author_id, status, title, content, slug, content_type')
      .eq('id', id)
      .single();

    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, status, tags, category_id, featured_image, excerpt: customExcerpt, meta_title, meta_description, meta_keywords, allow_comments, is_for_kids, video_url, video_duration, video_thumbnail, content_type } = body;
    const isVideo = content_type === 'video' || content_type === 'moment' || existing.content_type === 'video' || existing.content_type === 'moment';

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      const trimmedTitle = (typeof title === 'string' ? title : '').trim();
      if (trimmedTitle.length < VALIDATION.postTitle.min) {
        return NextResponse.json({ error: `Başlık en az ${VALIDATION.postTitle.min} karakter olmalı` }, { status: 400 });
      }
      if (trimmedTitle.length > VALIDATION.postTitle.max) {
        return NextResponse.json({ error: `Başlık en fazla ${VALIDATION.postTitle.max} karakter olabilir` }, { status: 400 });
      }
      if (/<[^>]+>/.test(trimmedTitle)) {
        return NextResponse.json({ error: 'Başlıkta HTML etiketi kullanılamaz' }, { status: 400 });
      }
      if (/^(https?:\/\/|www\.)\S+$/i.test(trimmedTitle)) {
        return NextResponse.json({ error: 'Başlık bir URL olamaz' }, { status: 400 });
      }
      updates.title = trimmedTitle;
    }

    if (content !== undefined) {
      const sanitizedContent = isVideo
        ? sanitizeHtml(content || '', { allowedTags: ['br', 'strong', 'p'], allowedAttributes: {} })
        : sanitizeHtml(content, {
            allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'],
            allowedAttributes: { 'a': ['href', 'target', 'rel'], 'img': ['src', 'alt'], '*': ['class'] },
          });
      updates.content = sanitizedContent;
      if (!isVideo) {
        const { wordCount, readingTime } = calculateReadingTime(sanitizedContent);
        updates.word_count = wordCount;
        updates.reading_time = readingTime;
      }
      updates.excerpt = customExcerpt?.trim() || generateExcerpt(sanitizedContent);
    } else if (customExcerpt !== undefined) {
      updates.excerpt = customExcerpt.trim();
    }

    // Video fields
    if (video_url !== undefined) updates.video_url = video_url || null;
    if (video_duration !== undefined) updates.video_duration = video_duration || null;
    if (video_thumbnail !== undefined) {
      updates.video_thumbnail = video_thumbnail || null;
      // Set featured_image from thumbnail if not manually set
      if (video_thumbnail && !featured_image) updates.featured_image = video_thumbnail;
    }

    if (status !== undefined) {
      if (['draft', 'published'].includes(status)) {
        updates.status = status;
        if (status === 'published' && existing.status !== 'published') {
          updates.published_at = new Date().toISOString();
        }
      }
    }

    if (featured_image !== undefined) updates.featured_image = featured_image || null;
    if (allow_comments !== undefined) updates.allow_comments = allow_comments !== false;
    if (is_for_kids !== undefined) updates.is_for_kids = is_for_kids === true;
    // SEO meta fields
    if (meta_title !== undefined) {
      updates.meta_title = meta_title?.trim() || null;
    } else if (updates.title || updates.content) {
      const ft = (updates.title as string) || existing.title;
      const fc = (updates.content as string) || existing.content || '';
      updates.meta_title = generateMetaTitle(ft, fc);
    }

    // Manual description/keywords take priority
    const manualDesc = typeof meta_description === 'string' && meta_description.trim();
    const manualKw = typeof meta_keywords === 'string' && meta_keywords.trim();

    if (manualDesc) {
      updates.meta_description = meta_description!.trim();
    }
    if (manualKw) {
      updates.meta_keywords = meta_keywords!.trim();
    }

    // AI SEO generation on publish (when not manually provided)
    const isPublishing = updates.status === 'published' || (existing.status === 'published' && (updates.title || updates.content));

    if (isPublishing && (!manualDesc || !manualKw)) {
      const ft = (updates.title as string) || existing.title;
      const fc = (updates.content as string) || existing.content || '';
      const tagNames = (tags || []).filter((t: unknown) => typeof t === 'string') as string[];
      try {
        const seo = await generateSeoFieldsAI(ft, fc, { slug: existing.slug, tags: tagNames });
        if (!manualDesc) updates.meta_description = seo.description;
        if (!manualKw) updates.meta_keywords = seo.keyword;
      } catch {
        if (!manualDesc) updates.meta_description = generateMetaDescription(ft, fc);
        if (!manualKw) {
          const cands = generateMetaKeywords(ft, fc, { slug: existing.slug, tags: tagNames });
          updates.meta_keywords = cands.split(', ')[0] || ft;
        }
      }
    }


    // Moderation policy update:
    // - Always allow publishing
    // - Run AI moderation in background
    //   - Images flagged/block => NSFW + moderation_due_at = now
    //   - Text severe (block) => NSFW + moderation_due_at = now
    //   - Text mild (flag) => no change
    let runAsyncModeration = false;
    if (updates.status === 'published' || (existing.status === 'published' && (updates.title || updates.content))) {
      runAsyncModeration = true;
    }

    const { data: post, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('id, slug, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      // Remove old tags
      await supabase.from('post_tags').delete().eq('post_id', id);

      const tagIds: number[] = [];
      for (const tagItem of tags.slice(0, VALIDATION.postTags.max)) {
        if (typeof tagItem === 'number') {
          tagIds.push(tagItem);
        } else if (typeof tagItem === 'string' && tagItem.trim()) {
          const sanitizedTag = formatTagName(tagItem.trim());
          if (!sanitizedTag || sanitizedTag.length < 2) continue;
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id')
            .eq('slug', sanitizedTag)
            .single();

          if (existingTag) {
            tagIds.push(existingTag.id);
          } else {
            const { data: newTag } = await supabase
              .from('tags')
              .insert({ name: sanitizedTag, slug: sanitizedTag })
              .select('id')
              .single();
            if (newTag) tagIds.push(newTag.id);
          }
        }
      }

      if (tagIds.length > 0) {
        await supabase
          .from('post_tags')
          .insert(tagIds.map(tag_id => ({ post_id: Number(id), tag_id })));
      }
    }

    // Handle category if provided
    if (category_id !== undefined) {
      await supabase.from('post_categories').delete().eq('post_id', id);
      if (category_id) {
        await supabase.from('post_categories').insert({ post_id: Number(id), category_id });
      }
    }

    // Background AI moderation
    if (runAsyncModeration && post) {
      const finalTitle = (updates.title as string) || existing.title;
      const finalContent = (updates.content as string) || existing.content || '';
      const admin = createAdminClient();
      after(async () => {
        try {
          const [imgRes, txtRes] = await Promise.all([
            checkImageContent(finalContent),
            checkTextContent(finalTitle, finalContent),
          ]);

          let shouldNSFW = false;
          if (imgRes.action !== 'allow') shouldNSFW = true; // any flagged image
          if (txtRes.severity === 'block' || txtRes.severity === 'flag') shouldNSFW = true; // medium/heavy text

          const modUpdates: Record<string, unknown> = shouldNSFW
            ? { is_nsfw: true, moderation_due_at: new Date().toISOString() }
            : { is_nsfw: false, moderation_due_at: null };

          await admin.from('posts').update(modUpdates).eq('id', post.id);
        } catch {}
      });
    }

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', id)
      .single();

    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
    }

    // Nullify/delete foreign key references before deleting
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const postId = Number(id);
    await Promise.all([
      admin.from('gifts').delete().eq('post_id', postId),
      admin.from('coin_transactions').update({ related_post_id: null }).eq('related_post_id', postId),
      admin.from('notifications').delete().eq('post_id', postId),
    ]);

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
