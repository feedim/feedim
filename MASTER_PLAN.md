# FEEDIM - ULTRA MASTER PLAN
# WordPress'ten Next.js + Supabase'e Tam Geçiş Planı
# Medium Benzeri İçerik Platformu

---

## 1. PROJE ÖZETI

**Feedim**, Medium benzeri bir içerik platformudur. Kullanıcılar makale yazar, premium üyeler tarafından okunduğunda coin kazanır. Coinler hediye göndermek veya nakit çekmek için kullanılabilir.

**Teknoloji:** Next.js 16 + React 19 + Supabase + StyleX
**Kaynak:** Forilove altyapısı temizlenip dönüştürülecek + Feedim WordPress tema özellikleri birebir taşınacak

---

## 2. FOİLOVE'DAN TEMİZLENECEKLER

### Tamamen Kaldırılacak
- [ ] Template sistemi (şablon oluşturma, düzenleme, yayınlama)
- [ ] TemplateRenderer, EditorSidebar, useEditor hook
- [ ] Romantik sayfa oluşturma (hediye sayfaları)
- [ ] Template marketplace
- [ ] AI içerik oluşturma (Anthropic Claude API - şablon için)
- [ ] Cloudflare R2 (şablon asset'leri için)
- [ ] PayTR ödeme entegrasyonu (yeni ödeme sistemi kurulacak)
- [ ] Affiliate/referans sistemi (tamamen kaldır)
- [ ] Template lock/unlock mekanizması
- [ ] Palette sistemi
- [ ] Hook sistemi (data-editable, data-locked vb.)

### Korunacak ve Dönüştürülecek
- [x] Supabase altyapısı (veritabanı bağlantısı)
- [x] Auth sistemi (login/register/OAuth - yeni kurallara göre)
- [x] Coin bakiye sistemi (yeni ekonomi modeli ile)
- [x] "Arkadaşlarınla paylaş" coin komisyon özelliği
- [x] Rate limiting altyapısı
- [x] Middleware yapısı
- [x] Next.js routing yapısı

---

## 3. VERİTABANI ŞEMASI (SUPABASE SQL)

### 3.1 Kullanıcı Tabloları

```sql
-- Kullanıcı profilleri (Supabase auth.users'ı genişletir)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  avatar_sizes JSONB DEFAULT '{}', -- {75, 150, 300, 1080}
  bio TEXT DEFAULT '' CHECK (char_length(bio) <= 150),
  website TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone_number TEXT,
  country_code TEXT DEFAULT '+90',

  -- Hesap durumu
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted', 'moderation', 'frozen', 'blocked')),
  status_updated_at TIMESTAMPTZ,
  pending_delete BOOLEAN DEFAULT FALSE,
  pending_delete_at TIMESTAMPTZ,
  freeze_warning_shown BOOLEAN DEFAULT FALSE,

  -- Doğrulama
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  google_connected BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE, -- mavi tik

  -- Premium
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,

  -- Hesap ayarları
  account_private BOOLEAN DEFAULT FALSE,
  theme_mode TEXT DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'dim', 'system')),
  language TEXT DEFAULT 'tr',

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,

  -- Kısıtlamalar
  username_last_changed TIMESTAMPTZ,
  name_changes_count INTEGER DEFAULT 0,
  name_changes_reset_at TIMESTAMPTZ,

  -- Skor & Algoritma
  profile_score REAL DEFAULT 0, -- Genel profil kalite puanı
  spam_score REAL DEFAULT 0,    -- Spam risk puanı (0-100)
  trust_level INTEGER DEFAULT 0, -- 0: yeni, 1: güvenilir, 2: onaylı, 3: premium

  -- Coin
  coin_balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,

  -- İstatistik
  post_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_views_received BIGINT DEFAULT 0,

  -- Zaman
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profil puan güncelleme fonksiyonu
-- Profil puanı = avatar(+30) + bio(+15) + email_verified(+10) +
--   follower_log(+20max) + post_count(+15max) + premium(+10) - spam_score
CREATE OR REPLACE FUNCTION update_profile_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_score := 0
    + CASE WHEN NEW.avatar_url IS NOT NULL THEN 30 ELSE 0 END
    + CASE WHEN char_length(COALESCE(NEW.bio, '')) > 10 THEN 15 ELSE 0 END
    + CASE WHEN NEW.email_verified THEN 10 ELSE 0 END
    + CASE WHEN NEW.phone_verified THEN 5 ELSE 0 END
    + CASE WHEN NEW.is_verified THEN 20 ELSE 0 END
    + CASE WHEN NEW.is_premium THEN 10 ELSE 0 END
    + LEAST(log(GREATEST(NEW.follower_count, 1) + 1) * 8, 20)
    + LEAST(NEW.post_count * 3, 15)
    + CASE WHEN NEW.website IS NOT NULL THEN 5 ELSE 0 END
    - COALESCE(NEW.spam_score, 0) * 0.5;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_score
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_profile_score();
```

### 3.2 Takip Sistemi

```sql
CREATE TABLE public.follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, followed_id)
);

CREATE TABLE public.follow_requests (
  id BIGSERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, requested_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followed ON follows(followed_id);
CREATE INDEX idx_follow_requests_requested ON follow_requests(requested_id);
```

### 3.3 Engelleme Sistemi

```sql
CREATE TABLE public.blocks (
  id BIGSERIAL PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
```

### 3.4 Makale/İçerik Sistemi

```sql
CREATE TABLE public.posts (
  id BIGSERIAL PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- İçerik
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT, -- Otomatik veya manuel özet
  featured_image TEXT,

  -- Kategorizasyon
  content_type TEXT DEFAULT 'post' CHECK (content_type IN ('post', 'video', 'gallery', 'news', 'list')),
  language TEXT DEFAULT 'tr',
  reading_time INTEGER DEFAULT 0, -- dakika
  word_count INTEGER DEFAULT 0,

  -- Durum
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'moderation', 'removed', 'archived')),
  published_at TIMESTAMPTZ,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  slug_hash TEXT, -- 12 char MD5 hash eklenir

  -- İstatistik
  view_count BIGINT DEFAULT 0,
  unique_view_count BIGINT DEFAULT 0,
  premium_view_count BIGINT DEFAULT 0, -- Premium üyelerden gelen görüntüleme
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- Algoritma
  quality_score REAL DEFAULT 0,    -- İçerik kalite puanı
  trending_score REAL DEFAULT 0,   -- Trend puanı (zamana bağlı azalır)
  spam_score REAL DEFAULT 0,       -- Spam risk puanı

  -- Kazanç
  total_coins_earned INTEGER DEFAULT 0,

  -- Kaynak
  source_links JSONB DEFAULT '[]',

  -- Zaman
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published ON posts(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_posts_trending ON posts(trending_score DESC) WHERE status = 'published';
CREATE INDEX idx_posts_slug ON posts(slug);

-- Etiketler
CREATE TABLE public.tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-Tag ilişkisi
CREATE TABLE public.post_tags (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Kategoriler
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id INTEGER REFERENCES categories(id),
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-Category ilişkisi
CREATE TABLE public.post_categories (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- Etiket takibi
CREATE TABLE public.tag_follows (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tag_id)
);
```

### 3.5 Etkileşim Tabloları

```sql
-- Beğeniler
CREATE TABLE public.likes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Kaydetme / Bookmark
CREATE TABLE public.bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Paylaşımlar
CREATE TABLE public.shares (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- fb, tw, wa, lk, pin, em, copy, native
  visitor_id TEXT, -- Giriş yapmamış kullanıcılar için
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
```

### 3.6 Yorum Sistemi

```sql
CREATE TABLE public.comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,

  -- İçerik
  content TEXT NOT NULL CHECK (char_length(content) <= 250),
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'gif')),
  gif_url TEXT, -- gif:: prefix'li URL

  -- Ziyaretçi yorum (giriş yapmadan)
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_id TEXT, -- cookie-based

  -- Durum
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'spam', 'removed')),

  -- İstatistik
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,

  -- Moderasyon
  spam_score REAL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yorum beğenileri
CREATE TABLE public.comment_likes (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

### 3.7 Bildirim Sistemi

```sql
CREATE TABLE public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN (
    'like', 'comment', 'reply', 'mention', 'follow',
    'follow_request', 'follow_accepted',
    'first_post', 'comeback_post', 'milestone',
    'coin_earned', 'gift_received', 'premium_expired',
    'system'
  )),

  object_id BIGINT, -- post_id veya comment_id
  object_type TEXT, -- 'post', 'comment', 'user'
  content TEXT,

  is_read BOOLEAN DEFAULT FALSE,
  is_seen BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_actor ON notifications(actor_id);
