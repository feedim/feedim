// Feedim - Platform Sabitleri

// Premium üyelik
export const PREMIUM_MONTHLY_PRICE = 49; // TL
export const PREMIUM_YEARLY_PRICE = 399; // TL

// Jeton ekonomisi
export const COIN_BASE_EARNING = 1;        // Geçerli okuma başına temel Jeton
export const COIN_DAILY_LIMIT = 500;       // Kullanıcı başına günlük max kazanç
export const COIN_POST_LIMIT = 10000;      // Gönderi başına toplam max kazanç
export const COIN_MIN_WITHDRAWAL = 500;    // Minimum çekim miktarı
export const COIN_TO_TRY_RATE = 0.10;     // 1 Jeton = 0.10 TL
export const COIN_COMMISSION_RATE = 0.20;  // %20 Feedim komisyonu

// Okuma kazanç koşulları
export const MIN_READ_DURATION = 30;       // saniye
export const MIN_READ_PERCENTAGE = 40;     // %
export const READ_COOLDOWN_HOURS = 24;     // Aynı okuyucu aynı gönderi

// Hediye tipleri
export const GIFT_TYPES = {
  rose: { name: 'Gul', coins: 1, emoji: '🌹' },
  coffee: { name: 'Kahve', coins: 5, emoji: '☕' },
  heart: { name: 'Kalp', coins: 10, emoji: '❤️' },
  fire: { name: 'Ates', coins: 15, emoji: '🔥' },
  star: { name: 'Yildiz', coins: 25, emoji: '⭐' },
  crown: { name: 'Tac', coins: 50, emoji: '👑' },
  diamond: { name: 'Elmas', coins: 100, emoji: '💎' },
  rocket: { name: 'Roket', coins: 200, emoji: '🚀' },
  unicorn: { name: 'Unicorn', coins: 500, emoji: '🦄' },
  planet: { name: 'Gezegen', coins: 1000, emoji: '🪐' },
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

// Trust level tanımları (0-5)
export const TRUST_LEVELS = {
  0: { name: 'Tehlikeli', minProfile: 0, maxSpam: 100, description: 'Yüksek spam riski' },
  1: { name: 'Yeni', minProfile: 0, maxSpam: 70, description: 'Yeni veya riskli hesap' },
  2: { name: 'Temel', minProfile: 20, maxSpam: 40, description: 'Normal kullanıcı' },
  3: { name: 'Güvenilir', minProfile: 40, maxSpam: 20, description: 'Aktif ve güvenilir' },
  4: { name: 'Yüksek Güven', minProfile: 60, maxSpam: 10, description: 'Doğrulanmış güvenilir' },
  5: { name: 'Elit', minProfile: 80, maxSpam: 5, description: 'En güvenilir kullanıcılar' },
} as const;

// Rate limiting
export const RATE_LIMITS = {
  api: { limit: 60, window: 60_000 },           // 60 req/dakika
  comment_user: { perMinute: 5, perHour: 30, perDay: 100 },
  comment_guest: { perMinute: 2, perHour: 10, perDay: 30 },
  follow: { perMinute: 10, perHour: 60 },
  like: { perMinute: 30, perHour: 300 },
};

// Günlük aksiyon limitleri (plan bazlı) — detay: lib/limits.ts
// follow:  free=20,  basic=40,  pro=100, max=200
// like:    free=50,  basic=100, pro=300, max=1000
// comment: free=30,  basic=60,  pro=200, max=500
// save:    free=30,  basic=60,  pro=200, max=500
// share:   free=20,  basic=40,  pro=100, max=300

// Validasyon kuralları
export const VALIDATION = {
  username: { min: 3, max: 15, pattern: /^(?!.*[._]{2})[A-Za-z0-9](?:[A-Za-z0-9._]{1,13})[A-Za-z0-9]$/ },
  password: { min: 6, max: 128 },
  name: { min: 2, max: 50, pattern: /^[\p{L}\s]+$/u },
  email: { max: 60 },
  phone: { digits: 10 },
  bio: { max: 150 },
  website: { max: 255 },
  birthDate: { minAge: 13, maxAge: 120 },
  gender: ['male', 'female', 'other'] as const,
  postTitle: { min: 3, max: 200 },
  postContent: { minChars: 50, maxWords: 5000, maxWordsMax: 15000, maxListItems: 300 },
  postTags: { max: 5 },
  tagName: { min: 2, max: 50, pattern: /^[a-zA-ZçÇğĞıİöÖşŞüÜ0-9\s\-_.&#+]+$/ },
  imageCaption: { max: 200 },
  mentions: { max: 3 },
  comment: { max: 250, maxPremium: 500, maxLinks: 2 },
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

// Video
export const VIDEO_MAX_DURATION = 600; // 10 dakika (saniye)
export const VIDEO_MAX_SIZE_MB = 50; // MB (Supabase free tier limit)
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/x-m4v', 'video/ogg', 'video/mpeg'] as const;
export const VIDEO_PAGE_SIZE = 12;

// İçerik tipleri
export const CONTENT_TYPES = {
  post: { label: 'Gönderi', icon: '📝' },
  video: { label: 'Video', icon: '🎥' },
} as const;

// Bildirim tipleri
export const NOTIFICATION_TYPES = [
  'like', 'comment', 'reply', 'mention', 'follow',
  'follow_request', 'follow_accepted',
  'first_post', 'comeback_post', 'milestone',
  'coin_earned', 'gift_received', 'premium_expired', 'system',
] as const;

// Paylaşım platformları
export const SHARE_PLATFORMS = [
  { id: 'copy', name: 'Kopyala' },
  { id: 'wa', name: 'WhatsApp' },
  { id: 'tw', name: 'X' },
  { id: 'fb', name: 'Facebook' },
  { id: 'lk', name: 'LinkedIn' },
  { id: 'pin', name: 'Pinterest' },
  { id: 'em', name: 'Email' },
  { id: 'native', name: 'Paylaş' },
] as const;

// Milestone eşikleri
export const MILESTONES = [1000, 10000, 100000, 1000000, 10000000];

// Feed
export const FEED_PAGE_SIZE = 12;
export const COMMENTS_PAGE_SIZE = 10;
export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATION_CLEANUP_DAYS = 90;

// Profesyonel hesap kategorileri
export const PROFESSIONAL_CATEGORIES = {
  creator: [
    { value: "kisisel_blog", label: "Kişisel Blog" },
    { value: "dijital_icerik", label: "Dijital İçerik Üretici" },
    { value: "sanatci", label: "Sanatçı" },
    { value: "muzisyen", label: "Müzisyen" },
    { value: "oyuncu", label: "Oyuncu" },
    { value: "yazar", label: "Yazar" },
    { value: "sporcu", label: "Sporcu" },
    { value: "fotografci", label: "Fotoğrafçı" },
    { value: "diger", label: "Diğer" },
  ],
  business: [
    { value: "yerel_isletme", label: "Yerel İşletme" },
    { value: "marka", label: "Marka" },
    { value: "e_ticaret", label: "E-ticaret" },
    { value: "restoran_kafe", label: "Restoran/Kafe" },
    { value: "saglik_guzellik", label: "Sağlık/Güzellik" },
    { value: "egitim", label: "Eğitim" },
    { value: "teknoloji", label: "Teknoloji" },
    { value: "diger", label: "Diğer" },
  ],
} as const;
