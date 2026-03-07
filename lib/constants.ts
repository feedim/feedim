// Feedim - Platform Sabitleri

// Premium üyelik fiyatları (TL) — kaynak: app/premium/page.tsx
// basic(Super)=39.99/ay 399/yıl, pro=79.99/ay 799/yıl, max=129/ay 1290/yıl, business=249/ay 2490/yıl
export const PREMIUM_PLANS = {
  basic:    { monthly: 39.99, yearly: 399 },
  pro:      { monthly: 79.99, yearly: 799 },
  max:      { monthly: 129,   yearly: 1290 },
  business: { monthly: 249,   yearly: 2490 },
} as const;

// Jeton ekonomisi
export const COIN_BASE_EARNING = 1;        // Geçerli okuma başına temel Jeton
export const COIN_DAILY_LIMIT = 500;       // Kullanıcı başına günlük max kazanç
export const COIN_POST_LIMIT = 10000;      // Gönderi başına toplam max kazanç
export const COIN_MIN_WITHDRAWAL = 600;    // Minimum çekim miktarı
export const COIN_TO_TRY_RATE = 0.3333;   // 1 Jeton ≈ 0.33 TL
export const COIN_COMMISSION_RATE = 0.20;  // %20 Feedim komisyonu

// Jeton satın alma
export const COIN_PRICE_PER_TRY = 3;      // 1 TL = 3 jeton
export const COIN_MIN_PURCHASE = 50;       // Minimum ₺50
export const COIN_MAX_PURCHASE = 10000;    // Maximum ₺10.000
export const COIN_BONUS_TIERS = [
  { minTRY: 1000, bonusPercent: 20 },
  { minTRY: 500,  bonusPercent: 15 },
  { minTRY: 250,  bonusPercent: 10 },
  { minTRY: 100,  bonusPercent: 5 },
] as const; // Büyükten küçüğe sıralı — ilk eşleşen kazanır

// Okuma kazanç koşulları
export const MIN_READ_DURATION = 30;       // saniye
export const MIN_READ_PERCENTAGE = 40;     // %
export const READ_COOLDOWN_HOURS = 24;     // Aynı okuyucu aynı gönderi

// Anti-spam: sunucu tarafı süre limitleri
export const MAX_READ_DURATION = 3600;            // 1 saat (metin yazılar)
export const MAX_VIDEO_WATCH_DURATION = 900;      // 15 dakika (video)
export const DURATION_SANITY_MULTIPLIER = 3;      // reading_time * 3 (metin)
export const VIDEO_DURATION_SANITY_MULTIPLIER = 2; // video_duration * 2 (video)

// Hediye tipleri
export const GIFT_TYPES = {
  rose: { name: 'Gul', labelKey: 'gifts.rose', coins: 1, emoji: '🌹' },
  coffee: { name: 'Kahve', labelKey: 'gifts.coffee', coins: 5, emoji: '☕' },
  heart: { name: 'Kalp', labelKey: 'gifts.heart', coins: 10, emoji: '❤️' },
  fire: { name: 'Ates', labelKey: 'gifts.fire', coins: 15, emoji: '🔥' },
  star: { name: 'Yildiz', labelKey: 'gifts.star', coins: 25, emoji: '⭐' },
  crown: { name: 'Tac', labelKey: 'gifts.crown', coins: 50, emoji: '👑' },
  diamond: { name: 'Elmas', labelKey: 'gifts.diamond', coins: 100, emoji: '💎' },
  rocket: { name: 'Roket', labelKey: 'gifts.rocket', coins: 200, emoji: '🚀' },
  unicorn: { name: 'Unicorn', labelKey: 'gifts.unicorn', coins: 500, emoji: '🦄' },
  planet: { name: 'Gezegen', labelKey: 'gifts.planet', coins: 1000, emoji: '🪐' },
} as const;

// Profil puanlama ağırlıkları (7 boyut)
export const PROFILE_SCORE_WEIGHTS = {
  completeness: 15,
  activity: 25,
  socialTrust: 20,
  contentQuality: 26,
  engagementQuality: 22,
  economicActivity: 13,
  penaltyMax: -68,
  shadowBanPenalty: 50,
};

// Spam puanlama ağırlıkları (7 boyut)
export const SPAM_SCORE_WEIGHTS = {
  moderationHistory: 30,
  behavioral: 30,
  communitySignals: 20,
  rateLimitViolations: 20,
  followerLoss: 15,
  manipulation: 20,
  shadowBanBonus: 50,
};

