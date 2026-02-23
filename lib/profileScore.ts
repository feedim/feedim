// Feedim — Profile Scoring Engine v4
// 8 profile dimensions + 7 spam dimensions + content quality penalties + shadow ban

// ─── Types ───────────────────────────────────────────────────────────

export interface ProfileData {
  avatar_url: string | null;
  bio: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  website: string | null;
  birth_date: string | null;
  gender: string | null;
  full_name: string | null;
  account_type: string | null;
  is_verified: boolean;
  is_premium: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  status: string;
  created_at: string;
  shadow_banned: boolean;
  total_earned: number;
  total_views_received: number;
}

export interface ScoreInputs {
  profile: ProfileData;
  // Post counts
  publishedPostCount: number;
  moderationPostCount: number;
  removedPostCount: number;
  recentPublishedCount: number;
  // Comment counts
  spamCommentCount: number;
  removedCommentCount: number;
  recentCommentCount: number;
  totalUserCommentCount: number;
  // Community signals
  blocksReceived: number;
  reportsReceived: number;
  moderationActionCount: number;
  // Behavioral
  burstPostCount: number;
  avgWordCount: number;
  // Rehabilitation
  lastModerationDate: string | null;
  // Content Quality
  postStats: PostStat[];
  qualifiedReadCount: number;
  // Engagement Quality
  commentLikesTotal: number;
  giftsReceivedCoins: number;
  // Economic Activity
  giftsSentCoins: number;
  // Rate Limit
  rateLimitHits: RateLimitHit[];
  // Daily Activity & Follower Loss
  activeDaysLast30: number;
  followerLossLast7: number;
  loginStreak: number;
  // ─── v3: Enhanced Signals ───
  // Spam detection
  duplicateCommentGroups: number;
  massDeleteLast24h: number;
  topGiftSenderRatio: number;
  suspiciousWithdrawalCount: number;
  selfCommentRatio: number;
  commentAuthorDiversity: number;
  avgMentionPerPost: number;
  // Profile bonuses
  mutualFollowRatio: number;
  commentReplyRatio: number;
  networkTrustAvg: number;
  giftSenderDiversity: number;
  avgReadDurationOnPosts: number;
  socialSharesByUser: number;
  organicCommentRatio: number;
  discussionPostCount: number;
  // NSFW pattern (only rejected/removed NSFW posts, not pending review)
  rejectedNsfwPostCount: number;
  // Profile visits
  profileVisitsLast30: number;
  uniqueProfileVisitors: number;
  // ─── v5: Consumer (Reader) Profile ───
  savedOtherPostCount: number;       // Saved other users' posts
  likedOtherPostCount: number;       // Liked other users' posts
  commentedOnOtherPostCount: number; // Commented on other users' posts
  // ─── v5: Penalty Decay ───
  lastPenaltyDate: string | null;    // Most recent penalty event date
  // ─── v4: Content Quality Penalties ───
  postAndDeleteCount: number;       // Posts published then deleted within 24h
  lowEffortPostRatio: number;       // Ratio of posts with word_count < 10
  duplicateContentCount: number;    // Posts with highly similar/duplicate content
  oneLineNoMediaPostRatio: number;  // Ratio of single-line posts with no media, < 30 words
  weirdCharPostRatio: number;       // Ratio of posts with excessive unicode/special chars
  // ─── v6: Copyright Strike Penalty ───
  copyrightStrikeCount: number;     // Total copyright strikes from copyright system
}

export interface PostStat {
  id: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  share_count: number;
  unique_view_count: number;
  trending_score: number;
  word_count: number;
  mention_count: number;
  content_type: string;   // 'post' | 'video' | 'moment'
  has_media: boolean;     // featured_image or video_thumbnail exists
}

export interface RateLimitHit {
  action: string;
  count: number;
}

// ─── Profile Score (0-100) — 8 Dimensions ────────────────────────────
// Caps: completeness(12) + activity(20) + socialTrust(16) + contentQuality(20)
//     + engagementQuality(16) + economicActivity(8) + consumer(8) + penalties = 100

