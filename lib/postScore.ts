// Feedim — Post Scoring Engine v2
// 6 quality + 2 penalty dimensions → quality_score (0-100)
// 5 spam dimensions → spam_score (0-100)
// Content-type aware: post, note, video, moment

// ─── HTML Content Analysis ───────────────────────────────────────────

export interface ContentAnalysis {
  imageCount: number;
  headingCount: number;
  hasBlockquote: boolean;
  hasList: boolean;
  hasTable: boolean;
}

export function analyzeHtmlContent(html: string): ContentAnalysis {
  return {
    imageCount: (html.match(/<img[\s>]/gi) || []).length,
    headingCount: (html.match(/<h[23][\s>]/gi) || []).length,
    hasBlockquote: /<blockquote[\s>]/i.test(html),
    hasList: /<[uo]l[\s>]/i.test(html),
    hasTable: /<table[\s>]/i.test(html),
  };
}

// ─── Types ───────────────────────────────────────────────────────────

export interface PostData {
  id: number;
  author_id: string;
  word_count: number;
  status: string;
  is_nsfw: boolean;
  is_for_kids: boolean;
  featured_image: string | null;
  source_links: any[];
  like_count: number;
  comment_count: number;
  save_count: number;
  share_count: number;
  view_count: number;
  unique_view_count: number;
  premium_view_count: number;
  total_coins_earned: number;
  allow_comments: boolean;
  published_at: string;
  content_type: string;    // 'post' | 'note' | 'video' | 'moment'
  video_duration: number;  // saniye (video/moment için)
  reading_time: number;    // dakika (post için)
}

export interface PostScoreInputs {
  post: PostData;
  // Content analysis (from HTML)
  imageCount: number;
  headingCount: number;
  tagCount: number;
  hasBlockquote: boolean;
  hasList: boolean;
  hasTable: boolean;
  // Read quality (from post_views)
  avgReadDuration: number;
  avgReadPercentage: number;
  qualifiedReadCount: number;
  // Video/moment watch metrics
  avgWatchDuration: number;        // ort. izlenme süresi (saniye)
  avgWatchPercentage: number;      // ort. izlenme yüzdesi
  completionRate: number;          // tamamlama oranı
  // Engagement
  uniqueCommentersCount: number;
  replyCount: number;
  // Visitor quality (from viewer profiles)
  avgVisitorProfileScore: number;
  avgVisitorAccountAgeDays: number;
  activeVisitorRatio: number;
  premiumViewerRatio: number;
  newAccountViewerRatio: number;
  // Liker quality
  avgLikerProfileScore: number;        // beğenenlerin ort. profil puanı
  highScoreLikerRatio: number;         // profile_score >= 40 olan beğenen oranı
  likerLanguageDiversity: number;      // kaç farklı dilden beğenen var
  likerLanguageMismatchRatio: number;  // yazar dili ile uyumsuz beğenen oranı
  // Okumadan etkileşim (quick engagement detection)
  quickLikerRatio: number;
  quickSaverRatio: number;
  // Author
  authorProfileScore: number;
  authorIsVerified: boolean;
  authorSpamScore: number;
  // Economic
  giftCount: number;
  giftDiversity: number;
  // Moderation / flags — kesinleşmiş cezalar
  reportCount: number;               // ham rapor sayısı (spam score'da kullanılır)
  confirmedReportCount: number;       // status='resolved' raporlar (quality'de kullanılır)
  humanRemovedDecision: boolean;      // insan moderatör onaylı removal
  aiFlagged: boolean;
  // IP-based manipulation
  sameIpClusterRatio: number;
  // Bounce rate (hemen çıkma — read_duration < 5 AND read_percentage < 5)
  bounceRate: number;
  // Author consistency (yazar tutarlılığı)
  authorAvgQualityScore: number;
  authorPublishedCount: number;
  // Comment quality (yorum kalitesi)
  qualityCommentCount: number;
  shortCommentRatio: number;
  // Reciprocal engagement (karşılıklı etkileşim tarlaması)
  reciprocalEngagementRatio: number;
}