// Gönderi kalite puanlama ağırlıkları (8 boyut)
export const POST_QUALITY_WEIGHTS = {
  contentStructure: 15,
  readQuality: 20,
  engagementQuality: 20,
  visitorQuality: 20,
  authorAuthority: 10,
  economicSignals: 8,
  contentPenalties: -20,
  manipulationPenalty: -25,
};

// Gönderi spam puanlama ağırlıkları (5 boyut)
export const POST_SPAM_WEIGHTS = {
  quickEngagement: 30,
  visitorAnomalies: 25,
  engagementAnomalies: 20,
  moderationHistory: 15,
  contentFlags: 10,
};

// Spam eşikleri
export const SPAM_THRESHOLDS = {
  moderation: 30,
  earningStop: 50,
  autoModeration: 70,
  autoBlock: 90,
};

// Taslak limiti
export const MAX_DRAFTS = 10;

// Rate limiting
export const RATE_LIMITS = {
  api: { limit: 60, window: 60_000 },           // 60 req/dakika
  comment_user: { perMinute: 5, perHour: 30, perDay: 100 },
  comment_guest: { perMinute: 2, perHour: 10, perDay: 30 },
  follow: { perMinute: 10, perHour: 60 },
  like: { perMinute: 30, perHour: 300 },
};

// Günlük aksiyon limitleri (plan bazlı) — detay: lib/limits.ts
// follow:  free=200, basic=250, pro=440, max=500, business=500
// like:    free=200, basic=250, pro=440, max=500, business=500
// comment: free=65,  basic=85,  pro=100, max=125, business=125

