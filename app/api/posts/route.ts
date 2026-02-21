import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { slugify, generateSlugHash, calculateReadingTime, generateExcerpt, formatTagName } from '@/lib/utils';
import { generateMetaTitle, generateMetaDescription, generateMetaKeywords, generateSeoFieldsAI } from '@/lib/seo';
import { VALIDATION } from '@/lib/constants';
import { getUserPlan, checkHourlyPostLimit, logRateLimitHit } from '@/lib/limits';
import { moderateContent } from '@/lib/moderation';
import { revalidateTag } from 'next/cache';
import sanitizeHtml from 'sanitize-html';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Hourly post rate limit
    const plan = await getUserPlan(admin, user.id);
    const { allowed: postAllowed, limit: postLimit } = await checkHourlyPostLimit(admin, user.id, plan);
    if (!postAllowed) {
      logRateLimitHit(admin, user.id, 'post', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim());
      return NextResponse.json(
        { error: `Saatlik gönderi limitine ulaştın (${postLimit}). Lütfen biraz bekle.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { title, content, status, tags, featured_image, allow_comments, is_for_kids, meta_title, meta_description, meta_keywords, content_type, video_url, video_duration, video_thumbnail, blurhash } = body;
    const isVideo = content_type === 'video';

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Başlık gerekli' }, { status: 400 });
    }
    const trimmedTitle = title.trim();
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

    // Validate content (video posts can have empty content/description)
    if (!isVideo && (!content || typeof content !== 'string' || content.trim().length === 0)) {
      return NextResponse.json({ error: 'İçerik gerekli' }, { status: 400 });
    }

    // Validate video fields
    if (isVideo && status === 'published' && !video_url) {
      return NextResponse.json({ error: 'Video URL gerekli' }, { status: 400 });
    }

    // Generate slug
    const slugBase = slugify(trimmedTitle);
    const slugHash = generateSlugHash();
    const slug = `${slugBase}-${slugHash}`;

    // Sanitize content — no iframe support
    const sanitizedContent = isVideo
      ? sanitizeHtml(content || '', { allowedTags: ['br', 'strong', 'p'], allowedAttributes: {} })
      : sanitizeHtml(content, {
          allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'],
          allowedAttributes: { 'a': ['href', 'target', 'rel'], 'img': ['src', 'alt'], '*': ['class'] },
        });

    // Server-side content validation for published posts (skip for video posts)
    if (status === 'published' && !isVideo) {
      const textContent = sanitizedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, '').trim();
      const hasImage = /<img\s/i.test(sanitizedContent);

      if (!textContent && !hasImage) {
        return NextResponse.json({ error: 'Gönderi içeriği gerekli' }, { status: 400 });
      }
      if (!hasImage && textContent.length < VALIDATION.postContent.minChars) {
        return NextResponse.json({ error: `Gönderi en az ${VALIDATION.postContent.minChars} karakter olmalı` }, { status: 400 });
      }
      // Plan-based word limit: Max users get 15000, others get 5000
      const maxWords = plan === 'max' ? VALIDATION.postContent.maxWordsMax : VALIDATION.postContent.maxWords;
      const wordText = sanitizedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const wCount = wordText ? wordText.split(' ').length : 0;
      if (wCount > maxWords) {
        return NextResponse.json({ error: `Gönderi en fazla ${maxWords.toLocaleString('tr-TR')} kelime olabilir${plan !== 'max' ? '. Max abonelikle 15.000 kelimeye kadar yazabilirsin.' : '.'}` }, { status: 400 });
      }
      const listItemCount = (sanitizedContent.match(/<li[\s>]/gi) || []).length;
      if (listItemCount > VALIDATION.postContent.maxListItems) {
        return NextResponse.json({ error: `Gönderi en fazla ${VALIDATION.postContent.maxListItems} liste öğesi içerebilir` }, { status: 400 });
      }
      if (textContent.length > 0 && /^\d+$/.test(textContent)) {
        return NextResponse.json({ error: 'Gönderi sadece sayılardan oluşamaz' }, { status: 400 });
      }
      // Repetition detection
      const rawText = sanitizedContent.replace(/<[^>]+>/g, '');
      if (rawText.length >= 20 && /(.)\1{9,}/.test(rawText)) {
        return NextResponse.json({ error: 'Tekrarlayan içerik tespit edildi' }, { status: 400 });
      }
    }

    // Content moderation (only for published posts)
    let moderationAction: 'allow' | 'moderation' | 'block' = 'allow';
    let spamScore = 0;
    if (status === 'published') {
      const modResult = await moderateContent(trimmedTitle, sanitizedContent);
      if (modResult.action === 'block') {
        return NextResponse.json(
          { error: modResult.reason || 'İçerik politikamıza aykırı içerik tespit edildi' },
          { status: 400 }
        );
      }
      moderationAction = modResult.action;
      if (moderationAction === 'moderation') {
        spamScore = 50;
      }
    }

    // Calculate reading time & word count
    const { wordCount, readingTime } = calculateReadingTime(sanitizedContent);

    // Generate excerpt
    const excerpt = generateExcerpt(sanitizedContent);

    // Determine status
    const postStatus = moderationAction === 'moderation' ? 'moderation' : (status === 'published' ? 'published' : 'draft');

    // Server-side SEO
    const finalMetaTitle = (typeof meta_title === 'string' && meta_title.trim()) ? meta_title.trim() : generateMetaTitle(trimmedTitle, sanitizedContent);
    const tagNames = (tags || []).filter((t: unknown) => typeof t === 'string' && (t as string).trim()) as string[];
    const manualDesc = typeof meta_description === 'string' && meta_description.trim();
    const manualKw = typeof meta_keywords === 'string' && meta_keywords.trim();

    let finalMetaDescription = manualDesc || '';
    let finalMetaKeywords = manualKw || '';

    // AI SEO generation on publish (only if not manually provided)
    if (status === 'published' && (!manualDesc || !manualKw)) {
      try {
        const seo = await generateSeoFieldsAI(trimmedTitle, sanitizedContent, {
          slug: slugBase,
          tags: tagNames,
        });
        if (!manualDesc) finalMetaDescription = seo.description;
        if (!manualKw) finalMetaKeywords = seo.keyword;
      } catch (err) {
        console.error('[SEO] AI generation failed, using fallbacks:', err);
      }
    }
    // Algorithmic fallback
    if (!finalMetaDescription) finalMetaDescription = generateMetaDescription(trimmedTitle, sanitizedContent);
    if (!finalMetaKeywords) {
      const cands = generateMetaKeywords(trimmedTitle, sanitizedContent, { slug: slugBase, tags: tagNames });
      finalMetaKeywords = cands.split(', ')[0] || trimmedTitle;
    }

    // Insert post
    const { data: post, error: postError } = await admin
      .from('posts')
      .insert({
        author_id: user.id,
        title: trimmedTitle,
        slug,
        content: sanitizedContent,
        excerpt,
        content_type: isVideo ? 'video' : 'post',
        featured_image: featured_image || (isVideo ? video_thumbnail : null) || null,
        video_url: isVideo ? (video_url || null) : null,
        video_duration: isVideo ? (video_duration || null) : null,
        video_thumbnail: isVideo ? (video_thumbnail || null) : null,
        blurhash: typeof blurhash === 'string' && blurhash.length > 0 ? blurhash : null,
        status: postStatus,
        reading_time: isVideo ? null : readingTime,
        word_count: isVideo ? 0 : wordCount,
        allow_comments: allow_comments !== false,
        is_for_kids: is_for_kids === true,
        spam_score: spamScore,
        published_at: postStatus === 'published' ? new Date().toISOString() : null,
        meta_title: finalMetaTitle,
        meta_description: finalMetaDescription,
        meta_keywords: finalMetaKeywords,
      })
      .select('id, slug, status')
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    // Handle tags
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagIds: number[] = [];
      for (const tagItem of tags.slice(0, VALIDATION.postTags.max)) {
        if (typeof tagItem === 'number') {
          tagIds.push(tagItem);
        } else if (typeof tagItem === 'string' && tagItem.trim()) {
          const sanitizedTag = formatTagName(tagItem.trim());
          if (!sanitizedTag || sanitizedTag.length < 2) continue;
          const { data: existing } = await admin
            .from('tags')
            .select('id')
            .eq('slug', sanitizedTag)
            .single();

          if (existing) {
            tagIds.push(existing.id);
          } else {
            const { data: newTag } = await admin
              .from('tags')
              .insert({ name: sanitizedTag, slug: sanitizedTag })
              .select('id')
              .single();
            if (newTag) tagIds.push(newTag.id);
          }
        }
      }

      if (tagIds.length > 0) {
        await admin
          .from('post_tags')
          .insert(tagIds.map(tag_id => ({ post_id: post.id, tag_id })));
      }
    }

    // First post / Comeback post notification for followers
    if (postStatus === 'published') {
      const { count: publishedCount } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .eq('status', 'published');

      const isFirstPost = publishedCount === 1;

      let isComebackPost = false;
      if (!isFirstPost) {
        const { data: lastPost } = await admin
          .from('posts')
          .select('published_at')
          .eq('author_id', user.id)
          .eq('status', 'published')
          .neq('id', post.id)
          .order('published_at', { ascending: false })
          .limit(1)
          .single();

        if (lastPost?.published_at) {
          const daysSinceLast = (Date.now() - new Date(lastPost.published_at).getTime()) / (1000 * 60 * 60 * 24);
          isComebackPost = daysSinceLast >= 30;
        }
      }

      if (isFirstPost || isComebackPost) {
        const { data: followers } = await admin
          .from('follows')
          .select('follower_id')
          .eq('following_id', user.id);

        const notifType = isFirstPost ? 'first_post' : 'comeback_post';
        const notifContent = isFirstPost ? 'İlk gönderisini yayınladı!' : 'Uzun bir aradan sonra yeni gönderi yayınladı!';

        for (const f of (followers || []).slice(0, 100)) {
          await createNotification({
            admin,
            user_id: f.follower_id,
            actor_id: user.id,
            type: notifType,
            object_type: 'post',
            object_id: post.id,
            content: notifContent,
          });
        }
      }
    }

    if (postStatus === 'published') {
      revalidateTag('posts', { expire: 0 });
    }

    const response: Record<string, unknown> = { post };
    if (moderationAction === 'moderation') {
      response.moderation = true;
      response.message = 'Gönderiniz incelemeye alındı. Moderatörler onayladıktan sonra yayınlanacak.';
    }
    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