// ─── Post Quality Score (0-100) — 8 Dimensions ──────────────────────

/**
 * 1. İçerik Yapısı (max 15)
 *    İçerik tipine göre dallanır: post, note, video/moment
 */
function calcContentStructure(inputs: PostScoreInputs): number {
  const ct = inputs.post.content_type;
  if (ct === 'video' || ct === 'moment') return calcVideoContentStructure(inputs);
  if (ct === 'note') return calcNoteContentStructure(inputs);
  return calcTextPostContentStructure(inputs);
}

function calcVideoContentStructure(inputs: PostScoreInputs): number {
  const { post } = inputs;
  let score = 0;

  // Etiketler
  if (inputs.tagCount >= 3) score += 2;
  else if (inputs.tagCount >= 1) score += 1;

  // Thumbnail/featured_image
  if (post.featured_image) score += 2;

  // Video süresi sweet spot
  const dur = post.video_duration;
  if (post.content_type === 'moment') {
    // Moment: 15-60s ideal
    if (dur >= 15 && dur <= 60) score += 3;
    else if (dur > 0) score += 1;
  } else {
    // Video: 2-10dk (120-600s) ideal
    if (dur >= 120 && dur <= 600) score += 3;
    else if (dur > 0) score += 1;
  }

  // Açıklama word_count > 10
  if (post.word_count > 10) score += 2;

  // Kaynak linkleri
  if (Array.isArray(post.source_links) && post.source_links.length > 0) score += 1;

  return Math.min(score, 15);
}

function calcNoteContentStructure(inputs: PostScoreInputs): number {
  const { post } = inputs;
  let score = 0;

  // Etiketler
  if (inputs.tagCount >= 3) score += 2;
  else if (inputs.tagCount >= 1) score += 1;

  // Görsel
  if (post.featured_image) score += 2;
  if (inputs.imageCount >= 1) score += 1;

  // Note uzunluk sweet spot (10-56 kelime ≈ 50-280 karakter)
  if (post.word_count >= 10 && post.word_count <= 56) score += 5;
  else if (post.word_count >= 10) score += 3;
  else if (post.word_count > 0) score += 1;

  // Kaynak link
  if (Array.isArray(post.source_links) && post.source_links.length > 0) score += 1;

  return Math.min(score, 15);
}

function calcTextPostContentStructure(inputs: PostScoreInputs): number {
  const { post } = inputs;
  let score = 0;

  // Öne çıkan görsel
  if (post.featured_image) score += 2;

  // İçerikteki görseller (1-3 arası organik)
  if (inputs.imageCount >= 1 && inputs.imageCount <= 3) score += 2;
  else if (inputs.imageCount >= 4) score += 1;

  // Başlık yapısı (H2/H3)
  if (inputs.headingCount >= 2) score += 2;
  else if (inputs.headingCount >= 1) score += 1;

  // Etiketler
  if (inputs.tagCount >= 3) score += 2;
  else if (inputs.tagCount >= 1) score += 1;

  // Kelime sayısı
  if (post.word_count >= 300) score += 3;
  else if (post.word_count >= 100) score += 2;
  else if (post.word_count >= 30) score += 1;

  // Kaynak linkleri
  if (Array.isArray(post.source_links) && post.source_links.length > 0) score += 1;

  // İçerik çeşitliliği (blockquote, liste, tablo)
  let diversity = 0;
  if (inputs.hasBlockquote) diversity++;
  if (inputs.hasList) diversity++;
  if (inputs.hasTable) diversity++;
  if (diversity >= 2) score += 2;
  else if (diversity >= 1) score += 1;

  return Math.min(score, 15);
}

/**
 * 2. Okuma/İzleme Kalitesi (max 20)
 *    İçerik tipine göre dallanır
 */
function calcReadQuality(inputs: PostScoreInputs): number {
  const ct = inputs.post.content_type;
  if (ct === 'video' || ct === 'moment') return calcWatchQuality(inputs);
  if (ct === 'note') return calcNoteReadQuality(inputs);
  return calcTextReadQuality(inputs);
}