```

### 3.8 Görüntüleme & Kazanç Sistemi (MEDIUM MODELİ)

```sql
-- Makale görüntülemeleri (kazanç hesaplama için detaylı)
CREATE TABLE public.post_views (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  visitor_id TEXT, -- Giriş yapmamış ziyaretçiler

  -- Okuma metrikleri
  read_percentage INTEGER DEFAULT 0, -- 0-100 ne kadar okudu
  read_duration INTEGER DEFAULT 0,   -- saniye
  is_qualified_read BOOLEAN DEFAULT FALSE, -- Kazanç için geçerli okuma mı?

  -- Viewer bilgileri
  is_premium_viewer BOOLEAN DEFAULT FALSE,

  -- Kazanç
  coins_earned INTEGER DEFAULT 0,

  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_post_views_post ON post_views(post_id);
CREATE INDEX idx_post_views_viewer ON post_views(viewer_id);
CREATE INDEX idx_post_views_qualified ON post_views(is_qualified_read) WHERE is_qualified_read = TRUE;

-- Coin işlemleri
CREATE TABLE public.coin_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'read_earning',      -- Makale okunmasından kazanç
    'gift_sent',         -- Hediye gönderme
    'gift_received',     -- Hediye alma
    'tip_sent',          -- Bahşiş gönderme
    'tip_received',      -- Bahşiş alma
    'referral_bonus',    -- Arkadaş paylaşım bonusu
    'premium_purchase',  -- Premium satın alma
    'withdrawal',        -- Nakit çekme
    'deposit',           -- Bakiye yükleme
    'system_bonus',      -- Sistem bonusu
    'refund'             -- İade
  )),

  amount INTEGER NOT NULL, -- Pozitif: gelen, Negatif: giden
  balance_after INTEGER NOT NULL,

  -- İlişkili veriler
  related_post_id BIGINT REFERENCES posts(id),
  related_user_id UUID REFERENCES profiles(id),
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id, created_at DESC);

-- Premium üyelik
CREATE TABLE public.premium_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  payment_method TEXT,
  amount_paid INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hediye sistemi
