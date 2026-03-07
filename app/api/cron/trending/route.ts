import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { verifyCronSecret } from "@/lib/cronAuth";

export async function GET(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = Date.now();

    // Fetch recent published posts (last 30 days, max 5000)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error } = await admin
      .from("posts")
      .select("id, author_id, like_count, comment_count, save_count, share_count, view_count, published_at")
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

    // ─── Tag trending scores ──────────────────────────────────────
    const postIds = posts.map((p: any) => p.id);
    const postEngagementMap = new Map<number, { engagement: number; hoursAgo: number }>();
    for (const post of posts) {
      const engagement = (post.like_count || 0) * 2 + (post.comment_count || 0) * 5 + (post.save_count || 0) * 10 + (post.share_count || 0) * 8;
      const hoursAgo = Math.max(1, (now - new Date(post.published_at).getTime()) / (1000 * 60 * 60));
      postEngagementMap.set(post.id, { engagement, hoursAgo });
    }

    // Build post → author lookup
    const postAuthorMap = new Map<number, string>();
    for (const post of posts) {
      postAuthorMap.set(post.id, post.author_id);
    }

    // Fetch post-tag mappings for these posts (batch in groups to avoid too large IN clause)
    const tagScoreMap = new Map<number, number>();
    const tagAuthorMap = new Map<number, Set<string>>();
    for (let i = 0; i < postIds.length; i += 500) {
      const batch = postIds.slice(i, i + 500);
      const { data: postTags } = await admin
        .from("post_tags")
        .select("post_id, tag_id")
        .in("post_id", batch);

      for (const pt of (postTags || [])) {
        const postData = postEngagementMap.get(pt.post_id);
        if (!postData) continue;
        const ageDecay = Math.pow(postData.hoursAgo + 2, 0.8);
        const contribution = (20 + postData.engagement * 0.05) * 100 / ageDecay;
        tagScoreMap.set(pt.tag_id, (tagScoreMap.get(pt.tag_id) || 0) + contribution);

        // Track authors per tag for language detection
        const authorId = postAuthorMap.get(pt.post_id);
        if (authorId) {
          if (!tagAuthorMap.has(pt.tag_id)) tagAuthorMap.set(pt.tag_id, new Set());
          tagAuthorMap.get(pt.tag_id)!.add(authorId);
        }
      }
    }

    // Batch update tag trending scores
    let tagUpdatedCount = 0;
    const tagEntries = Array.from(tagScoreMap.entries());
    for (let i = 0; i < tagEntries.length; i += 100) {
      const batch = tagEntries.slice(i, i + 100);
      const promises = batch.map(([tagId, score]) =>
        admin.from("tags").update({ trending_score: Math.round(score * 100) / 100 }).eq("id", tagId)
      );
      await Promise.all(promises);
      tagUpdatedCount += batch.length;
    }

    // ─── Tag language detection ──────────────────────────────────
    // Collect all unique author IDs across all tags
    const allAuthorIds = new Set<string>();
    for (const authors of tagAuthorMap.values()) {
      for (const id of authors) allAuthorIds.add(id);
    }

    // Batch fetch author languages
    const authorLangMap = new Map<string, string>();
    const authorIdArr = [...allAuthorIds];
    for (let i = 0; i < authorIdArr.length; i += 500) {
      const batch = authorIdArr.slice(i, i + 500);
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, language")
        .in("user_id", batch);
      for (const p of (profiles || [])) {
        if (p.language) authorLangMap.set(p.user_id, p.language);
      }
    }

    // Determine language per tag
    const tagLangUpdates: { id: number; language: string }[] = [];
    for (const [tagId, authorIds] of tagAuthorMap.entries()) {
      const langCounts: Record<string, number> = {};
      let total = 0;
      for (const authorId of authorIds) {
        const lang = authorLangMap.get(authorId);
        if (lang) {
          langCounts[lang] = (langCounts[lang] || 0) + 1;
          total++;
        }
      }
      if (total === 0) continue;

      // Find dominant language
      let maxLang = "global";
      let maxCount = 0;
      for (const [lang, count] of Object.entries(langCounts)) {
        if (count > maxCount) {
          maxCount = count;
          maxLang = lang;
        }
      }

      // If dominant language >= 60%, assign it; otherwise "global"
      const language = maxCount / total >= 0.6 ? maxLang : "global";
      tagLangUpdates.push({ id: tagId, language });
    }

    // Batch update tag languages
    for (let i = 0; i < tagLangUpdates.length; i += 100) {
      const batch = tagLangUpdates.slice(i, i + 100);
      await Promise.all(
        batch.map(u => admin.from("tags").update({ language: u.language }).eq("id", u.id))
      );
    }

    // ─── Sound trending scores ──────────────────────────────────
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch active sounds
    const { data: activeSounds } = await admin
      .from("sounds")
      .select("id, usage_count, created_at")
      .eq("status", "active")
      .gt("usage_count", 0)
      .limit(5000);

    let soundUpdatedCount = 0;
    if (activeSounds && activeSounds.length > 0) {
      // Get recent usage velocity: count posts created in last 7 days per sound
      const soundIds = activeSounds.map(s => s.id);
      const soundVelocityMap = new Map<number, number>();
      const soundEngagementMap = new Map<number, number>();

      for (let i = 0; i < soundIds.length; i += 500) {
        const batch = soundIds.slice(i, i + 500);
        const { data: recentPosts } = await admin
          .from("posts")
          .select("sound_id, like_count, comment_count, share_count, published_at")
          .in("sound_id", batch)
          .eq("status", "published")
          .gte("published_at", sevenDaysAgo);

        for (const p of (recentPosts || [])) {
          if (!p.sound_id) continue;
          soundVelocityMap.set(p.sound_id, (soundVelocityMap.get(p.sound_id) || 0) + 1);
          const eng = (p.like_count || 0) * 2 + (p.comment_count || 0) * 5 + (p.share_count || 0) * 8;
          soundEngagementMap.set(p.sound_id, (soundEngagementMap.get(p.sound_id) || 0) + eng);
        }
      }

      const soundUpdates: { id: number; trending_score: number }[] = [];
      for (const sound of activeSounds) {
        const velocity = soundVelocityMap.get(sound.id) || 0;
        const engagement = soundEngagementMap.get(sound.id) || 0;
        const hoursAge = (now - new Date(sound.created_at).getTime()) / (1000 * 60 * 60);
        const ageDecay = Math.pow(hoursAge + 24, 0.8);

        let score = ((velocity * 50 + engagement * 0.1 + (sound.usage_count || 0) * 2) * 100) / ageDecay;

        // Recency bonus for new sounds (< 48h)
        if (hoursAge < 12) score += 300;
        else if (hoursAge < 48) score += 100;

        soundUpdates.push({ id: sound.id, trending_score: Math.round(score * 100) / 100 });
      }

      // Batch update
      for (let i = 0; i < soundUpdates.length; i += 100) {
        const batch = soundUpdates.slice(i, i + 100);
        await Promise.all(batch.map(u =>
          admin.from("sounds").update({ trending_score: u.trending_score }).eq("id", u.id)
        ));
        soundUpdatedCount += batch.length;
      }
    }

    // ─── Orphan sound cleanup ──────────────────────────────────
    // Delete sounds that have no posts referencing them (older than 1 hour to avoid race conditions)
    let orphanDeletedCount = 0;
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const { data: candidateSounds } = await admin
      .from("sounds")
      .select("id, audio_url, cover_image_url, is_original")
      .lt("created_at", oneHourAgo)
      .order("created_at", { ascending: true })
      .limit(500);

    if (candidateSounds && candidateSounds.length > 0) {
      const { deleteFromR2, r2KeyFromUrl } = await import("@/lib/r2");

      // Check in batches which sounds still have posts
      for (let i = 0; i < candidateSounds.length; i += 100) {
        const batch = candidateSounds.slice(i, i + 100);
        const batchIds = batch.map(s => s.id);

        // Find which sound_ids in this batch ARE referenced by posts
        const { data: usedPosts } = await admin
          .from("posts")
          .select("sound_id")
          .in("sound_id", batchIds);
        const usedIds = new Set((usedPosts || []).map(p => p.sound_id));

        for (const s of batch) {
          if (usedIds.has(s.id)) continue; // has posts, skip

          // No posts reference this sound — delete R2 assets + DB row
          if (!s.is_original && s.audio_url) {
            const key = r2KeyFromUrl(s.audio_url);
            if (key) try { await deleteFromR2(key); } catch {}
          }
          if (s.cover_image_url) {
            const key = r2KeyFromUrl(s.cover_image_url);
            if (key) try { await deleteFromR2(key); } catch {}
          }
          await admin.from("sounds").delete().eq("id", s.id);
          orphanDeletedCount++;
        }
      }
    }

    return NextResponse.json({
      updated: updatedCount,
      tags_updated: tagUpdatedCount,
      tags_lang_updated: tagLangUpdates.length,
      sounds_updated: soundUpdatedCount,
      orphan_sounds_deleted: orphanDeletedCount,
    });
  } catch (e) {
    const tCatch = await getTranslations("apiErrors");
    return NextResponse.json({ error: tCatch("serverError") }, { status: 500 });
  }
}
