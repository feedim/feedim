import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import {
  MIN_READ_DURATION, MIN_READ_PERCENTAGE,
  COIN_BASE_EARNING, COIN_DAILY_LIMIT, COIN_POST_LIMIT,
  MILESTONES, SPAM_THRESHOLDS,
  MAX_READ_DURATION, MAX_VIDEO_WATCH_DURATION,
  DURATION_SANITY_MULTIPLIER, VIDEO_DURATION_SANITY_MULTIPLIER,
} from '@/lib/constants';

/**
 * Calculate coin earning with quality multipliers and engagement bonuses.
 *
 * Formula:
 *   base = 1 coin
 *   quality_multiplier: %40-60 → 1.0x, %60-80 → 1.5x, %80-100 → 2.0x
 *   engagement: like(+0.5), comment(+1.0), save(+0.5), share(+1.0)
 *   author: verified(1.2x), trust>=2(1.1x)
 */
function calculateCoinEarning(opts: {
  readPercentage: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasSaved: boolean;
  hasShared: boolean;
  authorVerified: boolean;
  authorProfileScore: number;
}): number {
  let coins = COIN_BASE_EARNING;

  // Quality multiplier based on read depth
  if (opts.readPercentage >= 80) coins *= 2.0;
  else if (opts.readPercentage >= 60) coins *= 1.5;
  // 40-60% = 1.0x (base)

  // Engagement bonuses
  if (opts.hasLiked) coins += 0.5;
  if (opts.hasCommented) coins += 1.0;
  if (opts.hasSaved) coins += 0.5;
  if (opts.hasShared) coins += 1.0;

  // Author multipliers
  if (opts.authorVerified) coins *= 1.2;
  else if (opts.authorProfileScore >= 40) coins *= 1.1;

  return Math.round(coins);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ recorded: false });
    }

    const body = await request.json();
    const readPercentage = Math.min(100, Math.max(0, Number(body.read_percentage) || 0));
    let readDuration = Math.max(0, Number(body.read_duration) || 0);
    const isBotLikely = body.is_bot_likely === true;

    if (isBotLikely) {
      return NextResponse.json({ recorded: false });
    }

    const admin = createAdminClient();

    // Fetch post info for duration capping
    const { data: postInfo } = await admin
      .from('posts')
      .select('content_type, reading_time, video_duration')
      .eq('id', postId)
      .single();

    const isVideoContent = postInfo?.content_type === 'video' || postInfo?.content_type === 'moment';

    // Clamp duration to prevent manipulation
    if (isVideoContent) {
      const vDur = postInfo?.video_duration || 0;
      const dynamicCap = vDur > 0 ? vDur * VIDEO_DURATION_SANITY_MULTIPLIER : MAX_VIDEO_WATCH_DURATION;
      readDuration = Math.min(readDuration, dynamicCap, MAX_VIDEO_WATCH_DURATION);
    } else {
      const readingTimeSec = (postInfo?.reading_time || 0) * 60;
      const dynamicCap = readingTimeSec > 0 ? readingTimeSec * DURATION_SANITY_MULTIPLIER : MAX_READ_DURATION;
      readDuration = Math.min(readDuration, dynamicCap, MAX_READ_DURATION);
    }

    const isQualifiedRead = readDuration >= MIN_READ_DURATION && readPercentage >= MIN_READ_PERCENTAGE;

    // Check if this user already has a view record for this post
    const { data: existingView } = await admin
      .from('post_views')
      .select('id, read_percentage, read_duration')
      .eq('post_id', postId)
      .eq('viewer_id', user.id)
      .single();

    if (existingView) {
      const newPercentage = Math.max(existingView.read_percentage || 0, readPercentage);
      const newDuration = Math.min(
        Math.max(existingView.read_duration || 0, readDuration),
        isVideoContent ? MAX_VIDEO_WATCH_DURATION : MAX_READ_DURATION
      );

      if (newPercentage > (existingView.read_percentage || 0) || newDuration > (existingView.read_duration || 0)) {
        await admin
          .from('post_views')
          .update({
            read_percentage: newPercentage,
            read_duration: newDuration,
            is_qualified_read: isQualifiedRead || undefined,
          })
          .eq('id', existingView.id);
      }

      return NextResponse.json({ recorded: true, is_new: false, is_qualified_read: isQualifiedRead, coins_earned: 0 });
    }

    // New view — check premium status and handle coin earning
    let coinsEarned = 0;
    let viewerIsPremium = false;

    const { data: viewerProfile } = await admin
      .from('profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .single();

    viewerIsPremium = viewerProfile?.is_premium || false;

    // Only posts and videos can earn — notes and moments are excluded
    const earningEligibleType = postInfo?.content_type === 'post' || postInfo?.content_type === 'video';

    if (isQualifiedRead && viewerIsPremium && earningEligibleType) {
      const { data: post } = await admin
        .from('posts')
        .select('author_id, total_coins_earned, spam_score')
        .eq('id', postId)
        .single();

      if (post && post.author_id !== user.id) {
        // Check if author has monetization enabled, is professional, and not private
        const { data: authorMeta } = await admin
          .from('profiles')
          .select('account_type, account_private')
          .eq('user_id', post.author_id)
          .single();

        let authorMonetizationEnabled = false;
        try {
          const { data: monCheck } = await admin
            .from('profiles')
            .select('monetization_enabled')
            .eq('user_id', post.author_id)
            .single();
          authorMonetizationEnabled = monCheck?.monetization_enabled || false;
        } catch {}

        const authorIsProfessional = authorMeta?.account_type === 'creator' || authorMeta?.account_type === 'business';
        const authorIsPrivate = authorMeta?.account_private === true;

        if (!authorMonetizationEnabled || !authorIsProfessional || authorIsPrivate) {
          // Author monetization not active — skip earning
        } else if ((post.spam_score || 0) >= SPAM_THRESHOLDS.earningStop) {
          // Spam content — no earning
        } else if ((post.total_coins_earned || 0) < COIN_POST_LIMIT) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          // Parallel: check daily limit, author profile, viewer engagement
          const [
            { data: todayEarnings },
            { data: authorProfile },
            { count: likeCount },
            { count: commentCount },
            { count: saveCount },
            { count: shareCount },
          ] = await Promise.all([
            admin.from('coin_transactions').select('amount')
              .eq('user_id', post.author_id).eq('type', 'read_earning')
              .gte('created_at', todayStart.toISOString()),
            admin.from('profiles').select('coin_balance, total_earned, is_verified, profile_score')
              .eq('user_id', post.author_id).single(),
            admin.from('likes').select('id', { count: 'exact', head: true })
              .eq('post_id', postId).eq('user_id', user.id),
            admin.from('comments').select('id', { count: 'exact', head: true })
              .eq('post_id', postId).eq('author_id', user.id),
            admin.from('bookmarks').select('id', { count: 'exact', head: true })
              .eq('post_id', postId).eq('user_id', user.id),
            admin.from('shares').select('id', { count: 'exact', head: true })
              .eq('post_id', postId).eq('user_id', user.id),
          ]);

          const dailyTotal = (todayEarnings || []).reduce((sum, t) => sum + t.amount, 0);

          // Block earning if author profile score is too low
          if ((authorProfile?.profile_score ?? 100) < 15) {
            // Author flagged — no earning
          } else if (dailyTotal < COIN_DAILY_LIMIT && authorProfile) {
            coinsEarned = calculateCoinEarning({
              readPercentage,
              hasLiked: (likeCount || 0) > 0,
              hasCommented: (commentCount || 0) > 0,
              hasSaved: (saveCount || 0) > 0,
              hasShared: (shareCount || 0) > 0,
              authorVerified: authorProfile.is_verified || false,
              authorProfileScore: authorProfile.profile_score || 0,
            });

            // Cap to not exceed daily limit
            coinsEarned = Math.min(coinsEarned, COIN_DAILY_LIMIT - dailyTotal);
            // Cap to not exceed per-post limit
            coinsEarned = Math.min(coinsEarned, COIN_POST_LIMIT - (post.total_coins_earned || 0));

            if (coinsEarned > 0) {
              const newBalance = (authorProfile.coin_balance || 0) + coinsEarned;
              await Promise.all([
                admin.from('profiles').update({
                  coin_balance: newBalance,
                  total_earned: (authorProfile.total_earned || 0) + coinsEarned,
                }).eq('user_id', post.author_id),
                admin.from('coin_transactions').insert({
                  user_id: post.author_id,
                  type: 'read_earning',
                  amount: coinsEarned,
                  balance_after: newBalance,
                  related_post_id: postId,
                  related_user_id: user.id,
                  description: `Premium okuyucu kazancı (x${coinsEarned > 1 ? coinsEarned : 1})`,
                }),
                admin.from('posts').update({
                  total_coins_earned: (post.total_coins_earned || 0) + coinsEarned,
                }).eq('id', postId),
              ]);
            }
          }
        }
      }
    }

    // INSERT new view — trigger increments view_count
    await admin.from('post_views').insert({
      post_id: postId,
      viewer_id: user.id,
      read_percentage: readPercentage,
      read_duration: readDuration,
      is_qualified_read: isQualifiedRead,
      is_premium_viewer: viewerIsPremium,
      coins_earned: coinsEarned,
    });

    // Store video analytics event if present
    const videoAnalytics = body.video_analytics;
    if (videoAnalytics && typeof videoAnalytics === 'object') {
      const clampedWatchDuration = Math.min(readDuration, MAX_VIDEO_WATCH_DURATION);
      try {
        await admin.from('analytics_events').insert({
          event_type: 'video_watch',
          user_id: user.id,
          post_id: postId,
          data: {
            watch_duration: clampedWatchDuration,
            watch_percentage: readPercentage,
            exit_time: Number(videoAnalytics.exit_time) || 0,
            video_duration: Number(videoAnalytics.video_duration) || 0,
            completed: videoAnalytics.completed === true,
          },
        });
      } catch (err) {
        console.error('[view] analytics_events insert failed:', err);
      }
    }

    // Milestone notification check
    const { data: postForMilestone } = await admin
      .from('posts')
      .select('view_count, author_id')
      .eq('id', postId)
      .single();
    const newViewCount = postForMilestone?.view_count || 0;

    if (MILESTONES.includes(newViewCount) && postForMilestone) {
      const milestoneLabel = newViewCount >= 1000000
        ? `${newViewCount / 1000000}M`
        : newViewCount >= 1000 ? `${newViewCount / 1000}K` : String(newViewCount);
      await createNotification({
        admin,
        user_id: postForMilestone.author_id,
        actor_id: postForMilestone.author_id,
        type: 'view_milestone',
        object_type: 'post',
        object_id: postId,
        content: `Gönderiniz ${milestoneLabel} gösterime ulaştı!`,
      });
    }

    return NextResponse.json({
      recorded: true, is_new: true,
      is_qualified_read: isQualifiedRead, coins_earned: coinsEarned,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