function calcCompleteness(p: ProfileData): number {
  let score = 0;
  if (p.avatar_url) score += 4;
  if (p.bio && p.bio.length > 10) score += 2;
  if (p.email_verified) score += 2;
  if (p.phone_verified) score += 1;
  if (p.website) score += 1;
  if (p.birth_date) score += 1;
  if (p.gender) score += 1;
  if (p.full_name && p.full_name.length > 2) score += 1;
  if (p.account_type && p.account_type !== 'personal') score += 2;
  return Math.min(score, 12);
}

function calcActivity(inputs: ScoreInputs): number {
  const p = inputs.profile;
  let score = 0;

  const ageMs = Date.now() - new Date(p.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Post count tiers
  const pc = p.post_count;
  if (pc >= 50) score += 6;
  else if (pc >= 25) score += 5;
  else if (pc >= 10) score += 4;
  else if (pc >= 3) score += 3;
  else if (pc >= 1) score += 2;

  // Recent activity (last 30 days)
  if (inputs.recentPublishedCount >= 1) score += 2;

  // Daily active usage
  if (inputs.activeDaysLast30 >= 25) score += 3;
  else if (inputs.activeDaysLast30 >= 15) score += 2;
  else if (inputs.activeDaysLast30 >= 7) score += 1;

  // Inactivity penalty — son 30 günde 3 günden az giriş
  // Yeni kullanıcı koruması: ilk 7 gün ceza yok
  if (inputs.activeDaysLast30 < 3 && ageDays >= 7) score -= 2;

  // Login streak bonus (ardışık gün — 1 gün toleranslı)
  if (inputs.loginStreak >= 30) score += 3;
  else if (inputs.loginStreak >= 14) score += 2;
  else if (inputs.loginStreak >= 7) score += 1;

  // Account age (10 yıla kadar kademeli)
  if (ageDays >= 3650) score += 6;
  else if (ageDays >= 2555) score += 5;
  else if (ageDays >= 1825) score += 4;
  else if (ageDays >= 1095) score += 3;
  else if (ageDays >= 365) score += 2;
  else if (ageDays >= 90) score += 1;

  // Yeni kullanıcı koruması: ilk 7 gün minimum taban puan
  if (ageDays < 7) return Math.min(Math.max(score, 4), 20);

  return Math.min(score, 20);
}

function calcSocialTrust(inputs: ScoreInputs): number {
  const p = inputs.profile;
  let score = 0;

  // Follower score (log2 scale, max 8)
  score += Math.min(Math.log2(p.follower_count + 1) * 2, 8);

  // Following/follower ratio
  const ratio = p.follower_count > 0
    ? p.following_count / p.follower_count
    : (p.following_count > 0 ? Infinity : 0);
  if (ratio < 3) score += 2;
  else if (ratio < 10) score += 1;

  // Verified badge
  if (p.is_verified) score += 3;

  // Premium plan
  if (p.is_premium) score += 2;

  // Karşılıklı takip oranı (mutual follow)
  if (inputs.mutualFollowRatio >= 0.40) score += 3;
  else if (inputs.mutualFollowRatio >= 0.20) score += 2;
  else if (inputs.mutualFollowRatio >= 0.10) score += 1;

  // Ağ kalitesi — takipçilerin ort. profil puanı
  if (inputs.networkTrustAvg >= 3.5) score += 2;
  else if (inputs.networkTrustAvg >= 2.5) score += 1;

  // Profil ziyaret sinyali (son 30 gün)
  if (inputs.uniqueProfileVisitors >= 50) score += 3;
  else if (inputs.uniqueProfileVisitors >= 20) score += 2;
  else if (inputs.uniqueProfileVisitors >= 5) score += 1;

  return Math.min(score, 16);
}

function calcContentQuality(inputs: ScoreInputs): number {
  let score = 0;
  const posts = inputs.postStats;

  // İçerik tipi ayrımı
  const textPosts = posts.filter(p => p.content_type === 'post' || !p.content_type);
  const videoPosts = posts.filter(p => p.content_type === 'video' || p.content_type === 'moment');

  // Average engagement rate (posts with 10+ views)
  const qualifiedPosts = posts.filter(p => p.unique_view_count >= 10);
  if (qualifiedPosts.length > 0) {
    const rates = qualifiedPosts.map(p => {
      const interactions = p.like_count + p.comment_count + p.save_count;
      return interactions / p.unique_view_count;
    });
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    if (avgRate >= 0.15) score += 6;
    else if (avgRate >= 0.08) score += 4;
    else if (avgRate >= 0.03) score += 3;
    else if (avgRate > 0) score += 1;
  }

  // Qualified read ratio
  const totalViews = inputs.profile.total_views_received;
  if (totalViews > 0 && inputs.qualifiedReadCount > 0) {
    const qrRatio = inputs.qualifiedReadCount / totalViews;
    if (qrRatio >= 0.30) score += 4;
    else if (qrRatio >= 0.15) score += 2;
    else if (qrRatio >= 0.05) score += 1;
  }

  // Trending posts (eşik yükseltildi: >0 → >10)
  const trendingCount = posts.filter(p => p.trending_score > 10).length;
  if (trendingCount >= 3) score += 3;
  else if (trendingCount >= 1) score += 2;

  // Content depth — içerik tipine göre farklı değerlendirme
  if (textPosts.length > 0) {
    // Yazılı içerik: kelime sayısı önemli
    const avgWc = textPosts.reduce((a, p) => a + (p.word_count || 0), 0) / textPosts.length;
    if (avgWc >= 300) score += 2;
    else if (avgWc >= 100) score += 1;
  }
  if (videoPosts.length > 0) {
    // Video/Moment: medya varlığı ve etkileşim oranı önemli
    const avgEngagement = videoPosts.reduce((a, p) =>
      a + p.like_count + p.comment_count + p.save_count, 0) / videoPosts.length;
    if (avgEngagement >= 20) score += 2;
    else if (avgEngagement >= 5) score += 1;
  }

  // Ortalama okuma süresi — sadece yazılı içerik için uygula
  if (textPosts.length > 0) {
    if (inputs.avgReadDurationOnPosts >= 120) score += 2;
    else if (inputs.avgReadDurationOnPosts >= 60) score += 1;
    else if (inputs.avgReadDurationOnPosts > 0 && inputs.avgReadDurationOnPosts < 15 && totalViews >= 50) {
      score -= 2; // Çok kısa okuma süresi cezası (sadece yazılı içerik)
    }
  }

  // Tartışma yaratan gönderiler (5+ farklı yorumcu)
  if (inputs.discussionPostCount >= 3) score += 2;
  else if (inputs.discussionPostCount >= 1) score += 1;

  return Math.min(score, 20);
}

function calcEngagementQuality(inputs: ScoreInputs): number {
  let score = 0;

  // Comment likes total
  const cl = inputs.commentLikesTotal;
  if (cl >= 100) score += 5;
  else if (cl >= 30) score += 4;
  else if (cl >= 10) score += 3;
  else if (cl >= 3) score += 1;

  // Gifts received (coins)
  const gr = inputs.giftsReceivedCoins;
  if (gr >= 500) score += 5;
  else if (gr >= 100) score += 4;
  else if (gr >= 20) score += 2;
  else if (gr >= 1) score += 1;

  // Engagement diversity
  const posts = inputs.postStats;
  const totals = posts.reduce((acc, p) => ({
    likes: acc.likes + p.like_count,
    comments: acc.comments + p.comment_count,
    saves: acc.saves + p.save_count,
    shares: acc.shares + p.share_count,
  }), { likes: 0, comments: 0, saves: 0, shares: 0 });
  let div = 0;
  if (totals.likes > 0) div++;
  if (totals.comments > 0) div++;
  if (totals.saves > 0) div++;
  if (totals.shares > 0) div++;
  if (div >= 4) score += 5;
  else if (div >= 3) score += 3;
  else if (div >= 2) score += 2;

  // Yorum yanıt oranı (kendi postlarındaki yorumlara cevap)
  if (inputs.commentReplyRatio >= 0.50) score += 3;
  else if (inputs.commentReplyRatio >= 0.25) score += 2;
  else if (inputs.commentReplyRatio >= 0.10) score += 1;

  // Organik yorum oranı (başkalarından gelen gerçek yorumlar)
  if (inputs.organicCommentRatio >= 0.80) score += 2;
  else if (inputs.organicCommentRatio >= 0.50) score += 1;

  // Sosyal ağlarda paylaşım
  if (inputs.socialSharesByUser >= 20) score += 2;
  else if (inputs.socialSharesByUser >= 5) score += 1;

  return Math.min(score, 16);
}

function calcEconomicActivity(inputs: ScoreInputs): number {
  let score = 0;

  // Total earned coins
  const te = inputs.profile.total_earned;
  if (te >= 1000) score += 4;
  else if (te >= 200) score += 3;
  else if (te >= 50) score += 2;
  else if (te >= 5) score += 1;

  // Gifts sent (coins)
  const gs = inputs.giftsSentCoins;
  if (gs >= 100) score += 3;
  else if (gs >= 20) score += 2;
  else if (gs >= 1) score += 1;

  // Save rate
  const totalViews = inputs.profile.total_views_received;
  if (totalViews > 0) {
    const totalSaves = inputs.postStats.reduce((a, p) => a + p.save_count, 0);
    const saveRate = totalSaves / totalViews;
    if (saveRate >= 0.05) score += 3;
    else if (saveRate >= 0.02) score += 2;
    else if (saveRate >= 0.005) score += 1;
  }

  // Hediye çeşitliliği (farklı kişilerden hediye alma)
  if (inputs.giftSenderDiversity >= 10) score += 3;
  else if (inputs.giftSenderDiversity >= 5) score += 2;
  else if (inputs.giftSenderDiversity >= 3) score += 1;

  return Math.min(score, 8);
}

function calcPenalties(inputs: ScoreInputs): number {
  const p = inputs.profile;
  let penalty = 0;

  // Blocks received
  if (inputs.blocksReceived > 10) penalty -= 20;
  else if (inputs.blocksReceived >= 6) penalty -= 10;
  else if (inputs.blocksReceived >= 3) penalty -= 5;
  else if (inputs.blocksReceived >= 1) penalty -= 2;

  // Reports received
  if (inputs.reportsReceived > 5) penalty -= 15;
  else if (inputs.reportsReceived >= 3) penalty -= 8;
  else if (inputs.reportsReceived >= 1) penalty -= 3;

  // Moderation history
  if (inputs.moderationActionCount >= 4) penalty -= 20;
  else if (inputs.moderationActionCount >= 2) penalty -= 10;
  else if (inputs.moderationActionCount >= 1) penalty -= 5;

  // Account status
  switch (p.status) {
    case 'blocked': penalty -= 30; break;
    case 'moderation': penalty -= 15; break;
    case 'frozen': penalty -= 10; break;
  }

  // Küfür/hakaret yorum oranı (removed+spam / total)
  if (inputs.totalUserCommentCount > 5) {
    const badRatio = (inputs.spamCommentCount + inputs.removedCommentCount) / inputs.totalUserCommentCount;
    if (badRatio >= 0.30) penalty -= 8;
    else if (badRatio >= 0.15) penalty -= 4;
  }

  // Sürekli NSFW içerik paylaşımı — sadece moderatör tarafından reddedilen NSFW postlar
  // is_nsfw=true (inceleme bekleyen) cezalandırılmaz, sadece removed olanlar
  if (inputs.publishedPostCount >= 3 && inputs.rejectedNsfwPostCount > 0) {
    const rejectedRatio = inputs.rejectedNsfwPostCount / (inputs.publishedPostCount + inputs.removedPostCount);
    if (rejectedRatio > 0.50) penalty -= 10;
    else if (rejectedRatio > 0.30) penalty -= 6;
    else if (rejectedRatio > 0.10) penalty -= 3;
  }

  // ─── v4: Content Quality Penalties ───

  // Post-and-delete: sürekli post atıp kısa sürede silen
  if (inputs.postAndDeleteCount >= 10) penalty -= 15;
  else if (inputs.postAndDeleteCount >= 5) penalty -= 10;
  else if (inputs.postAndDeleteCount >= 3) penalty -= 5;
  else if (inputs.postAndDeleteCount >= 1) penalty -= 2;

  // Low-effort content: tek karakter, anlamsız kısa içerik (word_count < 10)
  // Video/moment postları hariç tutulur (lowEffortPostRatio cron'da hesaplanır)
  if (inputs.publishedPostCount >= 3) {
    if (inputs.lowEffortPostRatio >= 0.60) penalty -= 12;
    else if (inputs.lowEffortPostRatio >= 0.40) penalty -= 8;
    else if (inputs.lowEffortPostRatio >= 0.20) penalty -= 4;
  }

  // Duplicate/repetitive content — yüksek ceza
  if (inputs.duplicateContentCount >= 5) penalty -= 20;
  else if (inputs.duplicateContentCount >= 3) penalty -= 12;
  else if (inputs.duplicateContentCount >= 2) penalty -= 8;
  else if (inputs.duplicateContentCount >= 1) penalty -= 4;

  // One-liner announcement posts: tek satır, medyasız, < 30 kelime
  if (inputs.publishedPostCount >= 5) {
    if (inputs.oneLineNoMediaPostRatio >= 0.70) penalty -= 10;
    else if (inputs.oneLineNoMediaPostRatio >= 0.50) penalty -= 6;
    else if (inputs.oneLineNoMediaPostRatio >= 0.30) penalty -= 3;
  }

  // Weird character usage: zalgo, aşırı emoji, unicode spam
  if (inputs.publishedPostCount >= 3) {
    if (inputs.weirdCharPostRatio >= 0.50) penalty -= 10;
    else if (inputs.weirdCharPostRatio >= 0.30) penalty -= 6;
    else if (inputs.weirdCharPostRatio >= 0.15) penalty -= 3;
  }

  // Copyright strikes — ağır ceza 3. strike'tan sonra başlar
  if (inputs.copyrightStrikeCount >= 10) penalty -= 40;
  else if (inputs.copyrightStrikeCount >= 7) penalty -= 30;
  else if (inputs.copyrightStrikeCount >= 5) penalty -= 22;
  else if (inputs.copyrightStrikeCount >= 3) penalty -= 15;

  return penalty;
}

// Penalty decay — cezalar zamanla azalır (spam score'daki rehabilitation decay gibi)
function calcPenaltyDecay(lastPenaltyDate: string | null): number {
  if (!lastPenaltyDate) return 1; // Tarih yoksa decay uygulanmaz (cezalar tam etkili)
  const daysSince = (Date.now() - new Date(lastPenaltyDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= 60) return 0.3;
  if (daysSince >= 30) return 0.5;
  if (daysSince >= 14) return 0.7;
  return 1;
}

// ─── Consumer (Reader) Dimension — okuyucu profili (max 8) ───────────

function calcConsumer(inputs: ScoreInputs): number {
  let score = 0;

  // Başkalarının postlarını beğenme
  if (inputs.likedOtherPostCount >= 50) score += 3;
  else if (inputs.likedOtherPostCount >= 20) score += 2;
  else if (inputs.likedOtherPostCount >= 5) score += 1;

  // Başkalarının postlarını kaydetme
  if (inputs.savedOtherPostCount >= 20) score += 3;
  else if (inputs.savedOtherPostCount >= 10) score += 2;
  else if (inputs.savedOtherPostCount >= 3) score += 1;

  // Başkalarının postlarına yorum yapma
  if (inputs.commentedOnOtherPostCount >= 30) score += 2;
  else if (inputs.commentedOnOtherPostCount >= 10) score += 1;

  return Math.min(score, 8);
}

export function calculateProfileScore(inputs: ScoreInputs): number {
  const completeness = calcCompleteness(inputs.profile);
  const activity = calcActivity(inputs);
  const socialTrust = calcSocialTrust(inputs);
  const contentQuality = calcContentQuality(inputs);
  const engagementQuality = calcEngagementQuality(inputs);
  const economicActivity = calcEconomicActivity(inputs);
  const consumer = calcConsumer(inputs);
  const rawPenalties = calcPenalties(inputs);

  // Penalty decay — cezalar zamanla azalır
  const penaltyDecay = calcPenaltyDecay(inputs.lastPenaltyDate);
  const penalties = Math.round(rawPenalties * penaltyDecay);

  const dims = completeness + activity + socialTrust + contentQuality + engagementQuality + economicActivity + consumer + penalties;

  // Yeni kullanıcı koruması: ilk 7 gün minimum 10 puan
  const ageMs = Date.now() - new Date(inputs.profile.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const floor = ageDays < 7 ? 10 : 0;

  const capped = Math.max(floor, Math.min(100, dims));
  const result = inputs.profile.shadow_banned ? Math.max(0, capped - 50) : capped;

  return Math.round(result * 100) / 100;
}

// ─── Spam Score (0-100) — 7 Dimensions ──────────────────────────────

function calcModerationHistory(inputs: ScoreInputs): number {
  let score = 0;
  score += Math.min(inputs.moderationPostCount * 8, 20);
  score += Math.min(inputs.removedPostCount * 12, 20);
  score += Math.min((inputs.spamCommentCount + inputs.removedCommentCount) * 6, 15);
  return Math.min(score, 30);
}

function calcBehavioral(inputs: ScoreInputs): number {
  let score = 0;

  // Burst posting
  if (inputs.burstPostCount >= 5) score += 15;

  // High comment frequency
  if (inputs.recentCommentCount >= 50) score += 10;
  else if (inputs.recentCommentCount >= 30) score += 5;

  // Low quality content
  if (inputs.avgWordCount > 0 && inputs.avgWordCount < 10) score += 5;

  // Kopya yorum (aynı içerik 3+ farklı gönderiye)
  if (inputs.duplicateCommentGroups >= 3) score += 10;
  else if (inputs.duplicateCommentGroups >= 1) score += 5;

  // Hızlı toplu gönderi silme
  if (inputs.massDeleteLast24h >= 10) score += 10;
  else if (inputs.massDeleteLast24h >= 5) score += 6;
  else if (inputs.massDeleteLast24h >= 3) score += 3;

  // NOT: rejectedNsfwPostCount, duplicateContentCount, lowEffortPostRatio,
  // weirdCharPostRatio zaten calcPenalties'de cezalandırılıyor.
  // Çift ceza önlemek için burada tekrarlanmıyor.

  return Math.min(score, 30);
}

function calcCommunitySignals(inputs: ScoreInputs): number {
  let score = 0;

  // NOT: blocksReceived ve reportsReceived zaten calcPenalties'de cezalandırılıyor.
  // Çift ceza önlemek için burada tekrarlanmıyor.

  // Zero followers but following many
  if (inputs.profile.follower_count === 0 && inputs.profile.following_count > 20) {
    score += 10;
  }

  return Math.min(score, 20);
}

function calcRateLimitViolations(inputs: ScoreInputs): number {
  let score = 0;
  const hits = inputs.rateLimitHits;
  const totalHits = hits.reduce((a, h) => a + h.count, 0);
  if (totalHits >= 20) score += 12;
  else if (totalHits >= 10) score += 8;
  else if (totalHits >= 5) score += 4;
  else if (totalHits >= 2) score += 2;

  const distinctActions = hits.filter(h => h.count > 0).length;
  if (distinctActions >= 4) score += 8;
  else if (distinctActions >= 3) score += 5;
  else if (distinctActions >= 2) score += 3;

  return Math.min(score, 20);
}

function calcFollowerLoss(inputs: ScoreInputs): number {
  const loss = inputs.followerLossLast7;
  if (loss >= 50) return 15;
  if (loss >= 20) return 10;
  if (loss >= 10) return 6;
  if (loss >= 5) return 3;
  return 0;
}

function calcManipulation(inputs: ScoreInputs): number {
  let score = 0;

  // Tek kaynak hediye (hediyelerin %90+ tek kişiden)
  if (inputs.topGiftSenderRatio >= 0.90 && inputs.giftsReceivedCoins > 10) score += 8;
  else if (inputs.topGiftSenderRatio >= 0.70 && inputs.giftsReceivedCoins > 10) score += 5;

  // Şüpheli çekim paterni (minimum tutara yakın çekimler)
  if (inputs.suspiciousWithdrawalCount >= 3) score += 5;
  else if (inputs.suspiciousWithdrawalCount >= 1) score += 2;

  // Kendi kendine etkileşim (kendi postlarına çok yorum, az dışarıdan)
  if (inputs.selfCommentRatio >= 0.50 && inputs.commentAuthorDiversity < 3) score += 10;
  else if (inputs.selfCommentRatio >= 0.30) score += 5;

  // Aşırı etiketleme (ort. mention > 2.5)
  if (inputs.avgMentionPerPost > 2.5) score += 5;

  // NOT: Kötü yorum oranı (badCommentRatio) zaten calcPenalties'de cezalandırılıyor.
  // Çift ceza önlemek için burada tekrarlanmıyor.

  return Math.min(score, 20);
}

function calcRehabilitationDecay(lastModerationDate: string | null): number {
  if (!lastModerationDate) return 1;
  const daysSince = (Date.now() - new Date(lastModerationDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= 14) return 0.4;
  if (daysSince >= 7) return 0.6;
  if (daysSince >= 3) return 0.8;
  return 1;
}

export function calculateSpamScore(inputs: ScoreInputs): number {
  const modHistory = calcModerationHistory(inputs);
  const behavioral = calcBehavioral(inputs);
  const community = calcCommunitySignals(inputs);
  const rateLimits = calcRateLimitViolations(inputs);
  const followerLoss = calcFollowerLoss(inputs);
  const manipulation = calcManipulation(inputs);

  const raw = Math.max(0, Math.min(100, modHistory + behavioral + community + rateLimits + followerLoss + manipulation));
  const decay = calcRehabilitationDecay(inputs.lastModerationDate);
  const decayed = raw * decay;

  const result = inputs.profile.shadow_banned
    ? Math.min(100, decayed + 50)
    : Math.min(100, Math.max(0, decayed));

  return Math.round(result * 100) / 100;
}

// ─── Copyright Eligibility Check ────────────────────────────────────
// Trust-based automatic copyright protection eligibility.
// Once eligible, only admin can revoke (cron never sets false).

export function checkCopyrightEligibility(
  profileScore: number,
  profile: ProfileData & { copyrightStrikeCount?: number },
): boolean {
  // Minimum profile score (encompasses spam/trust checks)
  if (profileScore < 40) return false;

  // Email must be verified
  if (!profile.email_verified) return false;

  // Account age: minimum 7 days
  const accountAge = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAge < 7) return false;

  // Copyright strike history: fewer than 3 strikes
  if ((profile.copyrightStrikeCount || 0) >= 3) return false;

  // Minimum content: at least 3 posts
  if ((profile.post_count || 0) < 3) return false;

  return true;
}