function calcWatchQuality(inputs: PostScoreInputs): number {
  if (inputs.post.unique_view_count < 3) return 0;
  const views = inputs.post.unique_view_count;
  let score = 0;

  // Ort. izlenme yüzdesi
  if (inputs.avgWatchPercentage >= 70) score += 5;
  else if (inputs.avgWatchPercentage >= 50) score += 3;
  else if (inputs.avgWatchPercentage >= 30) score += 1;

  // Ort. izlenme süresi
  if (inputs.post.content_type === 'moment') {
    // Moment (≤60s): daha kısa eşikler
    if (inputs.avgWatchDuration >= 30) score += 5;
    else if (inputs.avgWatchDuration >= 15) score += 3;
    else if (inputs.avgWatchDuration >= 8) score += 1;
  } else {
    // Video: daha uzun eşikler
    if (inputs.avgWatchDuration >= 120) score += 6;
    else if (inputs.avgWatchDuration >= 60) score += 4;
    else if (inputs.avgWatchDuration >= 30) score += 2;
  }

  // Tamamlama oranı
  if (inputs.completionRate >= 0.40) score += 5;
  else if (inputs.completionRate >= 0.20) score += 3;
  else if (inputs.completionRate >= 0.10) score += 1;

  // Çok kısa izlenme cezası (<5s, 50+ view)
  if (inputs.avgWatchDuration > 0 && inputs.avgWatchDuration < 5 && views >= 50) {
    score -= 4;
  }

  // Bounce rate (read_duration <3s)
  if (views >= 20 && inputs.bounceRate > 0.50) score -= 3;
  else if (views >= 20 && inputs.bounceRate > 0.30) score -= 1;

  return Math.min(score, 20);
}

function calcNoteReadQuality(inputs: PostScoreInputs): number {
  if (inputs.post.unique_view_count < 3) return 0;
  const views = inputs.post.unique_view_count;
  let score = 0;

  // Ort. okuma süresi (notlar kısa, 10s yeterli)
  if (inputs.avgReadDuration >= 10) score += 6;
  else if (inputs.avgReadDuration >= 5) score += 4;
  else if (inputs.avgReadDuration >= 3) score += 2;

  // Ort. okuma yüzdesi
  if (inputs.avgReadPercentage >= 80) score += 5;
  else if (inputs.avgReadPercentage >= 60) score += 3;
  else if (inputs.avgReadPercentage >= 40) score += 1;

  // Nitelikli okuma oranı (≥5s AND ≥50%)
  const qrRatio = views > 0 ? inputs.qualifiedReadCount / views : 0;
  if (qrRatio >= 0.50) score += 5;
  else if (qrRatio >= 0.30) score += 3;
  else if (qrRatio >= 0.15) score += 1;

  // Bounce (<2s)
  if (views >= 20 && inputs.bounceRate > 0.50) score -= 3;
  else if (views >= 20 && inputs.bounceRate > 0.30) score -= 1;

  return Math.min(score, 20);
}

function calcTextReadQuality(inputs: PostScoreInputs): number {
  if (inputs.post.unique_view_count < 3) return 0;
  let score = 0;

  // Ortalama okuma süresi
  if (inputs.avgReadDuration >= 120) score += 6;
  else if (inputs.avgReadDuration >= 60) score += 4;
  else if (inputs.avgReadDuration >= 30) score += 2;

  // Ortalama okuma yüzdesi (scroll derinliği)
  if (inputs.avgReadPercentage >= 70) score += 5;
  else if (inputs.avgReadPercentage >= 50) score += 3;
  else if (inputs.avgReadPercentage >= 30) score += 1;

  // Nitelikli okuma oranı
  const views = inputs.post.unique_view_count;
  const qrRatio = views > 0 ? inputs.qualifiedReadCount / views : 0;
  if (qrRatio >= 0.40) score += 5;
  else if (qrRatio >= 0.20) score += 3;
  else if (qrRatio >= 0.10) score += 1;

  // Çok kısa okuma süresi cezası (düşük kalite sinyali)
  if (inputs.avgReadDuration > 0 && inputs.avgReadDuration < 15 && views >= 50) {
    score -= 4;
  }

  // Hemen çıkma oranı (bounce) — açıp 3-5 saniyede çıkıyorlar
  if (views >= 20 && inputs.bounceRate > 0.50) score -= 3;
  else if (views >= 20 && inputs.bounceRate > 0.30) score -= 1;

  return Math.min(score, 20);
}

