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
import { reconcileSoundStatus } from '@/lib/soundLifecycle';
import { getTranslations } from 'next-intl/server';
import { cleanupPostData, extractR2KeysFromContent } from '@/lib/postCleanup';
import { deleteFromR2, r2KeyFromUrl } from '@/lib/r2';
import sanitizeHtml from 'sanitize-html';
import { getPostTagIds, syncPublishedTagCounts } from '@/lib/tagCounts';
import { getAuthorContent, getFeaturedContent } from '@/lib/postPageRecommendations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const tErrors = await getTranslations("apiErrors");

    const isSlug = isNaN(Number(id));
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, is_premium, status, account_private),
        post_tags(tag_id, tags(id, name, slug)),
        sounds!posts_sound_id_fkey(id, title, artist, audio_url, duration, status, cover_image_url, is_original)
      `)
      .eq(isSlug ? 'slug' : 'id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });
    }

    // Parallel: auth + boost info
    const adminClient = createAdminClient();
    const [{ data: { user } }, { data: boostRecord }] = await Promise.all([
      supabase.auth.getUser(),
      adminClient.from('post_boosts')
        .select('id, impressions, clicks, boost_code, status')
        .eq('post_id', post.id)
        .in('status', ['pending_review', 'active', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Check if viewer is staff (admin/moderator)
    let isStaff = false;
    if (user) {
      const { data: viewerP } = await adminClient.from('profiles').select('role').eq('user_id', user.id).single();
      isStaff = viewerP?.role === 'admin' || viewerP?.role === 'moderator';
    }

    // Draft / removed / moderation check: only author or staff can see
    if (post.status !== 'published') {
      if (!isStaff && (!user || user.id !== post.author_id)) {
        return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });
      }
    } else {
      // NSFW check: only author or staff can see NSFW posts
      if (post.is_nsfw && !isStaff) {
        if (!user || user.id !== post.author_id) {
          return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });
        }
      }
      // Published post: check author status (staff bypasses)
      const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      if (!isStaff && author?.status && author.status !== 'active') {
        return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });
      }
      // Private account check (staff bypasses)
      if (!isStaff && author?.account_private) {
        if (!user || user.id !== post.author_id) {
          const { data: follow } = await adminClient
            .from('follows').select('id')
            .eq('follower_id', user?.id || '')
            .eq('following_id', post.author_id).maybeSingle();
          if (!follow) return NextResponse.json({ error: 'private_account', redirect: `/u/${author?.username}` }, { status: 403 });
        }
      }
    }

    const is_boosted = !!boostRecord;
    const boost_status = boostRecord?.status || null;
    const isOwnPost = user && user.id === post.author_id;
    const boost_stats = is_boosted && isOwnPost && boostRecord ? {
      impressions: boostRecord.impressions || 0,
      clicks: boostRecord.clicks || 0,
      boost_code: boostRecord.boost_code,
    } : null;

    // Fetch related content (author + featured) in parallel
    const locale = request.headers.get("x-locale") || request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] || "en";
    const ipCountry = (request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "").toUpperCase();
    const [authorContent, featuredContent] = await Promise.all([
      getAuthorContent(post.author_id, post.id, locale, ipCountry).catch(() => []),
      getFeaturedContent(post.id, post.author_id, locale, ipCountry).catch(() => []),
    ]);
    const related = [...authorContent, ...featuredContent];

    return NextResponse.json({ post: { ...post, is_boosted, boost_stats, boost_status }, related });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    // Check ownership
    const { data: existing } = await supabase
      .from('posts')
      .select('id, author_id, status, title, content, slug, content_type, word_count, featured_image, video_url, video_duration, video_thumbnail, copyright_protected, sound_id')
      .eq('id', id)
      .single();

    if (!existing || existing.author_id !== user.id) {
      return NextResponse.json({ error: tErrors("unauthorizedAction") }, { status: 403 });
    }

    // Block editing if post has active boosts
    const adminForEditCheck = createAdminClient();
    const { data: editBoost } = await adminForEditCheck
      .from('post_boosts')
      .select('id')
      .eq('post_id', Number(id))
      .in('status', ['active', 'pending_review', 'paused'])
      .limit(1)
      .maybeSingle();
    if (editBoost) {
      return NextResponse.json({ error: tErrors("activeBoostEditWarning") }, { status: 400 });
    }

    const body = await request.json();
    const { title, content, status, tags, featured_image, excerpt: customExcerpt, meta_title, meta_description, meta_keywords, allow_comments, is_for_kids, is_ai_content, video_url, video_duration, video_thumbnail, content_type, copyright_protected, sound_id, frame_hashes: clientFrameHashes, visibility, nsfw_frame_urls } = body;
    const isVideo = content_type === 'video' || content_type === 'moment' || existing.content_type === 'video' || existing.content_type === 'moment';
    const isMoment = content_type === 'moment' || existing.content_type === 'moment';
    const hasLockedPublishedFields = existing.status === 'published';

    // Check if user is admin (needed for copyright protection rules)
    const { data: updaterProfileEarly } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
    const isAdminEarly = updaterProfileEarly?.role === 'admin';

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Sound update
    if (sound_id !== undefined) updates.sound_id = sound_id || null;

    if (title !== undefined) {
      const trimmedTitle = (typeof title === 'string' ? title : '').trim();
      if (!isMoment && trimmedTitle.length < VALIDATION.postTitle.min) {
        return NextResponse.json({ error: tErrors("titleMinLength", { min: VALIDATION.postTitle.min }) }, { status: 400 });
      }
      if (trimmedTitle.length > VALIDATION.postTitle.max) {
        return NextResponse.json({ error: tErrors("titleMaxLength", { max: VALIDATION.postTitle.max }) }, { status: 400 });
      }
      if (/<[^>]+>/.test(trimmedTitle)) {
        return NextResponse.json({ error: tErrors("titleNoHtml") }, { status: 400 });
      }
      if (/^(https?:\/\/|www\.)\S+$/i.test(trimmedTitle)) {
        return NextResponse.json({ error: tErrors("titleNoUrl") }, { status: 400 });
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
      // Truncate figcaption text to max 60 chars
      updates.content = sanitizedContent.replace(/<figcaption>([\s\S]*?)<\/figcaption>/gi, (_, text) => {
        const trimmed = text.trim();
        if (!trimmed) return '';
        return `<figcaption>${trimmed.slice(0, 60)}</figcaption>`;
      });
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

    if (featured_image !== undefined) {
      const img = featured_image || null;
      updates.featured_image = (img && typeof img === 'string' && img.toLowerCase().endsWith('.gif')) ? null : img;
    }
    if (allow_comments !== undefined && !hasLockedPublishedFields) updates.allow_comments = allow_comments !== false;
    if (is_for_kids !== undefined && !hasLockedPublishedFields) updates.is_for_kids = is_for_kids === true;
    if (is_ai_content !== undefined && !hasLockedPublishedFields) updates.is_ai_content = is_ai_content === true;
    if (visibility !== undefined && ['public', 'followers', 'only_me'].includes(visibility) && existing.status !== 'published') updates.visibility = visibility;
    if (copyright_protected !== undefined && !hasLockedPublishedFields) {
      // Prevent non-admin from disabling copyright_protected once enabled
      if (existing.copyright_protected && copyright_protected === false && !isAdminEarly) {
        // Silently keep as true — user cannot disable
        updates.copyright_protected = true;
      } else {
        updates.copyright_protected = copyright_protected === true;
      }
    }
    // SEO meta fields — always allow updates (even for published posts)
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

    // SEO generation on publish (when not manually provided)
    const isPublishing = updates.status === 'published' || (existing.status === 'published' && (updates.title || updates.content));
    const isNoteType = existing.content_type === 'note';

    if (isPublishing && (!manualDesc || !manualKw)) {
      const ft = (updates.title as string) || existing.title;
      const fc = (updates.content as string) || existing.content || '';
      const tagNames = (tags || []).filter((t: unknown) => typeof t === 'string') as string[];
      if (isNoteType) {
        // Notes: derive directly from content, no AI
        if (!manualDesc) updates.meta_description = generateMetaDescription(ft, fc);
        if (!manualKw) {
          const cands = generateMetaKeywords(ft, fc, { slug: existing.slug, tags: tagNames });
          updates.meta_keywords = cands.split(', ')[0] || ft;
        }
      } else {
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
    }


    // If content is cleared, remove it from moderation and keep as draft
    if (contentCleared) {
      updates.status = 'draft';
      updates.published_at = null;
      updates.is_nsfw = false;
      updates.moderation_due_at = null;
    }

    // Clean up old R2 media when replaced (background)
    const oldR2Keys: string[] = [];
    if (video_url !== undefined && existing.video_url && video_url !== existing.video_url) {
      const k = r2KeyFromUrl(existing.video_url); if (k) oldR2Keys.push(k);
    }
    if (video_thumbnail !== undefined && existing.video_thumbnail && video_thumbnail !== existing.video_thumbnail) {
      const k = r2KeyFromUrl(existing.video_thumbnail); if (k) oldR2Keys.push(k);
    }
    if (featured_image !== undefined && existing.featured_image && featured_image !== existing.featured_image) {
      const k = r2KeyFromUrl(existing.featured_image); if (k) oldR2Keys.push(k);
    }
    // Detect inline images removed from content
    if (content !== undefined && existing.content) {
      const oldImgKeys = extractR2KeysFromContent(existing.content);
      const newImgKeys = new Set(extractR2KeysFromContent((updates.content as string) || ''));
      for (const k of oldImgKeys) { if (!newImgKeys.has(k)) oldR2Keys.push(k); }
    }
    if (oldR2Keys.length > 0) {
      after(async () => {
        for (const k of oldR2Keys) await deleteFromR2(k).catch(() => {});
      });
    }

    // Auto-reupload external images to R2 on publish (server-side fallback)
    const effectiveContentType = existing.content_type || 'post';
    const effectiveStatus = (updates.status as string) || existing.status;
    const wasPublished = existing.status === 'published';
    const willBePublished = effectiveStatus === 'published';
    if (effectiveStatus === 'published' && effectiveContentType === 'post' && updates.content) {
      const { reuploadExternalImagesServer } = await import('@/lib/reuploadExternalImages.server');
      updates.content = await reuploadExternalImagesServer(updates.content as string);
    }

    // Moderation policy update:
    // - Always allow publishing
    // - Run AI moderation in background
    //   - Images flagged/block => NSFW + moderation_due_at = now
    //   - Text severe (block) => NSFW + moderation_due_at = now
    //   - Text mild (flag) => no change
    let runAsyncModeration = false;
    if (updates.status === 'published' || (existing.status === 'published' && (updates.title || updates.content || updates.featured_image || updates.video_thumbnail))) {
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

    // Reconcile sound status if sound_id changed OR post status changed
    const statusChanged = updates.status && updates.status !== existing.status;
    if (sound_id !== undefined) {
      const oldSoundId = existing.sound_id as number | null;
      const newSoundId = (sound_id || null) as number | null;
      if (oldSoundId !== newSoundId) {
        if (oldSoundId) {
          const capturedOld = oldSoundId;
          after(async () => {
            try { await reconcileSoundStatus(createAdminClient(), capturedOld); } catch {}
          });
        }
        if (newSoundId) {
          const capturedNew = newSoundId;
          after(async () => {
            try { await reconcileSoundStatus(createAdminClient(), capturedNew); } catch {}
          });
        }
      }
    } else if (statusChanged && existing.sound_id) {
      const capturedSid = existing.sound_id as number;
      after(async () => {
        try { await reconcileSoundStatus(createAdminClient(), capturedSid); } catch {}
      });
    }

    // Handle tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      const admin = createAdminClient();
      const oldTagIds = await getPostTagIds(admin, Number(id));

      // Remove old tags
      await admin.from('post_tags').delete().eq('post_id', id);

      const rawTagIds: number[] = [];
      for (const tagItem of tags.slice(0, VALIDATION.postTags.max)) {
        if (typeof tagItem === 'number') {
          rawTagIds.push(tagItem);
        } else if (typeof tagItem === 'string' && tagItem.trim()) {
          const sanitizedTag = formatTagName(tagItem.trim());
          if (!sanitizedTag || sanitizedTag.length < 2) continue;
          const { data: existingTag } = await admin
            .from('tags')
            .select('id')
            .eq('slug', sanitizedTag)
            .single();

          if (existingTag) {
            rawTagIds.push(existingTag.id);
          } else {
            const { data: newTag } = await admin
              .from('tags')
              .insert({ name: sanitizedTag, slug: sanitizedTag })
              .select('id')
              .single();
            if (newTag) rawTagIds.push(newTag.id);
          }
        }
      }

      const tagIds = [...new Set(rawTagIds)];

      if (tagIds.length > 0) {
        await admin
          .from('post_tags')
          .insert(tagIds.map(tag_id => ({ post_id: Number(id), tag_id })));
      }

      await syncPublishedTagCounts(admin, {
        oldTagIds,
        newTagIds: tagIds,
        wasPublished,
        willBePublished,
      });

      // Re-classify post interests (background)
      const capturedTagIds = [...tagIds];
      const capturedPostId = Number(id);
      after(async () => {
        const { classifyAndStorePostInterests } = await import('@/lib/interests');
        await classifyAndStorePostInterests(createAdminClient(), capturedPostId, capturedTagIds);
      });
    } else if (wasPublished !== willBePublished) {
      const admin = createAdminClient();
      const currentTagIds = await getPostTagIds(admin, Number(id));
      await syncPublishedTagCounts(admin, {
        oldTagIds: currentTagIds,
        newTagIds: currentTagIds,
        wasPublished,
        willBePublished,
      });
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
              copyrightUpdates.moderation_category = copyrightResult.category || 'kopya_icerik';
              copyrightUpdates.copyright_match_id = copyrightResult.matchedPostId;
              copyrightUpdates.copyright_similarity = copyrightResult.similarity;

              if (copyrightResult.matchType === 'exact') {
                copyrightUpdates.is_nsfw = true;
                copyrightUpdates.moderation_due_at = new Date().toISOString();
                // Note: editing of boosted posts is blocked at the top of PUT handler
              }

              // Notify original author
              if (copyrightResult.matchedAuthorId && copyrightResult.matchedPostId) {
                try {
                  const tNotif = await getTranslations("notifications");
                  await createNotification({
                    admin,
                    user_id: copyrightResult.matchedAuthorId,
                    actor_id: copyrightResult.matchedAuthorId,
                    type: 'copyright_similar_detected',
                    object_type: 'post',
                    object_id: Number(id),
                    content: tNotif("copyrightSimilarDetected", { similarity: copyrightResult.similarity }),
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
            // Video frame samples for NSFW check
            if (isVideo && Array.isArray(nsfw_frame_urls)) {
              const ALLOWED_CDN = /^https:\/\/(r2-cdn|cdn)\.feedim\.com\//;
              const validFrameUrls = nsfw_frame_urls
                .filter((u: unknown) => typeof u === 'string' && ALLOWED_CDN.test(u as string))
                .slice(0, 8);
              for (const frameUrl of validFrameUrls) {
                moderationHtml += `<img src="${(frameUrl as string).replace(/"/g, '&quot;')}" />`;
              }
            }
            const imgRes = await checkNsfwContent(moderationHtml);
            const imgHint = imgRes.action !== 'allow'
              ? `flagged,count=${imgRes.flaggedCount},reason=${imgRes.reason || 'n/a'}`
              : 'none';
            const txtRes = await checkTextContent(finalTitle, moderationHtml, {
              contentType: isVideo ? 'video' : (existing.content_type === 'note' ? 'note' : 'post'),
              imageHint: imgHint,
              linkCount: (finalContent.replace(/<[^>]+>/g, ' ').match(/https?:\/\//g) || []).length,
            });

            let shouldNSFW = false;
            if (imgRes.action !== 'allow') shouldNSFW = true;
            if (txtRes.safe === false) shouldNSFW = true;

            const tModFallback = await getTranslations("apiErrors");
            const modUpdates: Record<string, unknown> = shouldNSFW
              ? {
                  is_nsfw: true,
                  moderation_due_at: new Date().toISOString(),
                  moderation_reason: txtRes.reason || imgRes.reason || tModFallback("contentReviewRequired"),
                  moderation_category: txtRes.category || (imgRes.action !== 'allow' ? (imgRes.reason || 'nsfw_image') : null),
                }
              : { is_nsfw: false, moderation_due_at: null, moderation_reason: null, moderation_category: null };

            await admin.from('posts').update(modUpdates).eq('id', post.id);

            // AI moderation decision record + auto-pause active boosts
            if (shouldNSFW) {
              try {
                const tModErrors = await getTranslations("apiErrors");
                await admin.from('moderation_decisions').insert({
                  target_type: 'post', target_id: String(post.id), decision: 'flagged', reason: txtRes.reason || imgRes.reason || tModErrors('flaggedByAi'), moderator_id: 'system',
                });
              } catch {}
              // Auto-pause active boosts when post enters moderation
              try {
                await admin
                  .from('post_boosts')
                  .update({ status: 'paused', updated_at: new Date().toISOString() })
                  .eq('post_id', post.id)
                  .eq('status', 'active');
              } catch {}
            }

            // Tag metadata moderation — only if content is clean
            if (!isAdmin && !shouldNSFW && capturedTags && Array.isArray(capturedTags)) {
              const tagStrings = capturedTags.filter((t: unknown) => typeof t === 'string' && (t as string).trim()) as string[];
              if (tagStrings.length > 0) {
                const metaRes = await checkMetadataContent({ tags: tagStrings });
                if (!metaRes.safe) {
                  const tTagErrors = await getTranslations("apiErrors");
                  await admin.from('posts').update({
                    is_nsfw: true,
                    moderation_due_at: new Date().toISOString(),
                    moderation_reason: metaRes.reason || tTagErrors("tagContentInappropriate"),
                    moderation_category: metaRes.category || null,
                  }).eq('id', post.id);
                  // Auto-pause active boosts
                  try {
                    await admin
                      .from('post_boosts')
                      .update({ status: 'paused', updated_at: new Date().toISOString() })
                      .eq('post_id', post.id)
                      .eq('status', 'active');
                  } catch {}
                }
              }
            }
          }
        } catch {}
      });
    }

    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const { data: existing } = await supabase
      .from('posts')
      .select('id, author_id, status, sound_id, featured_image, video_url, video_thumbnail, content')
      .eq('id', id)
      .single();

    // Post already deleted — treat as idempotent success
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    if (existing.author_id !== user.id) {
      return NextResponse.json({ error: tErrors("unauthorizedAction") }, { status: 403 });
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const postId = Number(id);

    // Block deletion if post has an active/started boost
    const { data: activeBoost } = await admin
      .from('post_boosts')
      .select('id, status, starts_at')
      .eq('post_id', postId)
      .in('status', ['active', 'paused', 'pending_review'])
      .limit(1)
      .maybeSingle();

    if (activeBoost) {
      if (activeBoost.starts_at || activeBoost.status === 'active' || activeBoost.status === 'paused') {
        return NextResponse.json(
          { error: tErrors("activeAdCannotDelete") },
          { status: 400 }
        );
      }
      if (activeBoost.status === 'pending_review') {
        await admin
          .from('post_boosts')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('post_id', postId)
          .eq('status', 'pending_review');
      }
    }

    // Clean up all associated data + R2 media + sound lifecycle
    await cleanupPostData(admin, postId, existing);

    const { error } = await supabase.from('posts').delete().eq('id', id);

    if (error) {
      return safeError(error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
