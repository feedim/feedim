import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { slugify, calculateReadingTime, generateExcerpt, formatTagName } from '@/lib/utils';
import { generateMetaTitle, generateMetaDescription, generateMetaKeywords, generateSeoFieldsAI } from '@/lib/seo';
import { VALIDATION } from '@/lib/constants';
import { checkNsfwContent } from '@/lib/nsfwCheck';
import { checkTextContent, checkMetadataContent } from '@/lib/moderation';
import { checkCopyrightUnified, computeContentHash, stripHtmlToText, normalizeForComparison, computeImageHashFromUrl, COPYRIGHT_THRESHOLDS } from '@/lib/copyright';
import { createNotification } from '@/lib/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/apiError';
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
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, is_premium, status, account_private),
        post_tags(tag_id, tags(id, name, slug)),
        post_categories(category_id, categories(id, name, slug)),
        sounds!posts_sound_id_fkey(id, title, artist, audio_url, duration, status, cover_image_url, is_original)
      `)
      .eq(isSlug ? 'slug' : 'id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
    }

    // Check if viewer is staff (admin/moderator)
    const { data: { user } } = await supabase.auth.getUser();
    let isStaff = false;
    if (user) {
      const adminClient = createAdminClient();
      const { data: viewerP } = await adminClient.from('profiles').select('role').eq('user_id', user.id).single();
      isStaff = viewerP?.role === 'admin' || viewerP?.role === 'moderator';
    }

    // Draft / removed / moderation check: only author or staff can see
    if (post.status !== 'published') {
      if (!isStaff && (!user || user.id !== post.author_id)) {
        return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
      }
    } else {
      // NSFW check: only author or staff can see NSFW posts
      if (post.is_nsfw && !isStaff) {
        if (!user || user.id !== post.author_id) {
          return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
        }
      }
      // Published post: check author status (staff bypasses)
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      if (!isStaff && author?.status && author.status !== 'active') {
        return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 });
      }
      // Private account check (staff bypasses)
      if (!isStaff && author?.account_private) {
        if (!user || user.id !== post.author_id) {
          const adminClient = createAdminClient();
          const { data: follow } = await adminClient
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
      .select('id, author_id, status, title, content, slug, content_type, word_count, featured_image, video_url, video_duration, video_thumbnail, copyright_protected')
      .eq('id', id)
      .single();

    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: 'Yetkisiz işlem' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, status, tags, category_id, featured_image, excerpt: customExcerpt, meta_title, meta_description, meta_keywords, allow_comments, is_for_kids, is_ai_content, video_url, video_duration, video_thumbnail, content_type, copyright_protected, sound_id, frame_hashes: clientFrameHashes, visibility } = body;
    const isVideo = content_type === 'video' || content_type === 'moment' || existing.content_type === 'video' || existing.content_type === 'moment';

    // Check if user is admin (needed for copyright protection rules)
    const { data: updaterProfileEarly } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
    const isAdminEarly = updaterProfileEarly?.role === 'admin';

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Sound update
    if (sound_id !== undefined) updates.sound_id = sound_id || null;

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

    let contentCleared = false;
    if (content !== undefined) {
      const sanitizedContent = isVideo
        ? sanitizeHtml(content || '', { allowedTags: ['br', 'strong', 'p'], allowedAttributes: {} })
        : sanitizeHtml(content, {
            allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'],
            allowedAttributes: { 'a': ['href', 'target', 'rel'], 'img': ['src', 'alt'], '*': ['class'] },
          });
      updates.content = sanitizedContent;
      if (!isVideo) {
        const textContent = sanitizedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, '').trim();
        const hasImage = /<img\s/i.test(sanitizedContent);
        if (!textContent && !hasImage) {
          contentCleared = true;
        }
      }
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
    if (is_ai_content !== undefined) updates.is_ai_content = is_ai_content === true;
    if (visibility !== undefined && ['public', 'followers', 'only_me'].includes(visibility)) updates.visibility = visibility;
    if (copyright_protected !== undefined) {
      // Prevent non-admin from disabling copyright_protected once enabled
      if (existing.copyright_protected && copyright_protected === false && !isAdminEarly) {
        // Silently keep as true — user cannot disable
        updates.copyright_protected = true;
      } else {
        updates.copyright_protected = copyright_protected === true;
      }
    }
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


    // If content is cleared, remove it from moderation and keep as draft
    if (contentCleared) {
      updates.status = 'draft';
      updates.published_at = null;
      updates.is_nsfw = false;
      updates.moderation_due_at = null;
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
      return safeError(error);
    }

    // If content cleared, remove related moderation artifacts (reports/logs/decisions)
    if (contentCleared) {
      try {
        const admin = createAdminClient();
        await Promise.all([
          admin.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(id)),
          admin.from('moderation_decisions').delete().eq('target_type', 'post').eq('target_id', String(id)),
          admin.from('moderation_logs').delete().eq('target_type', 'post').eq('target_id', String(id)),
        ]);
      } catch {}
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

    // Store video frame hashes if provided
    if (clientFrameHashes && Array.isArray(clientFrameHashes) && clientFrameHashes.length > 0 && isVideo) {
      const frameHashes = clientFrameHashes
        .filter((fh: any) => typeof fh.frameIndex === 'number' && typeof fh.hash === 'string' && fh.hash.length === 16)
        .slice(0, 600);
      if (frameHashes.length > 0) {
        try {
          const admin = createAdminClient();
          // Delete old hashes first
          await admin.from('video_frame_hashes').delete().eq('post_id', Number(id));
          await admin.from('video_frame_hashes').insert(
            frameHashes.map((fh: any) => ({
              post_id: Number(id),
              frame_index: fh.frameIndex,
              frame_hash: fh.hash,
            }))
          );
        } catch {}
      }
    }

    // Background AI moderation + copyright check — admin immune
    const { data: updaterProfile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
    const isAdmin = updaterProfile?.role === 'admin';

    // Check if post was previously approved by a moderator — skip re-flagging
    let isApprovedByModerator = false;
    if (runAsyncModeration && post && !isAdmin) {
      try {
        const adminCheck = createAdminClient();
        const { data: approvalRecord } = await adminCheck
          .from('moderation_decisions')
          .select('id')
          .eq('target_type', 'post')
          .eq('target_id', String(post.id))
          .eq('decision', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);
        isApprovedByModerator = !!(approvalRecord && approvalRecord.length > 0);
      } catch {}
    }

    if (runAsyncModeration && post && !isAdmin && !isApprovedByModerator) {
      const finalTitle = (updates.title as string) || existing.title;
      const finalContent = (updates.content as string) || existing.content || '';
      const admin = createAdminClient();
      const capturedTags = tags;
      after(async () => {
        try {
          // Unified copyright check with content-type routing
          let copyrightFlagged = false;
          const contentTypeVal = existing.content_type || 'post';
          const wc = updates.word_count as number || existing.word_count || 0;

          try {
            const plainText = stripHtmlToText(finalContent);
            const normalizedForHash = contentTypeVal === 'moment'
              ? normalizeForComparison(`${finalTitle} ${plainText}`)
              : normalizeForComparison(plainText);
            const words = normalizedForHash.split(/\s+/).filter(Boolean);
            const contentHash = words.length >= 8 ? computeContentHash(normalizedForHash) : null;
            const imgUrl = (updates.featured_image as string) || (updates.video_thumbnail as string) || existing.featured_image || null;
            let imgHash: string | null = null;
            if (imgUrl) imgHash = await computeImageHashFromUrl(imgUrl);

            // Get frame hashes for video content
            let frameHashesForCheck: { frameIndex: number; hash: string }[] | undefined;
            if (contentTypeVal === 'video' || contentTypeVal === 'moment') {
              try {
                const { data: existingFrameHashes } = await admin
                  .from('video_frame_hashes')
                  .select('frame_index, frame_hash')
                  .eq('post_id', post.id)
                  .order('frame_index', { ascending: true });
                if (existingFrameHashes && existingFrameHashes.length > 0) {
                  frameHashesForCheck = existingFrameHashes.map(fh => ({
                    frameIndex: fh.frame_index,
                    hash: fh.frame_hash,
                  }));
                }
              } catch {}
            }

            const copyrightResult = await checkCopyrightUnified(
              admin, finalTitle, finalContent, user.id, contentTypeVal, wc, {
                featuredImage: imgUrl,
                videoUrl: (updates.video_url as string) || existing.video_url || null,
                videoDuration: (updates.video_duration as number) || existing.video_duration || null,
                videoThumbnail: (updates.video_thumbnail as string) || existing.video_thumbnail || null,
                imageHash: imgHash,
                postId: post.id,
                frameHashes: frameHashesForCheck,
              },
            );

            const copyrightUpdates: Record<string, unknown> = { content_hash: contentHash };
            if (imgHash) copyrightUpdates.image_hash = imgHash;

            if (copyrightResult.flagged) {
              copyrightFlagged = true;
              copyrightUpdates.moderation_reason = copyrightResult.reason;
              copyrightUpdates.moderation_category = copyrightResult.category || 'copyright';
              copyrightUpdates.copyright_match_id = copyrightResult.matchedPostId;
              copyrightUpdates.copyright_similarity = copyrightResult.similarity;

              if (copyrightResult.matchType === 'exact') {
                copyrightUpdates.is_nsfw = true;
                copyrightUpdates.moderation_due_at = new Date().toISOString();
              }

              // Notify original author
              if (copyrightResult.matchedAuthorId && copyrightResult.matchedPostId) {
                try {
                  await createNotification({
                    admin,
                    user_id: copyrightResult.matchedAuthorId,
                    actor_id: copyrightResult.matchedAuthorId,
                    type: 'copyright_similar_detected',
                    object_type: 'post',
                    object_id: Number(id),
                    content: `Telif hakkı korumalı içeriğinize benzer bir içerik tespit edildi (%${copyrightResult.similarity}). İçerik engellendi. Görüntülemek için tıkla.`,
                  });
                } catch {}
              }

            } else {
              // Clear copyright fields if no longer matching
              copyrightUpdates.copyright_match_id = null;
              copyrightUpdates.copyright_similarity = null;
            }

            await admin.from('posts').update(copyrightUpdates).eq('id', post.id);
          } catch {}

          // AI moderation — skip if already flagged by copyright
          if (!copyrightFlagged) {
            // Include featured image + video thumbnail in NSFW scan
            const featImg = (updates.featured_image as string) || existing.featured_image || '';
            const vidThumb = (updates.video_thumbnail as string) || existing.video_thumbnail || '';
            let moderationHtml = finalContent;
            if (featImg) moderationHtml += `<img src="${featImg.replace(/"/g, '&quot;')}" />`;
            if (isVideo && vidThumb) moderationHtml += `<img src="${vidThumb.replace(/"/g, '&quot;')}" />`;
            const imgRes = await checkNsfwContent(moderationHtml);
            const scoreStr = imgRes.maxScores
              ? `Porn=${(imgRes.maxScores.Porn).toFixed(2)},Sexy=${(imgRes.maxScores.Sexy).toFixed(2)},Hentai=${(imgRes.maxScores.Hentai).toFixed(2)},Neutral=${(imgRes.maxScores.Neutral).toFixed(2)}`
              : '';
            const imgHint = imgRes.action !== 'allow'
              ? `flaggedCount=${imgRes.flaggedCount},reason=${imgRes.reason || 'n/a'},scores=${scoreStr}`
              : (scoreStr ? `none,scores=${scoreStr}` : 'none');
            const txtRes = await checkTextContent(finalTitle, moderationHtml, {
              contentType: isVideo ? 'video' : 'post',
              imageHint: imgHint,
              linkCount: (finalContent.replace(/<[^>]+>/g, ' ').match(/https?:\/\//g) || []).length,
            });

            let shouldNSFW = false;
            if (imgRes.action !== 'allow') shouldNSFW = true;
            if (txtRes.safe === false) shouldNSFW = true;

            const modUpdates: Record<string, unknown> = shouldNSFW
              ? {
                  is_nsfw: true,
                  moderation_due_at: new Date().toISOString(),
                  moderation_reason: txtRes.reason || imgRes.reason || 'İçerik inceleme gerektiriyor',
                  moderation_category: txtRes.category || (imgRes.action !== 'allow' ? (imgRes.reason || 'nsfw_image') : null),
                }
              : { is_nsfw: false, moderation_due_at: null, moderation_reason: null, moderation_category: null };

            await admin.from('posts').update(modUpdates).eq('id', post.id);

            // AI moderation decision record
            if (shouldNSFW) {
              try {
                const aiCode = String(Math.floor(100000 + Math.random() * 900000));
                await admin.from('moderation_decisions').insert({
                  target_type: 'post', target_id: String(post.id), decision: 'flagged', reason: txtRes.reason || imgRes.reason || 'Feedim AI tarafından işaretlendi', moderator_id: 'system', decision_code: aiCode,
                });
              } catch {}
            }

            // Tag metadata moderation — only if content is clean
            if (!shouldNSFW && capturedTags && Array.isArray(capturedTags)) {
              const tagStrings = capturedTags.filter((t: unknown) => typeof t === 'string' && (t as string).trim()) as string[];
              if (tagStrings.length > 0) {
                const metaRes = await checkMetadataContent({ tags: tagStrings });
                if (!metaRes.safe) {
                  await admin.from('posts').update({
                    is_nsfw: true,
                    moderation_due_at: new Date().toISOString(),
                    moderation_reason: metaRes.reason || 'Tag içeriği uygunsuz',
                    moderation_category: metaRes.category || null,
                  }).eq('id', post.id);
                }
              }
            }
          }
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
      admin.from('reports').delete().eq('content_type', 'post').eq('content_id', postId),
      admin.from('moderation_decisions').delete().eq('target_type', 'post').eq('target_id', String(postId)),
      admin.from('moderation_logs').delete().eq('target_type', 'post').eq('target_id', String(postId)),
    ]);

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      return safeError(error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