/**
 * 3. Etkileşim Kalitesi (max 20)
 *    Beğeni oranı, organik yorumlar, kaydetme, tartışma, paylaşım
 */
function calcEngagementQuality(inputs: PostScoreInputs): number {
  const views = inputs.post.unique_view_count;
  let score = 0;

  // Beğeni oranı
  if (views > 0) {
    const likeRatio = inputs.post.like_count / views;
    if (likeRatio >= 0.15) score += 4;
    else if (likeRatio >= 0.08) score += 3;
    else if (likeRatio >= 0.03) score += 2;
    else if (likeRatio > 0) score += 1;
  }

  // Organik yorumcular (yazar hariç benzersiz kişi)
  if (inputs.uniqueCommentersCount >= 10) score += 5;
  else if (inputs.uniqueCommentersCount >= 5) score += 3;
  else if (inputs.uniqueCommentersCount >= 2) score += 2;
  else if (inputs.uniqueCommentersCount >= 1) score += 1;

  // Kaydetme oranı
  if (views > 0) {
    const saveRatio = inputs.post.save_count / views;
    if (saveRatio >= 0.05) score += 3;
    else if (saveRatio >= 0.02) score += 2;
    else if (saveRatio >= 0.005) score += 1;
  }

  // Tartışma derinliği (yanıtlar)
  if (inputs.replyCount >= 10) score += 3;
  else if (inputs.replyCount >= 3) score += 2;
  else if (inputs.replyCount >= 1) score += 1;

  // Paylaşımlar
  if (inputs.post.share_count >= 10) score += 2;
  else if (inputs.post.share_count >= 3) score += 1;

  // Kaliteli yorum bonusu (>20 kelime, gerçek tartışma)
  if (inputs.qualityCommentCount >= 5) score += 3;
  else if (inputs.qualityCommentCount >= 2) score += 2;
  else if (inputs.qualityCommentCount >= 1) score += 1;

  // Boş yorum cezası ("güzel yazı" gibi < 5 kelime oranı yüksek)
  if (inputs.post.comment_count > 5 && inputs.shortCommentRatio > 0.80) score -= 2;

  return Math.min(score, 20);
}

/**
 * 4. Ziyaretçi + Beğenen Kalitesi (max 20) — EN ÖNEMLİ BOYUT
 *    Ziyaretçi profil puanı, hesap yaşı, aktiflik, premium oranı
 *    + Beğenen profil puanı, dil sağlığı
 */
