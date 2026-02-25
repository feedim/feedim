import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { slugify, generateSlugHash, calculateReadingTime, generateExcerpt, formatTagName } from '@/lib/utils';
import { getProfileSignals } from '@/lib/modSignals';
import { generateMetaTitle, generateMetaDescription, generateMetaKeywords, generateSeoFieldsAI } from '@/lib/seo';
import { VALIDATION, MOMENT_MAX_DURATION, CONTENT_TYPES } from '@/lib/constants';
import { getUserPlan, checkHourlyPostLimit, logRateLimitHit } from '@/lib/limits';
import { moderateContent } from '@/lib/moderation';
import { checkCopyrightUnified, computeContentHash, stripHtmlToText, normalizeForComparison, computeImageHashFromUrl, COPYRIGHT_THRESHOLDS } from '@/lib/copyright';
import { sendEmail, getEmailIfEnabled, moderationReviewEmail } from '@/lib/email';
import { revalidateTag } from 'next/cache';
import { after } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { getTranslations } from 'next-intl/server';

export async function POST(request: NextRequest) {
  const tErrors = await getTranslations('apiErrors');
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check if user is admin (immune to moderation, copyright, rate limits)
    const { data: userProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
    const isAdmin = userProfile?.role === 'admin';

    // Hourly post rate limit
    const plan = await getUserPlan(admin, user.id);
    const { allowed: postAllowed, limit: postLimit } = await checkHourlyPostLimit(admin, user.id, plan);
    if (!postAllowed && !isAdmin) {
      logRateLimitHit(admin, user.id, 'post', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim());
      return NextResponse.json(
        { error: tErrors('postRateLimit', { limit: postLimit }) },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { title, content, status, tags, featured_image, allow_comments, is_for_kids, meta_title, meta_description, meta_keywords, content_type, video_url, video_duration, video_thumbnail, blurhash, image_hash: clientImageHash, copyright_protected, sound_id, frame_hashes: clientFrameHashes, audio_hashes: clientAudioHashes } = body;
    const isVideo = content_type === 'video' || content_type === 'moment';
    const isMoment = content_type === 'moment';
    const isNote = content_type === 'note';

    // Validate title
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: tErrors('titleRequired') }, { status: 400 });
    }
    const trimmedTitle = title.trim();
    if (!isNote && trimmedTitle.length < VALIDATION.postTitle.min) {
      return NextResponse.json({ error: tErrors('titleMinLength', { min: VALIDATION.postTitle.min }) }, { status: 400 });
    }
    if (trimmedTitle.length > VALIDATION.postTitle.max) {
      return NextResponse.json({ error: tErrors('titleMaxLength', { max: VALIDATION.postTitle.max }) }, { status: 400 });
    }
    if (/<[^>]+>/.test(trimmedTitle)) {
      return NextResponse.json({ error: tErrors('titleNoHtml') }, { status: 400 });
    }
    if (/^(https?:\/\/|www\.)\S+$/i.test(trimmedTitle)) {
      return NextResponse.json({ error: tErrors('titleNoUrl') }, { status: 400 });
    }

    // Validate note content
    if (isNote) {
      const noteText = (content || '').replace(/<[^>]+>/g, '').trim();
      if (!noteText) {
        return NextResponse.json({ error: tErrors('noteContentRequired') }, { status: 400 });
      }
      if (noteText.length > VALIDATION.noteContent.max) {
        return NextResponse.json({ error: tErrors('noteMaxLength', { max: VALIDATION.noteContent.max }) }, { status: 400 });
      }
    }

    // Validate content (video posts can have empty content/description)
    if (!isVideo && !isNote && (!content || typeof content !== 'string' || content.trim().length === 0)) {
      return NextResponse.json({ error: tErrors('contentRequired') }, { status: 400 });
    }

    // Validate video fields
    if (isVideo && status === 'published' && !video_url) {
      return NextResponse.json({ error: tErrors('videoUrlRequired') }, { status: 400 });
    }

    // Moment: 60s duration limit
    if (isMoment && video_duration && video_duration > MOMENT_MAX_DURATION) {
      return NextResponse.json({ error: tErrors('momentMaxDuration', { max: MOMENT_MAX_DURATION }) }, { status: 400 });
    }

    // Generate slug
    const slugBase = slugify(trimmedTitle);
    const slugHash = generateSlugHash();
    const slug = `${slugBase}-${slugHash}`;

    // Sanitize content — no iframe support
    const sanitizedContent = isNote
      ? sanitizeHtml(content || '', { allowedTags: ['br', 'p', 'a'], allowedAttributes: { 'a': ['href', 'target', 'rel'] } })
      : isVideo
      ? sanitizeHtml(content || '', { allowedTags: ['br', 'strong', 'p'], allowedAttributes: {} })
      : sanitizeHtml(content, {
          allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption'],
          allowedAttributes: { 'a': ['href', 'target', 'rel'], 'img': ['src', 'alt'], '*': ['class'] },
        });

    // Server-side content validation for published posts (skip for video and note posts)
    if (status === 'published' && !isVideo && !isNote) {
      const textContent = sanitizedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, '').trim();
      const hasImage = /<img\s/i.test(sanitizedContent);

      if (!textContent && !hasImage) {
        return NextResponse.json({ error: tErrors('postContentRequired') }, { status: 400 });
      }
      if (!hasImage && textContent.length < VALIDATION.postContent.minChars) {
        return NextResponse.json({ error: tErrors('postMinChars', { min: VALIDATION.postContent.minChars }) }, { status: 400 });
      }
      // Plan-based word limit: Max users get 15000, others get 5000
      const maxWords = plan === 'max' ? VALIDATION.postContent.maxWordsMax : VALIDATION.postContent.maxWords;
      const wordText = sanitizedContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const wCount = wordText ? wordText.split(' ').length : 0;
      if (wCount > maxWords) {
        return NextResponse.json({ error: plan !== 'max' ? tErrors('postMaxWordsWithUpgrade', { max: maxWords.toLocaleString() }) : tErrors('postMaxWords', { max: maxWords.toLocaleString() }) }, { status: 400 });
      }
      const listItemCount = (sanitizedContent.match(/<li[\s>]/gi) || []).length;
      if (listItemCount > VALIDATION.postContent.maxListItems) {
        return NextResponse.json({ error: tErrors('postMaxListItems', { max: VALIDATION.postContent.maxListItems }) }, { status: 400 });
      }
      if (textContent.length > 0 && /^\d+$/.test(textContent)) {
        return NextResponse.json({ error: tErrors('postOnlyNumbers') }, { status: 400 });
      }
      // Repetition detection
      const rawText = sanitizedContent.replace(/<[^>]+>/g, '');
      if (rawText.length >= 20 && /(.)\1{9,}/.test(rawText)) {
        return NextResponse.json({ error: tErrors('repetitiveContent') }, { status: 400 });
      }
    }

    // Server-side copyright_protected eligibility check
    let copyrightProtectedFinal = copyright_protected === true;
    if (copyrightProtectedFinal && !isAdmin) {
      const { data: cpProfile } = await admin
        .from('profiles')
        .select('copyright_eligible')
        .eq('user_id', user.id)
        .single();
      if (!cpProfile?.copyright_eligible) {
        copyrightProtectedFinal = false;
      }
    }

    // Copyright check (only for published posts — fast, runs before AI moderation)
    let copyrightFlagged = false;
    let copyrightMatchId: number | null = null;
    let copyrightSimilarity: number | null = null;
    let copyrightMatchAuthorId: string | null = null;
    let contentHash: string | null = null;
    let imageHash: string | null = typeof clientImageHash === 'string' && clientImageHash.length === 16 ? clientImageHash : null;
    let copyrightClaimStatus: string | null = null;

    // Validate frame_hashes
    const frameHashes: { frameIndex: number; hash: string }[] = Array.isArray(clientFrameHashes)
      ? clientFrameHashes.filter((fh: any) => typeof fh.frameIndex === 'number' && typeof fh.hash === 'string' && fh.hash.length === 16).slice(0, 600)
      : [];

    // Validate audio_hashes
    const audioHashes: { chunkIndex: number; hash: string }[] = Array.isArray(clientAudioHashes)
      ? clientAudioHashes.filter((ah: any) => typeof ah.chunkIndex === 'number' && typeof ah.hash === 'string' && ah.hash.length === 16).slice(0, 600)
      : [];

    // Content moderation (only for published posts)
    let moderationAction: 'allow' | 'moderation' = 'allow';
    let isNsfw = false;
    let modReason: string | null = null;
    let modCategory: string | null = null;
    if (status === 'published' && !isAdmin) {
      // Unified copyright check with content-type routing (admin bypass) — skip for notes
      if (!isNote) try {
        const { wordCount: wc } = calculateReadingTime(sanitizedContent);
        const contentTypeVal = isMoment ? 'moment' : isVideo ? 'video' : isNote ? 'note' : 'post';
        const imgUrl = featured_image || (isVideo ? video_thumbnail : null);
        if (!imageHash && imgUrl) imageHash = await computeImageHashFromUrl(imgUrl);

        // Compute content hash for storage (body-only for posts and videos, title+body for moments)
        const plainText = stripHtmlToText(sanitizedContent);
        const normalizedForHash = contentTypeVal === 'moment'
          ? normalizeForComparison(`${trimmedTitle} ${plainText}`)
          : normalizeForComparison(plainText);
        contentHash = normalizedForHash.split(/\s+/).filter(Boolean).length >= 8 ? computeContentHash(normalizedForHash) : null;

        const copyrightResult = await checkCopyrightUnified(
          admin, trimmedTitle, sanitizedContent, user.id, contentTypeVal, wc, {
            featuredImage: featured_image || null,
            videoUrl: isVideo ? (video_url || null) : null,
            videoDuration: isVideo ? (video_duration || null) : null,
            videoThumbnail: isVideo ? (video_thumbnail || null) : null,
            imageHash,
            frameHashes: frameHashes.length > 0 ? frameHashes : undefined,
            audioHashes: audioHashes.length > 0 ? audioHashes : undefined,
          },
        );

        if (copyrightResult.flagged) {
          copyrightFlagged = true;
          copyrightMatchId = copyrightResult.matchedPostId;
          copyrightSimilarity = copyrightResult.similarity;
          copyrightMatchAuthorId = copyrightResult.matchedAuthorId;
          modReason = copyrightResult.reason;
          modCategory = copyrightResult.category || 'copyright';
          if (copyrightResult.matchType === 'exact') {
            isNsfw = true;
            moderationAction = 'moderation';
          }
        }
      } catch (err) {
        console.error('[Copyright] POST check error:', err);
      }

      // AI moderation — skip if already flagged by copyright (save cost, notes always run moderation)
      if (!copyrightFlagged) {
        let profileMeta: { profileScore?: number; spamScore?: number } = {};
        try { profileMeta = await getProfileSignals(user.id); } catch {}
        // Include featured image + video thumbnail in NSFW scan
        let moderationHtml = sanitizedContent;
        if (featured_image && typeof featured_image === 'string') moderationHtml += `<img src="${featured_image.replace(/"/g, '&quot;')}" />`;
        if (isVideo && video_thumbnail && typeof video_thumbnail === 'string') moderationHtml += `<img src="${video_thumbnail.replace(/"/g, '&quot;')}" />`;
        const modResult = await moderateContent(trimmedTitle, moderationHtml, {
          contentType: isMoment ? 'moment' : isVideo ? 'video' : 'post',
          ...profileMeta,
        });
        moderationAction = modResult.action;
        if (moderationAction === 'moderation') {
          isNsfw = true;
          modReason = modResult.reason || null;
          modCategory = modResult.category || null;
        }
      }
    }

    // Calculate reading time & word count
    const { wordCount, readingTime } = calculateReadingTime(sanitizedContent);

    // Generate excerpt
    const excerpt = generateExcerpt(sanitizedContent);

    // Determine status — copyright stays published+nsfw, AI moderation holds in queue
    const postStatus = status === 'published'
      ? (moderationAction === 'moderation' && !copyrightFlagged ? 'moderation' : 'published')
      : 'draft';

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

    // Sound handling for moments
    let resolvedSoundId: number | null = null;
    if (isMoment) {
      if (sound_id) {
        // User selected an existing sound — verify it's active and increment usage
        const { data: snd } = await admin.from('sounds').select('id, status').eq('id', sound_id).single();
        if (snd && snd.status === 'active') {
          resolvedSoundId = snd.id;
          const { data: sndData } = await admin.from('sounds').select('usage_count').eq('id', snd.id).single();
          await admin.from('sounds').update({ usage_count: ((sndData as any)?.usage_count || 0) + 1 }).eq('id', snd.id);
        }
      } else if (video_url && video_duration && video_duration > 0) {
        // No sound selected — auto-create "original sound" (skip if no duration = likely no audio)
        try {
          const { data: profile } = await admin.from('profiles').select('username').eq('user_id', user.id).single();
          const username = profile?.username || 'user';
          const soundTitle = trimmedTitle
            ? `${trimmedTitle.slice(0, 50)} - @${username}`
            : `Orijinal ses - @${username}`;
          const { data: origSound } = await admin.from('sounds').insert({
            title: soundTitle,
            audio_url: video_url,
            duration: video_duration || null,
            is_original: true,
            created_by: user.id,
            usage_count: 1,
          }).select('id').single();
          if (origSound) resolvedSoundId = origSound.id;
        } catch {}
      }
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
        content_type: isMoment ? 'moment' : isVideo ? 'video' : isNote ? 'note' : 'post',
        featured_image: featured_image || (isVideo ? video_thumbnail : null) || null,
        video_url: isVideo ? (video_url || null) : null,
        video_duration: isVideo ? (video_duration || null) : null,
        video_thumbnail: isVideo ? (video_thumbnail || null) : null,
        blurhash: typeof blurhash === 'string' && blurhash.length > 0 ? blurhash : null,
        sound_id: resolvedSoundId,
        status: postStatus,
        reading_time: isVideo ? null : isNote ? 1 : readingTime,
        word_count: wordCount,
        allow_comments: allow_comments !== false,
        is_for_kids: is_for_kids === true,
        is_nsfw: isNsfw,
        copyright_protected: copyrightProtectedFinal,
        moderation_reason: modReason,
        moderation_category: modCategory,
        moderation_due_at: (isNsfw || postStatus === 'moderation') ? new Date().toISOString() : null,
        published_at: new Date().toISOString(),
        meta_title: finalMetaTitle,
        meta_description: finalMetaDescription,
        meta_keywords: finalMetaKeywords,
      })
      .select('id, slug, status')
      .single();

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 500 });
    }

    // AI moderation decision record
    if (postStatus === 'moderation' && moderationAction === 'moderation') {
      try {
        const aiCode = String(Math.floor(100000 + Math.random() * 900000));
        await admin.from('moderation_decisions').insert({
          target_type: 'post', target_id: String(post.id), decision: 'flagged', reason: modReason || 'Feedim AI tarafından işaretlendi', moderator_id: 'system', decision_code: aiCode,
        });
      } catch {}
    }

    // Store copyright data separately (columns may not exist yet)
    if (contentHash || copyrightMatchId || imageHash) {
      try {
        const copyrightData: Record<string, unknown> = {};
        if (contentHash) copyrightData.content_hash = contentHash;
        if (imageHash) copyrightData.image_hash = imageHash;
        if (copyrightMatchId) copyrightData.copyright_match_id = copyrightMatchId;
        if (copyrightSimilarity) copyrightData.copyright_similarity = copyrightSimilarity;
        await admin.from('posts').update(copyrightData).eq('id', post.id);
      } catch (err) {
        console.error('[Copyright] Failed to store copyright data:', err);
      }
    }

    // Store video frame hashes
    if (frameHashes.length > 0 && (isVideo || isMoment)) {
      try {
        await admin.from('video_frame_hashes').insert(
          frameHashes.map(fh => ({
            post_id: post.id,
            frame_index: fh.frameIndex,
            frame_hash: fh.hash,
          }))
        );
      } catch (err) {
        console.error('[Copyright] Failed to store frame hashes:', err);
      }
    }

    // Store audio fingerprints
    if (audioHashes.length > 0 && (isVideo || isMoment)) {
      try {
        await admin.from('audio_fingerprints').insert(
          audioHashes.map(ah => ({
            post_id: post.id,
            chunk_index: ah.chunkIndex,
            chunk_hash: ah.hash,
          }))
        );
      } catch (err) {
        console.error('[Copyright] Failed to store audio fingerprints:', err);
      }
    }

    // Copyright claim + verification handling
    if (copyrightProtectedFinal && status === 'published') {
      if (copyrightFlagged && copyrightMatchId && copyrightMatchAuthorId) {
        // Eşleşme VAR → copyright_claim oluştur, post'u pending_verification yap
        copyrightClaimStatus = 'pending_verification';
        try {
          await admin.from('copyright_claims').insert({
            post_id: post.id,
            claimant_id: user.id,
            matched_post_id: copyrightMatchId,
            matched_author_id: copyrightMatchAuthorId,
            status: 'pending',
            claim_type: 'ownership',
            similarity_percent: copyrightSimilarity,
            content_type: isMoment ? 'moment' : isVideo ? 'video' : isNote ? 'note' : 'post',
          });
          await admin.from('posts').update({
            copyright_claim_status: 'pending_verification',
          }).eq('id', post.id);
        } catch (err) {
          console.error('[Copyright] Failed to create copyright claim:', err);
        }
      } else {
        // Eşleşme YOK → otomatik Feedim Telif Hakkı
        try {
          const { data: profile } = await admin.from('profiles').select('username').eq('user_id', user.id).single();
          await admin.from('copyright_verifications').upsert({
            post_id: post.id,
            verified_by: user.id,
            owner_name: profile?.username || 'Feedim Kullanıcısı',
          }, { onConflict: 'post_id' });
          await admin.from('posts').update({
            copyright_claim_status: 'verified',
          }).eq('id', post.id);
        } catch (err) {
          console.error('[Copyright] Failed to auto-verify:', err);
        }
      }
    }

    // Copyright strike counter — increment on any copyright flag (≥60%) — admin immune
    if (copyrightFlagged && !isAdmin) {
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('copyright_strike_count')
          .eq('user_id', user.id)
          .single();
        const newCount = (profile?.copyright_strike_count || 0) + 1;
        const strikeUpdate: Record<string, unknown> = { copyright_strike_count: newCount };
        // 10 strikes → copyright revoked + account goes to moderation
        if (newCount >= 10) {
          strikeUpdate.status = 'moderation';
          try {
            const strikeCode = String(Math.floor(100000 + Math.random() * 900000));
            await admin.from('moderation_decisions').insert({
              target_type: 'user', target_id: user.id, decision: 'moderation', reason: `Telif hakkı ihlali: ${newCount} strike`, moderator_id: 'system', decision_code: strikeCode,
            });
          } catch {}
        }
        await admin.from('profiles').update(strikeUpdate).eq('user_id', user.id);
      } catch (err) {
        console.error('[Copyright] Strike increment failed:', err);
      }
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

        // Increment post_count for each tag
        if (postStatus === 'published') {
          for (const tagId of tagIds) {
            const { data: tag } = await admin.from('tags').select('post_count').eq('id', tagId).single();
            if (tag) {
              await admin.from('tags').update({ post_count: (tag.post_count || 0) + 1 }).eq('id', tagId);
            }
          }
        }
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
    if (isNsfw) {
      // System notification: post is under review
      try {
        await createNotification({
          admin,
          user_id: user.id,
          actor_id: user.id,
          type: 'moderation_review',
          object_type: 'post',
          object_id: post.id,
          content: 'İçeriğiniz inceleniyor. Detayları görmek için tıklayın.',
        });
        // Send moderation review email
        const emailResult = await getEmailIfEnabled(user.id, 'moderation_review');
        if (emailResult) {
          const tpl = await moderationReviewEmail(trimmedTitle, slug, emailResult.locale);
          await sendEmail({ to: emailResult.email, ...tpl, template: 'moderation_review', userId: user.id });
        }
      } catch {}
      response.moderation = true;
      response.message = 'Gönderiniz yayınlandı, inceleme: ' + (modReason || 'riskli içerik');
    }
    // Notify original content author about copyright match (both NSFW and badge-only)
    if (copyrightFlagged && copyrightMatchAuthorId && copyrightMatchId) {
      try {
        await createNotification({
          admin,
          user_id: copyrightMatchAuthorId,
          actor_id: copyrightMatchAuthorId,
          type: 'copyright_similar_detected',
          object_type: 'post',
          object_id: post.id,
          content: `Telif hakkı korumalı içeriğinize benzer bir içerik tespit edildi (%${copyrightSimilarity || 0}). İçerik engellendi. Görüntülemek için tıkla.`,
        });
      } catch {}
    }
    // Notify the poster if verification is needed
    if (copyrightClaimStatus === 'pending_verification') {
      try {
        await createNotification({
          admin,
          user_id: user.id,
          actor_id: user.id,
          type: 'copyright_verification_needed',
          object_type: 'post',
          object_id: post.id,
          content: 'İçeriğiniz mevcut bir telif hakkı korumalı içerikle eşleşti. Doğrulama formu doldurmanız gerekmektedir.',
        });
      } catch {}
    }
    // Trigger HLS transcode for video posts (runs after response is sent)
    if (isVideo && postStatus === 'published' && video_url && post.id) {
      const transcodeWorkerUrl = process.env.TRANSCODE_WORKER_URL;
      const transcodeSecret = process.env.TRANSCODE_CALLBACK_SECRET;
      if (transcodeWorkerUrl && transcodeSecret) {
        // Mark video as processing
        await admin.from('posts').update({ video_status: 'processing' }).eq('id', post.id);
        after(async () => {
          try {
            await fetch(transcodeWorkerUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${transcodeSecret}`,
              },
              body: JSON.stringify({
                postId: post.id,
                videoUrl: video_url,
                userId: user.id,
                callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/posts/${post.id}/transcode-complete`,
              }),
            });
          } catch (err) {
            console.error('[Transcode] Failed to trigger worker:', err);
            await admin.from('posts').update({ video_status: 'error' }).eq('id', post.id);
          }
        });
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({ error: tErrors('serverError') }, { status: 500 });
  }
}