// Validasyon kuralları
export const VALIDATION = {
  username: { min: 3, max: 15, pattern: /^(?!.*[._]{2})[A-Za-z0-9](?:[A-Za-z0-9._]{1,13})[A-Za-z0-9]$/ },
  password: { min: 6, max: 128 },
  name: { min: 2, max: 50, pattern: /^[\p{L}\s]+$/u },
  email: { max: 60 },
  phone: { digits: 10 },
  bio: { max: 150 },
  website: { max: 255 },
  birthDate: { minAge: 15, maxAge: 120 },
  gender: ['male', 'female'] as const,
  postTitle: { min: 3, max: 200 },
  postContent: { minChars: 50, maxWords: 5000, maxWordsMax: 10000, maxListItems: 300 },
  noteContent: { min: 1, max: 280 },
  postTags: { max: 5 },
  tagName: { min: 2, max: 50, pattern: /^[a-zA-ZçÇğĞıİöÖşŞüÜâÂêÊîÎôÔûÛäÄëËïÏ0-9\s\-_.&#+]+$/ },
  imageCaption: { max: 60 },
  mentions: { max: 3 },
  comment: { max: 250, maxPremium: 400, maxLinks: 2 },
  tagFollow: { max: 10 },
};

// İzin verilen ülke kodları
export const ALLOWED_COUNTRY_CODES = [
  '+90', '+1', '+44', '+49', '+33', '+39', '+34', '+31', '+7',
  '+86', '+81', '+82', '+91', '+55', '+52', '+61', '+64', '+27', '+20', '+971', '+966',
] as const;

// Email domain whitelist
export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
  'live.com', 'msn.com', 'yandex.com', 'mail.com', 'protonmail.com',
];

// Gönderi öne çıkarma (Boost)
export const BOOST_MIN_DAILY = 100;      // ₺100 minimum günlük bütçe
export const BOOST_MAX_DAILY = 1500;     // ₺1.500 maksimum günlük bütçe
export const BOOST_MAX_DAYS = 7;         // Maksimum kampanya süresi (gün)

// Boost hedef tipleri (eğilimler)
export const BOOST_GOALS = [
  { id: 'likes', labelKey: 'boost.goalLikes', icon: 'Heart', multiplier: 0.6 },
  { id: 'views', labelKey: 'boost.goalViews', icon: 'Eye', multiplier: 1.2 },
  { id: 'comments', labelKey: 'boost.goalComments', icon: 'MessageCircle', multiplier: 0.5 },
  { id: 'profile_visits', labelKey: 'boost.goalProfileVisits', icon: 'UserCheck', multiplier: 0.55 },
  { id: 'reads', labelKey: 'boost.goalReads', icon: 'BookOpen', multiplier: 0.5 },
] as const;

// Boost yaş aralıkları
export const BOOST_AGE_RANGES = [
  { id: '18-24', min: 18, max: 24, label: '18-24' },
  { id: '25-34', min: 25, max: 34, label: '25-34' },
  { id: '35-44', min: 35, max: 44, label: '35-44' },
  { id: '45-54', min: 45, max: 54, label: '45-54' },
  { id: '55+', min: 55, max: 99, label: '55+' },
] as const;

// Boost ülke listesi
export const BOOST_COUNTRIES = [
  { code: 'TR', labelKey: 'boost.countryTR' },
] as const;

// Reklam — sadece video post-roll (4–10 dk arası)
export const AD_SKIP_DELAY = 8;            // saniye — skip butonu gecikmesi
export const AD_POSTROLL_MIN = 240;        // 4:00 — altındaki videolarda reklam yok
export const AD_POSTROLL_MAX = 600;        // 10:00 — üstündeki videolarda reklam yok

// Video
export const VIDEO_MAX_DURATION = 600; // 10 dakika (saniye)
export const VIDEO_MAX_SIZE_MB = 200; // MB (R2 storage)
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/x-m4v', 'video/ogg', 'video/mpeg'] as const;
export const VIDEO_PAGE_SIZE = 10;

// Moment
export const MOMENT_MAX_DURATION = 60; // saniye
export const MOMENT_MAX_SIZE_MB = 100; // MB
export const MOMENT_PAGE_SIZE = 10;

// Audio (Moment ses sistemi)
export const AUDIO_MAX_SIZE_MB = 10;
export const AUDIO_MAX_DURATION = 60;
export const AUDIO_ALLOWED_TYPES = ['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm'] as const;

// İçerik tipleri
export const CONTENT_TYPES = {
  post: { label: 'Gönderi', labelKey: 'contentTypes.post', icon: '📝' },
  note: { label: 'Not', labelKey: 'contentTypes.note', icon: '📌' },
  video: { label: 'Video', labelKey: 'contentTypes.video', icon: '🎥' },
  moment: { label: 'Moment', labelKey: 'contentTypes.moment', icon: '🎬' },
} as const;

// Bildirim tipleri
export const NOTIFICATION_TYPES = [
  'like', 'comment', 'reply', 'mention', 'follow',
  'follow_request', 'follow_accepted', 'comment_like',
  'first_post', 'comeback_post', 'milestone',
  'coin_earned', 'gift_received', 'premium_expired', 'premium_activated', 'premium_cancelled', 'system',
  'view_milestone', 'device_login',
  'moderation_review', 'moderation_approved', 'moderation_rejected',
  'account_moderation',
  'copyright_detected', 'copyright_claim_submitted', 'copyright_verified',
  'copyright_rejected', 'copyright_verification_needed', 'copyright_similar_detected',
  'copyright_application_approved', 'copyright_application_rejected', 'copyright_revoked',
  'boost_payment', 'boost_approved', 'boost_rejected', 'boost_completed',
  'report_resolved', 'report_dismissed',
] as const;

// Bildirim türü grupları — tab filtreleme için
export const NOTIFICATION_SOCIAL_TYPES = [
  'like', 'comment', 'reply', 'mention', 'follow',
  'follow_request', 'follow_accepted', 'comment_like',
  'first_post', 'comeback_post', 'gift_received',
] as const;

export const NOTIFICATION_SYSTEM_TYPES = [
  'milestone', 'system', 'coin_earned', 'premium_expired', 'premium_activated', 'premium_cancelled',
  'view_milestone', 'device_login',
  'moderation_review', 'moderation_approved', 'moderation_rejected',
  'account_moderation',
  'copyright_detected', 'copyright_claim_submitted', 'copyright_verified',
  'copyright_rejected', 'copyright_verification_needed', 'copyright_similar_detected',
  'copyright_application_approved', 'copyright_application_rejected', 'copyright_revoked',
  'boost_payment', 'boost_approved', 'boost_rejected', 'boost_completed',
  'report_resolved', 'report_dismissed',
] as const;

// Paylaşım platformları
export const SHARE_PLATFORMS = [
  { id: 'copy', name: 'Kopyala', labelKey: 'share.copy' },
  { id: 'wa', name: 'WhatsApp' },
  { id: 'tw', name: 'X' },
  { id: 'fb', name: 'Facebook' },
  { id: 'pin', name: 'Pinterest' },
  { id: 'em', name: 'Email', labelKey: 'share.email' },
  { id: 'native', name: 'Paylaş', labelKey: 'share.share' },
] as const;

// Milestone eşikleri
export const MILESTONES = [1000, 10000, 100000, 1000000, 10000000];

// Feed
export const FEED_PAGE_SIZE = 10;
export const FEED_BOOST_INTERVAL = 8;
export const FEED_CANDIDATE_POOL = 60;
export const FEED_DISCOVERY_QUALITY_GATE = 0;
export const FEED_MIN_CANDIDATES = 30;    // Bu altında genişleme başlar
export const FEED_SEEN_PENALTY = 200;     // Görülmüş post skor cezası
export const FEED_MAX_SEEN_IDS = 200;     // Client'dan max seen ID sayısı
export const COMMENTS_PAGE_SIZE = 10;
export const NOTIFICATIONS_PAGE_SIZE = 10;
export const NOTIFICATION_CLEANUP_DAYS = 90;


// İlgi alanı kategorileri
export const INTEREST_CATEGORIES = [
  { id: 1,  slug: 'entertainment',  labelKey: 'interests.entertainment',  icon: 'Clapperboard' },
  { id: 2,  slug: 'music',          labelKey: 'interests.music',          icon: 'Music' },
  { id: 3,  slug: 'sports',         labelKey: 'interests.sports',         icon: 'Trophy' },
  { id: 4,  slug: 'technology',     labelKey: 'interests.technology',     icon: 'Cpu' },
  { id: 5,  slug: 'gaming',         labelKey: 'interests.gaming',         icon: 'Gamepad2' },
  { id: 6,  slug: 'food',           labelKey: 'interests.food',           icon: 'UtensilsCrossed' },
  { id: 7,  slug: 'fashion',        labelKey: 'interests.fashion',        icon: 'Shirt' },
  { id: 8,  slug: 'travel',         labelKey: 'interests.travel',         icon: 'Plane' },
  { id: 9,  slug: 'education',      labelKey: 'interests.education',      icon: 'GraduationCap' },
  { id: 10, slug: 'news',           labelKey: 'interests.news',           icon: 'Newspaper' },
  { id: 11, slug: 'art',            labelKey: 'interests.art',            icon: 'Palette' },
  { id: 12, slug: 'health',         labelKey: 'interests.health',         icon: 'HeartPulse' },
  { id: 13, slug: 'business',       labelKey: 'interests.business',       icon: 'Briefcase' },
  { id: 14, slug: 'humor',          labelKey: 'interests.humor',          icon: 'Laugh' },
  { id: 15, slug: 'animals',        labelKey: 'interests.animals',        icon: 'PawPrint' },
  { id: 16, slug: 'science',        labelKey: 'interests.science',        icon: 'FlaskConical' },
  { id: 17, slug: 'automotive',     labelKey: 'interests.automotive',     icon: 'Car' },
  { id: 18, slug: 'cinema',         labelKey: 'interests.cinema',         icon: 'Film' },
  { id: 19, slug: 'books',          labelKey: 'interests.books',          icon: 'BookOpen' },
  { id: 20, slug: 'lifestyle',      labelKey: 'interests.lifestyle',      icon: 'Sparkles' },
] as const;

export const INTEREST_MIN_SELECT = 3;
export const INTEREST_MAX_SELECT = 8;

export const INTEREST_WEIGHTS = { view: 1, like: 3, share: 4, comment: 5, save: 6 } as const;

// Profesyonel hesap kategorileri
export const PROFESSIONAL_CATEGORIES = {
  creator: [
    { value: "kisisel_blog", label: "Kişisel Blog", labelKey: "professional.personalBlog" },
    { value: "dijital_icerik", label: "Dijital İçerik Üretici", labelKey: "professional.digitalContent" },
    { value: "sanatci", label: "Sanatçı", labelKey: "professional.artist" },
    { value: "muzisyen", label: "Müzisyen", labelKey: "professional.musician" },
    { value: "oyuncu", label: "Oyuncu", labelKey: "professional.actor" },
    { value: "yazar", label: "Yazar", labelKey: "professional.writer" },
    { value: "sporcu", label: "Sporcu", labelKey: "professional.athlete" },
    { value: "fotografci", label: "Fotoğrafçı", labelKey: "professional.photographer" },
    { value: "diger", label: "Diğer", labelKey: "professional.otherCreator" },
  ],
  business: [
    { value: "yerel_isletme", label: "Yerel İşletme", labelKey: "professional.localBusiness" },
    { value: "marka", label: "Marka", labelKey: "professional.brand" },
    { value: "e_ticaret", label: "E-ticaret", labelKey: "professional.ecommerce" },
    { value: "restoran_kafe", label: "Restoran/Kafe", labelKey: "professional.restaurant" },
    { value: "saglik_guzellik", label: "Sağlık/Güzellik", labelKey: "professional.healthBeauty" },
    { value: "egitim", label: "Eğitim", labelKey: "professional.education" },
    { value: "teknoloji", label: "Teknoloji", labelKey: "professional.technology" },
    { value: "diger", label: "Diğer", labelKey: "professional.otherBusiness" },
  ],
} as const;