CREATE TABLE public.gifts (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES posts(id), -- Hangi makaleye hediye
  gift_type TEXT NOT NULL, -- 'coffee', 'heart', 'star', 'diamond' vb.
  coin_amount INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.9 Raporlama & Moderasyon

```sql
CREATE TABLE public.reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  content_id BIGINT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment', 'user')),
  content_author_id UUID REFERENCES profiles(id),

  reason TEXT NOT NULL,
  description TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_id UUID REFERENCES profiles(id),
  moderator_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  UNIQUE(reporter_id, content_id, content_type)
);
```

### 3.10 Oturum & Güvenlik

```sql
CREATE TABLE public.sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_trusted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE public.security_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- login_success, login_failed, password_reset, captcha_failed, waf_block
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profil ziyaretleri
CREATE TABLE public.profile_visits (
  id BIGSERIAL PRIMARY KEY,
  visited_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profile_visits_visited ON profile_visits(visited_id, created_at DESC);
```

### 3.11 Bildirim Ayarları

```sql
CREATE TABLE public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  like_enabled BOOLEAN DEFAULT TRUE,
  comment_enabled BOOLEAN DEFAULT TRUE,
  reply_enabled BOOLEAN DEFAULT TRUE,
  mention_enabled BOOLEAN DEFAULT TRUE,
  follow_enabled BOOLEAN DEFAULT TRUE,
  first_post_enabled BOOLEAN DEFAULT TRUE,
  milestone_enabled BOOLEAN DEFAULT TRUE,
  coin_earned_enabled BOOLEAN DEFAULT TRUE,
  gift_received_enabled BOOLEAN DEFAULT TRUE,
  paused_until TIMESTAMPTZ
);
```

### 3.12 Analytics

```sql
CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  visitor_id TEXT,
  event_type TEXT NOT NULL, -- pageview, click, scroll, session_start, session_end
  page_url TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, created_at DESC);
```

---

## 4. ALGORİTMA MİMARİSİ

### 4.1 Profil Puanlama Algoritması (Merkezi)

Her kullanıcı için tek bir `profile_score` ve `spam_score` hesaplanır. Bu puanlar TÜM sistemde kullanılır.

```
PROFILE_SCORE hesaplama:
+ Avatar var: +30
+ Bio > 10 karakter: +15
+ Email doğrulanmış: +10
+ Telefon doğrulanmış: +5
+ Mavi tik (verified): +20
+ Premium üye: +10
+ Website var: +5
+ Takipçi sayısı: log10(followers+1) * 8 (max 20)
+ Gönderi sayısı: post_count * 3 (max 15)
- Spam puanı: spam_score * 0.5

SPAM_SCORE hesaplama (0-100):
+ Rapor edilme sayısı * 5
+ Spam içerik oranı * 20
+ Kısa sürede çok takip/takipten çıkma: +15
+ Bot benzeri davranış (çok hızlı etkileşim): +20
+ İsim kalitesi düşük (gibberish detection): +10
+ Hesap yaşı < 7 gün: +5
- Onaylı etkileşimler: -2 per
- Premium üyelik: -15
- Verified: -20
```

### 4.2 Ana Sayfa Feed Algoritması

```
feed_score = (
  quality_score * 0.3          -- İçerik kalitesi
  + trending_score * 0.25      -- Trend puanı
  + relevance_score * 0.25     -- Kullanıcıya uygunluk
  + freshness_score * 0.2      -- Yenilik
)

quality_score:
  + read_completion_rate * 30  -- Okuma tamamlama oranı
  + like_ratio * 20            -- Beğeni/görüntüleme oranı
  + comment_ratio * 15         -- Yorum/görüntüleme oranı
  + save_ratio * 15            -- Kaydetme oranı
  + share_ratio * 10           -- Paylaşım oranı
  + author.profile_score * 0.1 -- Yazar profil puanı

trending_score:
  = (etkileşim_son_24s * 10 + etkileşim_son_7g * 3) / yaş_saat

relevance_score:
  + Takip ettiğin yazardan: +40
  + Takip ettiğin etiketten: +30
  + Beğendiğin kategoriden: +20
  + Dil tercihi eşleşmesi: +10

freshness_score:
  = max(0, 100 - (yaş_saat * 2))  -- 50 saat sonra 0

FİLTRELER (kesinlikle gösterilmez):
  - Engellediğin kullanıcıların içerikleri
  - Seni engelleyen kullanıcıların içerikleri
  - status != 'published' olanlar
  - spam_score > 60 olan yazarların içerikleri
  - Private hesapların içerikleri (takip etmiyorsan)
  - Moderasyondaki/kaldırılan içerikler
```

### 4.3 Keşfet/Arama Algoritması

```
ARAMA NİYET TESPİTİ:
  - @ ile başlarsa: kullanıcı araması
  - > 3 kelime veya > 20 karakter: makale araması
  - <= 2 kelime ve <= 15 karakter: karma arama

KULLANICI ARAMA PUANLAMA:
  + Tam username eşleşme: +200
  + Username başlangıç: +100
  + Username içerme: +50
  + Tam display_name: +150
  + Display name başlangıç: +80
  + Display name içerme: +40
  + İçerik eşleşmesi: +300 (başlık +600, içerik +200, etiket +400)
  + Verified: +500
  + Avatar var: +300 (yoksa -200)
  + Bio > 10 char: +150
  + Takip ediyorsun: +600
  + Seni takip ediyor: +250
  - Spam puanı: -spam_score * 5
  - Skor < -100 filtrelenir

MAKALE ARAMA PUANLAMA:
  + Başlık eşleşme: *20
  + İçerik eşleşme: *10
  + Etiket eşleşme: *15
  + Yazar puanı: *5
  - Erişilemeyen yazarlar filtrelenir
```

### 4.4 Coin Kazanç Algoritması (MEDIUM MODELİ)

```
KAZANÇ KOŞULLARI:
  1. Yazar aktif ve hesabı iyi durumda olmalı
  2. Okuyucu PREMIUM üye olmalı (ZORUNLU)
  3. Okuyucu gerçek kişi olmalı (bot olmayan)
  4. Okuma süresi minimum 30 saniye
  5. Okuma oranı minimum %40
  6. Aynı okuyucu aynı makaleye 24 saatte 1 kez kazanç üretir
  7. Yazar kendi makalesinden kazanç elde edemez

KAZANÇ HESAPLAMA:
  base_coins = 1  -- Her geçerli okumada 1 coin base

  quality_multiplier:
    + Okuma oranı 40-60%: 1.0x
    + Okuma oranı 60-80%: 1.5x
    + Okuma oranı 80-100%: 2.0x

  engagement_bonus:
    + Okuyucu beğendiyse: +0.5 coin
    + Okuyucu yorum yaptıysa: +1.0 coin
    + Okuyucu kaydettiyse: +0.5 coin
    + Okuyucu paylaştıysa: +1.0 coin

  author_bonus:
    + Yazar verified ise: 1.2x çarpan
    + Yazar trust_level >= 2: 1.1x çarpan

  final_coins = floor(base_coins * quality_multiplier + engagement_bonus) * author_bonus

  -- Günlük limit: Yazar başına max 500 coin/gün
  -- Makale başına limit: max 10000 coin toplam

BOT TESPİTİ:
  - Okuma süresi / kelime sayısı oranı çok düşük: bot
  - Aynı IP'den çok fazla okuma: bot
  - Mouse/scroll hareketi yok: bot
  - Sayfa focus kaybı çok yüksek: bot
  - Spam score > 50: kazanç üretmez
```

### 4.5 Spam Tespit Algoritması

```
İÇERİK SPAM TESPİTİ:
  + Çok fazla link (>5): +20
  + Tekrarlayan kelimeler: +15
  + Tüm büyük harf: +10
  + Bilinen spam pattern'leri: +30
  + Çok kısa içerik (<100 kelime): +5
  + Clickbait başlık tespiti: +15

KULLANICI SPAM TESPİTİ:
  + Kısa sürede çok gönderi: +20
  + Kısa sürede çok takip/takipten çıkma: +15
  + Rapor edilme sayısı: +5 per rapor
  + Aynı yorumu tekrarlama: +10
  + Bot benzeri zamanlama: +25

OTOMATIK AKSIYON:
  spam_score > 30: İçerik moderasyon kuyruğuna
  spam_score > 50: Kazanç durdurulur
  spam_score > 70: Hesap otomatik moderasyon
  spam_score > 90: Hesap otomatik engel
```

---

## 5. PROJE YAPISI (NEXT.JS)

```
/feedim
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── password-reset/page.tsx
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── page.tsx                    -- Ana sayfa (Feed)
│   │   ├── explore/page.tsx            -- Keşfet
│   │   ├── search/page.tsx             -- Arama sonuçları
│   │   ├── followed/page.tsx           -- Takip ettiklerin
│   │   ├── bookmarks/page.tsx          -- Kaydedilenler
│   │   ├── suggestions/page.tsx        -- Önerilen kullanıcılar
│   │   ├── notifications/page.tsx      -- Bildirimler
│   │   ├── create/page.tsx             -- Makale oluştur
│   │   ├── [slug]/page.tsx             -- Tekil makale
│   │   ├── profile/
│   │   │   └── [username]/page.tsx     -- Kullanıcı profili
│   │   ├── settings/
│   │   │   ├── page.tsx                -- Ayarlar ana sayfa
│   │   │   ├── account/page.tsx
│   │   │   ├── edit-profile/page.tsx
│   │   │   ├── security/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   ├── blocked/page.tsx
│   │   │   ├── connected/page.tsx
│   │   │   ├── premium/page.tsx
│   │   │   ├── earnings/page.tsx       -- Kazanç istatistikleri
│   │   │   ├── wallet/page.tsx         -- Cüzdan / Coin
│   │   │   └── deactivate/page.tsx
│   │   ├── tag/[slug]/page.tsx         -- Etiket sayfası
│   │   ├── category/[slug]/page.tsx    -- Kategori sayfası
│   │   └── layout.tsx
│   ├── onboarding/
│   │   └── page.tsx                    -- Onboarding akışı
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── users/page.tsx
│   │   ├── posts/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── google/route.ts
│   │   │   ├── password-reset/route.ts
│   │   │   ├── verify-email/route.ts
│   │   │   └── verify-phone/route.ts
│   │   ├── users/
│   │   │   ├── [id]/route.ts
│   │   │   ├── profile/route.ts
│   │   │   ├── avatar/route.ts
│   │   │   ├── follow/route.ts
│   │   │   ├── block/route.ts
│   │   │   ├── search/route.ts
│   │   │   └── suggestions/route.ts
│   │   ├── posts/
│   │   │   ├── route.ts               -- Create/list posts
│   │   │   ├── [id]/route.ts          -- Get/update/delete post
│   │   │   ├── [id]/like/route.ts
│   │   │   ├── [id]/bookmark/route.ts
│   │   │   ├── [id]/share/route.ts
│   │   │   ├── [id]/view/route.ts     -- Görüntüleme kayıt + kazanç
│   │   │   ├── feed/route.ts          -- Ana sayfa feed
│   │   │   ├── explore/route.ts       -- Keşfet
│   │   │   ├── followed/route.ts      -- Takip feed
│   │   │   └── search/route.ts
│   │   ├── comments/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── [id]/like/route.ts
│   │   │   └── gif/route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts
│   │   │   ├── read/route.ts
│   │   │   └── settings/route.ts
│   │   ├── coins/
│   │   │   ├── balance/route.ts
│   │   │   ├── transactions/route.ts
│   │   │   ├── gift/route.ts
│   │   │   ├── tip/route.ts
│   │   │   └── withdraw/route.ts
│   │   ├── premium/
│   │   │   ├── subscribe/route.ts
│   │   │   └── status/route.ts
│   │   ├── tags/
│   │   │   ├── route.ts
│   │   │   └── follow/route.ts
│   │   ├── reports/route.ts
│   │   ├── analytics/route.ts
│   │   └── upload/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── Alert.tsx                   -- alert.js birebir port
│   │   ├── Modal.tsx                   -- modal.js birebir port
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── LoadMore.tsx
│   │   └── TextClamp.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── HeaderLeft.tsx
│   │   ├── HeaderCenter.tsx
│   │   ├── HeaderRight.tsx
│   │   ├── Navigation.tsx
│   │   ├── MobileNav.tsx
│   │   ├── MobileBottomNav.tsx
│   │   ├── SideMenu.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── cards/
│   │   ├── PrimaryPost.tsx
│   │   ├── GreederPost.tsx
│   │   ├── PostHead.tsx
│   │   ├── PostThumbnail.tsx
│   │   ├── PostFooter.tsx
│   │   └── UserItem.tsx
│   ├── modals/
│   │   ├── FollowersModal.tsx
│   │   ├── FollowingModal.tsx
│   │   ├── LikesModal.tsx
│   │   ├── CommentsModal.tsx
│   │   ├── ShareModal.tsx
│   │   ├── ReportModal.tsx
│   │   ├── PostMoreModal.tsx
│   │   ├── AvatarModal.tsx
│   │   ├── AvatarCropModal.tsx
│   │   ├── AvatarViewModal.tsx
│   │   ├── DarkModeModal.tsx
│   │   ├── CreateSelectModal.tsx
│   │   ├── ProfileSettingsModal.tsx
│   │   ├── FollowRequestsModal.tsx
│   │   ├── MutualFollowersModal.tsx
│   │   ├── ProfileVisitorsModal.tsx
│   │   ├── GiftModal.tsx               -- YENİ: Hediye gönderme
│   │   └── ImageShowcaseModal.tsx
│   ├── post/
│   │   ├── PostNavBar.tsx              -- Like/Comment/Save/More butonları
│   │   ├── LikedBy.tsx
│   │   ├── RelatedPosts.tsx
│   │   ├── PostSources.tsx
│   │   └── PostEditor.tsx              -- Makale editörü
│   ├── comments/
│   │   ├── CommentList.tsx
│   │   ├── CommentForm.tsx
│   │   ├── CommentItem.tsx
│   │   ├── EmojiPicker.tsx
│   │   └── GifPicker.tsx
│   ├── profile/
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStats.tsx
│   │   ├── ProfileActions.tsx
│   │   ├── ProfilePosts.tsx
│   │   └── ProfileNotAccessible.tsx
│   ├── onboarding/
│   │   ├── StepWelcome.tsx
│   │   ├── StepProfilePhoto.tsx
│   │   ├── StepBiography.tsx
│   │   ├── StepBirthDate.tsx
│   │   ├── StepGender.tsx
│   │   ├── StepEmailVerify.tsx
│   │   ├── StepSuggestions.tsx
│   │   └── OnboardingProgress.tsx
│   ├── earnings/
│   │   ├── EarningsChart.tsx           -- YENİ
│   │   ├── CoinBalance.tsx             -- YENİ
│   │   └── TransactionHistory.tsx      -- YENİ
│   ├── feed/
│   │   ├── FeedTabs.tsx                -- For You / Followed / Bookmarks / Tags
│   │   └── FeedList.tsx
│   ├── search/
│   │   ├── SearchForm.tsx
│   │   ├── SearchResults.tsx
│   │   └── UserSearchResults.tsx
│   ├── notification/
│   │   ├── NotificationItem.tsx
│   │   └── NotificationList.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── PasswordResetForm.tsx
│   │   └── GoogleOAuthButton.tsx
│   └── gdpr/
│       └── GdprBanner.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useUser.ts
│   ├── useModal.ts                     -- Modal stack management
│   ├── useAlert.ts                     -- Alert/toast system
│   ├── useFollow.ts
│   ├── useBlock.ts
│   ├── useLike.ts
│   ├── useBookmark.ts
│   ├── useShare.ts
│   ├── useComments.ts
│   ├── useNotifications.ts
│   ├── useFeed.ts
│   ├── useSearch.ts
│   ├── useInfiniteScroll.ts
│   ├── useViewTracker.ts              -- IntersectionObserver ile
│   ├── useTheme.ts                    -- Dark/Light/Dim/System
│   ├── useTextClamp.ts
│   ├── useTooltip.ts
│   ├── useTextareaAutoResize.ts
│   ├── useCoins.ts
│   └── useOnboarding.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  -- Browser client
│   │   ├── server.ts                  -- Server client
│   │   ├── admin.ts                   -- Service role client
│   │   └── middleware.ts
│   ├── utils/
│   │   ├── format-number.ts           -- 1B, 1M, 1K formatı
│   │   ├── time-diff.ts              -- Göreceli zaman
│   │   ├── encrypt-id.ts             -- ID şifreleme
│   │   ├── slug.ts                   -- Slug oluşturma + hash
│   │   ├── validation.ts             -- Input doğrulama kuralları
│   │   ├── sanitize.ts               -- XSS/injection temizleme
│   │   ├── reading-time.ts           -- Okuma süresi hesaplama
│   │   └── normalize-ascii.ts        -- Türkçe karakter normalize
│   ├── algorithms/
│   │   ├── feed.ts                    -- Feed algoritması
│   │   ├── search.ts                  -- Arama algoritması
│   │   ├── profile-score.ts           -- Profil puanlama
│   │   ├── spam-detection.ts          -- Spam tespiti
│   │   ├── trending.ts               -- Trend hesaplama
│   │   ├── coin-earning.ts            -- Kazanç hesaplama
│   │   └── bot-detection.ts           -- Bot tespiti
│   ├── security/
│   │   ├── rate-limiter.ts
│   │   ├── captcha.ts
│   │   ├── waf.ts
│   │   ├── input-validator.ts
│   │   └── headers.ts
│   ├── email/
│   │   ├── send.ts                    -- Email gönderme (Resend/SendGrid)
│   │   └── templates.ts              -- Email şablonları
│   ├── seo/
│   │   ├── meta-tags.ts
│   │   ├── json-ld.ts
│   │   └── sitemap.ts
│   ├── i18n/
│   │   └── strings.ts                -- Tüm çeviri stringleri
│   └── constants.ts
├── styles/
│   ├── stylex/                        -- WordPress'ten birebir alınan StyleX
│   │   ├── base.stylex.ts
│   │   ├── typography.stylex.ts
│   │   ├── post.stylex.ts
│   │   ├── comment.stylex.ts
│   │   ├── avatar.stylex.ts
│   │   ├── gallery.stylex.ts
│   │   ├── modal.stylex.ts
│   │   ├── alert.stylex.ts
│   │   ├── skeleton.stylex.ts
│   │   └── global.stylex.ts
│   ├── base.css                       -- WordPress'ten alınan base CSS
│   ├── typography.css                 -- Birebir font/type sistemi
│   ├── dark.css                       -- Dark/Dim/System modları
│   ├── animations.css                 -- Tüm animasyonlar
│   └── responsive.css                 -- Responsive breakpoints
├── middleware.ts                       -- Auth + routing middleware
├── next.config.ts
├── package.json
├── tsconfig.json
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql     -- Tüm SQL burada
```

---

## 6. UYGULAMA FAZLARI (SIRALAMA)

### FAZ 1: Temel Altyapı (İskelet)
**Öncelik: KRİTİK | Forilove temizliği + temel kurulum**

1. Forilove'daki gereksiz dosyaları temizle:
   - Template sistemi (TemplateRenderer, EditorSidebar, useEditor, template API'leri)
   - Marketplace
   - AI sistemi (Anthropic)
   - Cloudflare R2
   - PayTR
   - Affiliate sistemi
   - Palette/Hook sistemi
   - Template lock/unlock

2. Supabase SQL şemasını oluştur (yukarıdaki tüm tablolar)

3. Temel layout yapısını kur:
   - Header (HeaderLeft + HeaderCenter + HeaderRight) birebir
   - Mobile Navigation birebir
   - Mobile Bottom Nav birebir
   - Side Menu birebir
   - Footer birebir
   - Responsive breakpoints birebir

4. CSS/StyleX altyapısı:
   - base.css WordPress'ten al
   - typography.css WordPress'ten al
   - dark.css WordPress'ten al
   - animations.css WordPress'ten al
   - responsive.css WordPress'ten al
   - StyleX dosyalarını port et

5. Alert sistemi (alert.js → Alert.tsx + useAlert.ts) birebir
6. Modal sistemi (modal.js → Modal.tsx + useModal.ts) birebir
7. Skeleton loading sistemi birebir
8. Tooltip sistemi birebir

### FAZ 2: Kimlik Doğrulama
**Öncelik: KRİTİK**

1. Login sayfası (email/username + password)
   - Tüm validasyonlar: alan kontrolü, email domain whitelist, form timing
   - Hesap durumu kontrolleri (disabled, deleted, moderation, frozen)
   - Freeze reactivation logic (2-adım)
   - CAPTCHA entegrasyonu
   - Güvenlik loglama

2. Register sayfası
   - İsim validasyonu (Türkçe karakter desteği, gibberish detection)
   - Username validasyonu (pattern, uzunluk, benzersizlik)
   - Username öneri algoritması
   - Email validasyonu (domain whitelist, anti-spam)
   - Password validasyonu
   - Terms onayı
   - CAPTCHA

3. Google OAuth
4. Şifre sıfırlama (6 haneli kod, 15dk geçerlilik)
5. Middleware (auth kontrol, yönlendirmeler)

### FAZ 3: Profil Sistemi
**Öncelik: YÜKSEK**

1. Profil sayfası (/profile/[username])
   - Avatar, isim, username, bio, website
   - Post/Follower/Following sayıları
   - Mutual followers gösterimi
   - Kendi profil vs başka profil aksiyonları
   - Profile visit tracking

2. Profil düzenleme
   - Tüm alanlar: isim, username (30 gün sınırı), bio, website, doğum tarihi, telefon, cinsiyet
   - Email/telefon doğrulama akışı
   - Validasyonlar birebir

3. Avatar sistemi
   - Upload (max 10MB, tip kontrolü)
   - Crop modal (zoom slider)
   - Çoklu boyut üretimi (75, 150, 300, 1080)
   - EXIF strip
   - HEIC/AVIF dönüşüm

4. Onboarding akışı (7 adım birebir)

### FAZ 4: İçerik/Makale Sistemi
**Öncelik: YÜKSEK**

1. Makale oluşturma editörü
   - Başlık (max 200 karakter)
   - Rich text editör (heading, image, link, bold, italic)
   - Taslak kaydetme
   - Yayınlama
   - Etiket ve kategori seçimi
   - Öne çıkan görsel

2. Tekil makale sayfası (/[slug])
   - Yazar bilgisi
   - İçerik gösterimi
   - Okuma süresi
   - Kaynak linkler
   - Post NavBar (like/comment/save/more)
   - LikedBy bölümü
   - İlgili makaleler

3. Kategori ve etiket sayfaları
4. Etiket takip sistemi (max 15)
5. SEO: meta tags, JSON-LD, canonical URL'ler

### FAZ 5: Sosyal Etkileşim
**Öncelik: YÜKSEK**

1. Takip sistemi
   - Follow/unfollow
   - Follow request (private hesaplar)
   - Request accept/reject
   - Followers/Following listesi (modal)
   - Mutual followers (modal)

2. Engelleme sistemi
   - Block/unblock
   - Blocked users listesi
   - Engellenen kişi gönderi göremez (Instagram gibi)
   - Karşılıklı engel kontrolü

3. Beğeni sistemi
   - Optimistic UI (anında güncelle, hata durumunda geri al)
   - Like count formatı (K, M, B)
   - Liked-by gösterimi
   - Likes modal

4. Bookmark/kaydetme sistemi
5. Paylaşım sistemi (FB, Twitter, WhatsApp, LinkedIn, Pinterest, Email, Copy, Native)
6. Raporlama sistemi

### FAZ 6: Yorum Sistemi
**Öncelik: YÜKSEK**

1. Yorum yazma (max 250 karakter)
   - Giriş yapmış kullanıcılar
   - Ziyaretçi yorumları (isim + email)
   - GIF desteği (Tenor API)
   - Emoji picker (8 kategori)
   - Yanıtlama (reply)

2. Yorum listeleme
   - Sayfalama (10 per page)
   - Sıralama: akıllı, yeni, popüler
   - Engellenen kullanıcılar filtrelenir

3. Yorum moderasyonu
   - Rate limiting (rol bazlı)
   - Spam tespiti
   - Duplicate kontrolü (60sn)
   - Pending yorum sistemi

4. Yorum beğenisi

### FAZ 7: Bildirim Sistemi
**Öncelik: YÜKSEK**

1. Bildirim tipleri (tümü):
   - like, comment, reply, mention, follow, follow_request, follow_accepted
   - first_post, comeback_post, milestone
   - coin_earned, gift_received, premium_expired, system

2. Bildirim sayfası
   - Sonsuz kaydırma
   - Okundu/görüldü işaretleme
   - Tümünü okundu yap
   - Follow request bölümü (private hesaplar)

3. Bildirim badge (header'da)
4. Bildirim ayarları (tip bazlı açma/kapama, 24s duraklatma)
5. Duplicate prevention (aynı bildirim 24 saatte 1)
6. 90 gün sonra otomatik temizlik

### FAZ 8: Feed & Algoritma
**Öncelik: YÜKSEK**

1. Ana sayfa feed algoritması (bölüm 4.2'deki formül)
2. Keşfet sayfası (trending + kategorize)
3. Arama (bölüm 4.3'teki niyet tespiti + puanlama)
4. Takip ettiklerin feed'i
5. Kaydedilenler feed'i
6. İlgili makaleler algoritması
7. Feed tab'ları: For You / Followed / Bookmarks / Takip edilen etiketler (max 15)
8. Profil puanlama sistemi (bölüm 4.1)
9. Spam tespit sistemi (bölüm 4.5)
10. Trending hesaplama

### FAZ 9: Para Kazanma & Coin Sistemi (MEDIUM MODELİ)
**Öncelik: YÜKSEK**

1. Premium üyelik sistemi
   - Aylık/Yıllık planlar
   - Ödeme entegrasyonu
   - Premium badge gösterimi

2. Makale okuma kazanç sistemi (bölüm 4.4)
   - Qualified read detection
   - Bot detection
   - Coin hesaplama algoritması
   - Günlük/makale limitleri

3. Coin cüzdanı
   - Bakiye görüntüleme
   - İşlem geçmişi
   - Kazanç istatistikleri (grafik)

4. Hediye/bahşiş sistemi
   - Makaleye hediye gönder (coffee, heart, star, diamond)
   - Kullanıcıya tip gönder
   - Hediye animasyonları

5. Arkadaşlarla paylaş coin komisyonu (korunan Forilove özelliği)

6. Nakit çekme sistemi
   - Minimum çekim limiti
   - Banka/havale bilgileri
   - Çekim onay süreci

### FAZ 10: Güvenlik & Performans
**Öncelik: KRİTİK**

1. WAF (Web Application Firewall) - XSS, SQLi, LFI pattern'leri
2. Input validation & sanitization (global)
3. Rate limiting (rol bazlı, endpoint bazlı)
4. CAPTCHA (slider puzzle)
5. Güvenlik headerları (CSP, HSTS, X-Frame, vb.)
6. ID şifreleme (data attribute'larda)
7. Dosya upload güvenliği (tip kontrolü, malicious content scan, boyut limit)
8. Session yönetimi (güvenilir cihazlar, oturum sonlandırma)
9. Güvenlik event loglama

### FAZ 11: Dark Mode & Tema
**Öncelik: ORTA**

1. 4 mod: Light, Dark, Dim, System
2. CSS değişkenleri birebir WordPress'ten
3. localStorage + user meta senkronizasyonu
4. Anlık geçiş (sayfa yenilemesi gerekmez)
5. System modu: OS tercihini dinle

### FAZ 12: Admin Panel
**Öncelik: DÜŞÜK (son)**

1. Dashboard (özet istatistikler)
2. Kullanıcı yönetimi (durum değiştirme, verified badge)
3. İçerik moderasyonu (raporlar, otomatik moderasyon)
4. Analitik (ziyaretçi, sayfa görüntüleme, cihaz)
5. Ayarlar

---

## 7. BİREBİR ALINACAK KRİTİK SİSTEMLER

### 7.1 Alert Sistemi (alert.js → React)
WordPress'teki alert.js birebir port edilecek:
- `feedimAlert(type, message, options)` API'si
- Overlay (z-index 2147483646) + Alert (z-index 2147483647)
- Animasyonlar: slideIn (0.35s) / slideOut (0.3s)
- Backdrop filter: blur(65px) brightness(2)
- Border radius: 27px
- Stack management (Set of activeAlerts)
- Keyboard: Enter = confirm, Escape = cancel
- Touch: swipe down to dismiss
- Prompt mode (text input)
- Yes/No/Close button variants

### 7.2 Modal Sistemi (modal.js → React)
- Stack-based z-index yönetimi (1000+ başlangıç)
- Drag-to-close (30px min, 50% threshold, 950px/s velocity)
- Scroll locking (body.openfm class)
- Backdrop opacity drag ile değişir (0.3 → 0)
- 3 animasyon tipi: slideInBottom, slideInRight, scale
- Transition: 0.2s ease-out
- Modal tipleri: type1 (full), type2 (side), type3 (content)
- forceModalCleanup() for edge cases

### 7.3 Skeleton Loading
- `.skhol` (hide real content) + `.skwrp` (show skeleton)
- AJAX-only trigger
- 320ms auto-cleanup
- Skeleton varyantları: post, user, comment, notification

### 7.4 CSS Değişken Sistemi
```css
/* Light Mode */
--bg-primary: #ffffff
--bg-secondary: #f8f9fa
--bg-tertiary: #e9ecef
--text-primary: #000000
--text-secondary: #333333
--text-muted: #767676
--border-primary: #ececec

/* Dark Mode */
--bg-primary: rgba(9, 9, 9, 1)
--bg-secondary: rgba(26, 26, 26, 1)
--text-primary: rgba(223, 223, 223, 1)

/* Dim Mode */
--bg-primary: rgba(14, 21, 32, 1)
--bg-secondary: rgba(26, 37, 51, 1)

/* Spacing */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px

/* Radius */
--radius-sm: 6px
--radius-md: 12px
--radius-lg: 18px
--radius-xl: 24px
```

### 7.5 Typography
```css
h1: 1.44rem, weight 700
h2: 1.30rem, weight 700
h3: 1.25rem, weight 700
body: 0.88rem, weight 500
line-height body: 1.74
line-height headings: 1.36-1.38
```

### 7.6 Responsive Breakpoints
- Desktop: >= 1025px
- Tablet: 801-1024px
- Mobile: <= 800px
- Modal davranışı: Desktop = centered max-width 550px, Mobile = full screen

---

## 8. FEEDIM İÇİN YENİ ÖZELLİKLER (FORILOVE'DA OLMAYAN)

1. **Makale Editörü** - Rich text (başlık, paragraf, görsel, link, bold, italic, quote, code, list)
2. **Okuma Takibi** - IntersectionObserver + scroll tracking + zaman ölçümü
3. **Premium Üyelik** - Ödeme, plan yönetimi, yenileme, iptal
4. **Coin Kazanç Algoritması** - Medium modeli, qualified read, bot detection
5. **Hediye/Bahşiş Sistemi** - Coin ile hediye gönder, animasyonlar
6. **Nakit Çekme** - Minimum limit, banka bilgileri, onay süreci
7. **Kazanç Dashboard** - Grafikler, istatistikler, detaylı raporlar
8. **Keşfet Sayfası** - Trending, kategorize, kişiselleştirilmiş öneri
9. **Etiket Takip** - Max 15 etiket, feed'de tab olarak görünür
10. **İçerik Kalite Puanlama** - Otomatik quality_score hesaplama
11. **Trending Algoritması** - Zaman bazlı azalan etkileşim skoru
12. **Profil Puanlama** - Merkezi skor, tüm sistemde kullanılır
13. **Spam Tespit** - İçerik + kullanıcı bazlı, otomatik aksiyon
14. **Bot Tespit** - Okuma davranışı analizi

---

## 9. ÇALIŞMA YÖNTEMİ

Her özellik için şu adımlar izlenecek:

1. **Ben sana özellik adı veriyorum** (örn: "beğeni sistemi")
2. **Sen WordPress kodunu referans alarak** o özelliği birebir kurallara uygun şekilde Next.js + Supabase'e port ediyorsun
3. **Supabase tabloları + API route'ları + React componentleri + hookları** hep birlikte gelir
4. **Test edilebilir** durumda olur, lokal çalışır
5. Bir sonraki özelliğe geçilir

**Asla yapılmayacaklar:**
- Forilove'a dokunma (orijinal proje korunur)
- Yarım bırakma (her özellik tamam olacak)
- Güvenlik atlama (her endpoint korumalı)
- Hardcode (her şey config/env bazlı)

---

## 10. ENV DEĞİŞKENLERİ

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email
RESEND_API_KEY=

# GIF
TENOR_API_KEY=

# Upload
UPLOAD_MAX_SIZE=10485760

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Feedim

# Security
FEEDIM_ENCRYPTION_KEY=
CAPTCHA_SECRET=

# Premium
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=
```

---

## ÖZET

Bu plan, Feedim WordPress temasındaki **her özelliği** birebir Next.js + Supabase ortamına taşımak, Forilove altyapısını temizleyip dönüştürmek ve Medium benzeri bir içerik platformu oluşturmak için gereken **tüm detayları** içerir.

Toplam tahmini: ~60+ API route, ~80+ component, ~30+ hook, ~20+ veritabanı tablosu, 5 ana algoritma