function calcVisitorQuality(inputs: PostScoreInputs): number {
  if (inputs.post.unique_view_count < 3) return 0;
  let score = 0;

  // Ziyaretçilerin ortalama profil puanı (max 6, eski 8'den düşürüldü)
  if (inputs.avgVisitorProfileScore >= 60) score += 6;
  else if (inputs.avgVisitorProfileScore >= 40) score += 5;
  else if (inputs.avgVisitorProfileScore >= 20) score += 3;
  else if (inputs.avgVisitorProfileScore > 0) score += 1;

  // Ziyaretçi hesap yaşı ortalaması (max 2, eski 3'ten düşürüldü)
  if (inputs.avgVisitorAccountAgeDays >= 365) score += 2;
  else if (inputs.avgVisitorAccountAgeDays >= 180) score += 1;

  // Aktif ziyaretçi oranı (max 2, eski 3'ten düşürüldü)
  if (inputs.activeVisitorRatio >= 0.50) score += 2;
  else if (inputs.activeVisitorRatio >= 0.25) score += 1;

  // Premium izleyici oranı (max 2, aynı)
  if (inputs.premiumViewerRatio >= 0.20) score += 2;
  else if (inputs.premiumViewerRatio >= 0.10) score += 1;

  // Beğenen profil puanı (max 4, YENİ)
  if (inputs.avgLikerProfileScore >= 50) score += 4;
  else if (inputs.avgLikerProfileScore >= 30) score += 3;
  else if (inputs.avgLikerProfileScore >= 15) score += 2;
  else if (inputs.avgLikerProfileScore > 0) score += 1;

  // Beğenen dil sağlığı (max 2, YENİ)
  if (inputs.likerLanguageDiversity >= 2 && inputs.likerLanguageMismatchRatio < 0.70) {
    score += 2; // Sağlıklı çeşitlilik
  }
  if (inputs.likerLanguageMismatchRatio > 0.80 && inputs.post.like_count >= 10) {
    score -= 1; // Şüpheli tek dil grubu
  }

  // Yeni hesap seli cezası (botlar / sahte hesaplar)
  if (inputs.newAccountViewerRatio > 0.30 && inputs.post.unique_view_count >= 20) {
    score -= 4;
  }

  // Düşük kalite beğenen cezası (YENİ)
  if (inputs.post.like_count >= 10 && inputs.highScoreLikerRatio < 0.20) {
    score -= 2;
  }

  return Math.min(score, 20);
}

/**
 * 5. Yazar Otoritesi (max 10)
 *    Profil puanı, güven seviyesi, doğrulama, spam skoru
 */
function calcAuthorAuthority(inputs: PostScoreInputs): number {
  let score = 0;

  if (inputs.authorProfileScore >= 80) score += 4;
  else if (inputs.authorProfileScore >= 60) score += 3;
  else if (inputs.authorProfileScore >= 40) score += 2;
  else if (inputs.authorProfileScore >= 20) score += 1;

  if (inputs.authorIsVerified) score += 2;

  // Yazar tutarlılık bonusu (sürekli kaliteli yayın yapan yazar)
  if (inputs.authorPublishedCount >= 5) {
    if (inputs.authorAvgQualityScore >= 60) score += 3;
    else if (inputs.authorAvgQualityScore >= 40) score += 2;
    else if (inputs.authorAvgQualityScore >= 20) score += 1;
  }

  // Cold Start Boost — yeni yazılar 0 etkileşimle başlıyor
  // Yazarın profil puanına göre başlangıç avantajı ver
  if (inputs.post.unique_view_count < 5) {
    if (inputs.authorProfileScore >= 70) score += 5;
    else if (inputs.authorProfileScore >= 50) score += 3;
    else if (inputs.authorProfileScore >= 30) score += 2;
  }

  // Yazar spam cezası
  if (inputs.authorSpamScore >= 50) score -= 5;
  else if (inputs.authorSpamScore >= 30) score -= 3;

  return Math.min(score, 10);
}

/**
 * 6. Ekonomik Sinyaller (max 8)
 *    Hediye sayısı, hediye çeşitliliği, kazanılan jeton
 */
function calcEconomicSignals(inputs: PostScoreInputs): number {
  let score = 0;

  if (inputs.giftCount >= 5) score += 3;
  else if (inputs.giftCount >= 2) score += 2;
  else if (inputs.giftCount >= 1) score += 1;

  if (inputs.giftDiversity >= 3) score += 3;
  else if (inputs.giftDiversity >= 2) score += 2;

  if (inputs.post.total_coins_earned >= 100) score += 2;
  else if (inputs.post.total_coins_earned >= 20) score += 1;

  return Math.min(score, 8);
}

/**
 * 7. İçerik Cezaları (max -21)
 *    NSFW, kesinleşmiş şikayetler, insan moderatör kararı, AI flag, yorum kapalı
 */
function calcContentPenalties(inputs: PostScoreInputs): number {
  let penalty = 0;

  if (inputs.post.is_nsfw) penalty -= 5;

  // Sadece kesinleşmiş (resolved) raporlar
  if (inputs.confirmedReportCount >= 5) penalty -= 8;
  else if (inputs.confirmedReportCount >= 3) penalty -= 5;
  else if (inputs.confirmedReportCount >= 1) penalty -= 2;

  // İnsan moderatör onaylı removal (kesinleşmiş — ağırlığı artırıldı)
  if (inputs.humanRemovedDecision) penalty -= 5;

  // AI flag (sistem kararı — düşük ama geçerli ceza)
  if (inputs.aiFlagged) penalty -= 2;

  if (!inputs.post.allow_comments) penalty -= 1;

  return penalty;
}

/**
 * 8. Manipülasyon Tespiti (max -33)
 *    Okumadan etkileşim, aynı IP, niteliksiz okuma, karşılıklı etkileşim tarlaması
 */
function calcManipulationPenalty(inputs: PostScoreInputs): number {
  const { post } = inputs;
  let penalty = 0;

  // Okumadan beğenme — kişi yazıyı okumadan direkt beğenip çıkıyor
  if (post.like_count >= 10) {
    if (inputs.quickLikerRatio > 0.60) penalty -= 8;
    else if (inputs.quickLikerRatio > 0.40) penalty -= 5;
  }

  // Okumadan kaydetme
  if (post.save_count >= 5) {
    if (inputs.quickSaverRatio > 0.50) penalty -= 5;
  }

  // Aynı IP'den çoklu hesap etkileşimi
  if (post.unique_view_count >= 20 && inputs.sameIpClusterRatio > 0.30) {
    penalty -= 7;
  }

  // Hiç nitelikli okuma yok ama çok view var
  if (post.unique_view_count > 50 && inputs.qualifiedReadCount === 0) {
    penalty -= 5;
  }

  // Karşılıklı etkileşim tarlaması (YENİ)
  if (post.like_count >= 5) {
    if (inputs.reciprocalEngagementRatio > 0.60) penalty -= 8;
    else if (inputs.reciprocalEngagementRatio > 0.40) penalty -= 5;
    else if (inputs.reciprocalEngagementRatio > 0.25) penalty -= 3;
  }

  return penalty;
}

export function calculatePostQualityScore(inputs: PostScoreInputs): number {
  const dims = calcContentStructure(inputs)
    + calcReadQuality(inputs)
    + calcEngagementQuality(inputs)
    + calcVisitorQuality(inputs)
    + calcAuthorAuthority(inputs)
    + calcEconomicSignals(inputs)
    + calcContentPenalties(inputs)
    + calcManipulationPenalty(inputs);

  return Math.round(Math.max(0, Math.min(100, dims)) * 100) / 100;
}

// ─── Post Spam Score (0-100) — 5 Dimensions ─────────────────────────

/**
 * 1. Hızlı Etkileşim (max 30)
 *    Okumadan beğenme/kaydetme oranı + karşılıklı etkileşim tarlaması
 */
function calcQuickEngagement(inputs: PostScoreInputs): number {
  const { post } = inputs;
  let score = 0;

  // quickLikerRatio/quickSaverRatio already computed in cron with content-type thresholds:
  // post: 10s, note: 3s, video: 5s, moment: 3s

  // Okumadan beğenme
  if (post.like_count >= 5) {
    if (inputs.quickLikerRatio > 0.60) score += 20;
    else if (inputs.quickLikerRatio > 0.40) score += 12;
    else if (inputs.quickLikerRatio > 0.20) score += 6;
  }

  // Okumadan kaydetme
  if (post.save_count >= 3) {
    if (inputs.quickSaverRatio > 0.50) score += 10;
    else if (inputs.quickSaverRatio > 0.30) score += 5;
  }

  // Karşılıklı etkileşim tarlaması (YENİ)
  if (post.like_count >= 5) {
    if (inputs.reciprocalEngagementRatio > 0.50) score += 15;
    else if (inputs.reciprocalEngagementRatio > 0.30) score += 8;
  }

  return Math.min(score, 30);
}

/**
 * 2. Ziyaretçi Anomalileri (max 25)
 *    Yeni hesap seli, düşük profilli ziyaretçiler, aynı IP
 */
function calcVisitorAnomalies(inputs: PostScoreInputs): number {
  if (inputs.post.unique_view_count < 10) return 0;
  let score = 0;

  // Yeni hesap seli (< 7 gün)
  if (inputs.newAccountViewerRatio > 0.40) score += 15;
  else if (inputs.newAccountViewerRatio > 0.20) score += 8;

  // Düşük profilli ziyaretçiler (bot/sahte hesap sinyali)
  if (inputs.avgVisitorProfileScore >= 0 && inputs.avgVisitorProfileScore < 10) score += 10;
  else if (inputs.avgVisitorProfileScore < 20) score += 5;

  // Aynı IP kümesi
  if (inputs.sameIpClusterRatio > 0.30) score += 15;
  else if (inputs.sameIpClusterRatio > 0.20) score += 8;

  return Math.min(score, 25);
}

/**
 * 3. Etkileşim Anomalileri (max 20)
 *    Aşırı beğeni oranı, yorumsuz beğeni, niteliksiz okuma
 */
function calcEngagementAnomalies(inputs: PostScoreInputs): number {
  const { post } = inputs;
  const views = post.unique_view_count;
  if (views < 10) return 0;
  let score = 0;

  // Beğeni/görüntüleme oranı anormal yüksek
  const likeRatio = views > 0 ? post.like_count / views : 0;
  if (likeRatio > 0.50) score += 10;
  else if (likeRatio > 0.30) score += 5;

  // Çok beğeni ama hiç yorum (şüpheli)
  if (post.like_count > 20 && post.comment_count === 0) score += 5;

  // Hiç nitelikli okuma yok ama çok view
  if (views > 50 && inputs.qualifiedReadCount === 0) score += 10;

  // Yüksek bounce rate — çoğu kişi açıp hemen çıkıyor (clickbait)
  if (views >= 20 && inputs.bounceRate > 0.60) score += 8;
  else if (views >= 20 && inputs.bounceRate > 0.40) score += 4;

  return Math.min(score, 20);
}

/**
 * 4. Moderasyon Geçmişi (max 15)
 *    Şikayetler (ham — agresif tespit), moderasyon, AI flag, yazar spam katkısı
 */
function calcPostModerationHistory(inputs: PostScoreInputs): number {
  let score = 0;

  // Ham rapor sayısı (spam tespiti agresif olmalı)
  if (inputs.reportCount >= 5) score += 10;
  else if (inputs.reportCount >= 3) score += 6;
  else if (inputs.reportCount >= 1) score += 3;

  if (inputs.humanRemovedDecision) score += 3;
  if (inputs.aiFlagged) score += 2;

  // Yazar spam katkısı
  if (inputs.authorSpamScore >= 70) score += 5;
  else if (inputs.authorSpamScore >= 50) score += 3;

  return Math.min(score, 15);
}

/**
 * 5. İçerik Bayrakları (max 10)
 *    NSFW, çok kısa içerik + yüksek view (clickbait)
 */
function calcPostContentFlags(inputs: PostScoreInputs): number {
  const { post } = inputs;
  let score = 0;

  if (post.is_nsfw) score += 5;

  // Çok kısa içerik ama çok view (clickbait sinyali)
  if (post.word_count < 20 && post.unique_view_count > 50) score += 5;

  return Math.min(score, 10);
}

export function calculatePostSpamScore(inputs: PostScoreInputs): number {
  const dims = calcQuickEngagement(inputs)
    + calcVisitorAnomalies(inputs)
    + calcEngagementAnomalies(inputs)
    + calcPostModerationHistory(inputs)
    + calcPostContentFlags(inputs);

  return Math.round(Math.max(0, Math.min(100, dims)) * 100) / 100;
}
