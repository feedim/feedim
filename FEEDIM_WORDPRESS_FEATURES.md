# FEEDIM WORDPRESS TEMASI - TÜM ÖZELLİKLER

Bu belge, Feedim WordPress temasındaki (v1.0.776) HER özelliği listelemektedir.
Next.js'e taşıma sırasında referans olarak kullanılacaktır.

---

## 1. KİMLİK DOĞRULAMA

### Login
- Email veya username ile giriş (case-insensitive, max 60 karakter)
- Password: 6-128 karakter, boşluk otomatik kaldırılır
- Email domain whitelist: gmail, hotmail, outlook, yahoo, icloud
- Form timing validasyonu (1.5-3600 saniye)
- CAPTCHA (slider puzzle - isteğe bağlı)
- Hesap durumu kontrolleri: active, disabled, deleted, moderation, frozen, blocked
- Frozen hesap: 2 adımlı reaktivasyon (1. giriş uyarı, 2. giriş aktifleştir)
- Pending delete: 14 gün penceresi, süre geçtiyse silindi
- Güvenlik loglama (IP, User Agent, timestamp)
- Onboarding kontrolü (tamamlanmadıysa yönlendir)

### Register
- First/Last Name: 2-50 karakter, sadece harf (Türkçe: ğüşıöçĞÜŞİÖÇ), gibberish detection
- Username: 3-15 karakter, regex pattern, ardışık ./_ yasak
- Email: domain whitelist, minimum 3 benzersiz alfanumerik karakter (anti-spam)
- Password: 6-128 karakter, boşluk yasak
- Confirm password eşleşme
- Terms onayı zorunlu
- Username alınmışsa: otomatik 3 öneri (isim kombinasyonları + tarih/random suffix)
- CAPTCHA
- Otomatik giriş + onboarding yönlendirmesi
- Rol: feedim_user

### Google OAuth
- JWT token doğrulama (email_verified, client_id, expiration)
- Mevcut kullanıcı: giriş + google_connected işaretleme
- Yeni kullanıcı: otomatik hesap oluşturma + avatar indirme
- Rate limit: 10 deneme/saat/IP

### Şifre Sıfırlama
- 6 haneli kod (15 dakika geçerli)
- Email maskeleme (a***z@g***om)
- 3 deneme/2 dakika resend limiti
- <3 dakika: aynı kodu yeniden gönder, ≥3 dakika: yeni kod

---

## 2. PROFİL SİSTEMİ

### Profil Görüntüleme
- Avatar (responsive srcset: 75, 150, 300, 1080)
- Ad Soyad veya display_name
- @username
- Post sayısı
- Follower sayısı (tıklanabilir modal)
- Following sayısı (tıklanabilir modal)
- Bio (max 150 karakter)
- Website (HTTPS zorunlu)
- Mutual followers (max 3 avatar + isim, 2+ ise modal)

### Profil Aksiyonları (Başka Kullanıcı)
- Follow/Unfollow butonu
- Follow Request (private hesaplar)
- Cancel Request
- Block/Unblock
- Share Profile
- Report

### Kendi Profil Aksiyonları
- Edit Profile
- Share Profile
- Settings menü (3-dot icon)

### Profil Düzenleme
- First/Last Name: 2+ karakter, max 50, harf, max 2 değişiklik/14 gün
- Username: 30 günde 1 değişiklik
- Email: değiştirilince email_verified = false
- Bio: max 150 karakter
- Website: otomatik https://, domain validasyonu, max 255
- Birth Date: yaş 13-120
- Phone: 10 hane, sequential/repeated pattern kontrolü, benzersizlik
- Country Code: whitelist (+90, +1, +44 vb.)
- Gender: male, female, other

### Avatar Sistemi
- Upload: max 10MB, tipler: jpg, jpeg, png, gif, webp, heic, heif, avif
- HEIC/HEIF/AVIF → JPEG dönüşüm (Imagick veya GD)
- Boyutlar: 75x75, 150x150, 300x300, 1080x1080, original
- EXIF strip
- Crop modal (zoom slider: min=1, max=3, step=0.01)
- Avatar geçmişi (son 10)
- Kaldırma (default avatar'a dön)
- Cache-bust timestamp

### Profil Ziyaret Takibi
- Kimin ziyaret ettiği kaydedilir
- Son 30 gün gösterilir
- Ziyaretçiler modal'da listelenir

---

## 3. TAKİP SİSTEMİ

### Takip Durumları
- Not Following → "Follow" butonu
- Following → "Unfollow" butonu
- Request Sent (private) → "Requested" butonu
- Blocked → "Blocked" butonu

### Kurallar
- Public hesaplar: anında takip
- Private hesaplar: istek gönder
- Engellenen kullanıcıyı takip edemezsin
- Seni engelleyen kullanıcıyı takip edemezsin

### Metodlar
- Follow/Unfollow
- Send/Cancel follow request
- Accept/Reject follow request
- is_following kontrol
- has_follow_request kontrol
- Followers listesi (modal, paginated)
- Following listesi (modal, paginated)
- Mutual followers listesi (modal)
- Follow requests listesi (modal)

### Private Hesap Toggle
- AJAX ile açma/kapama
- Meta: account_private (1/0)

---

## 4. ENGELLEME SİSTEMİ

### Etkileri
- Engellenen kişi gönderileri göremez
- Engellenen kişi takip edemez
- Bildirimlerde gösterilmez
- Profil erişilemez ("kullanıcı bulunamadı")
- Arama sonuçlarında çıkmaz
- Yorumlarda filtrelenir

### Metodlar
- Block/Unblock
- is_blocked kontrol (iki yönlü)
- Blocked users listesi
- is_user_accessible kontrol (engel + durum)

---

## 5. GÖNDERI/İÇERİK SİSTEMİ

### İçerik Tipleri
- post, video, gallery, news, list, community, quiz, series

### Gönderi Oluşturma (3 Adım)
- Adım 1: Başlık + kategori
- Adım 2: İçerik editörü (toolbar: heading large/small, image upload, link)
- Adım 3: Etiketler, mention, öne çıkan görsel
- Taslak / Yayınla seçenekleri

### Tekil Gönderi Sayfası
- Yazar bilgileri (avatar, isim, verified badge)
- İçerik gösterimi
- Post NavBar: Like, Comments, Save, More butonları
- Liked-by bölümü (1: direkt link, 2: "X ve Y beğendi", 3+: "X, Y ve diğerleri")
- Kaynak linkler (schema.org markup)
- İlgili gönderiler (aynı yazar veya benzer)

### Validasyonlar
- Başlık max 200 karakter
- Başlık: emoji strip, domain tespiti, unsafe karakter temizleme
- Slug: 12 karakter MD5 hash eklenir
- Görsel: boyut/tip kontrolü, EXIF strip, lazy load
- Auto ALT text: başlık + en yakın heading'den

---

## 6. BEĞENİ SİSTEMİ

### Özellikler
- Optimistic UI (anında güncelle, hata durumunda geri al)
- Post bazlı tüm butonlar senkronize
- Count format: K (bin), Mn (milyon), Mr (milyar)
- Pending request kuyruğu (post bazlı)
- Hata durumunda önceki duruma rollback

### Veri Yapısı
- feedim_liked_posts (kullanıcı meta: beğenilen post ID array)
- feedim_like_count (post meta: beğeni sayısı)
- feedim_likers (post meta: user_id => timestamp map)
- feedim_post_liked action tetiklenir

---

## 7. BOOKMARK/KAYDETME SİSTEMİ

### Özellikler
- Toggle bookmark (ekle/kaldır)
- feedim_bookmarks (kullanıcı meta: post ID array)
- feedim_save_count (post meta: kaydetme sayısı)
- Bookmarks sayfası (AJAX, 5 per page, paginated)
- Boş durum mesajı

---

## 8. PAYLAŞIM SİSTEMİ

### Platformlar
- Facebook, Twitter/X, Tumblr, Pinterest, LinkedIn, WhatsApp, Email, Native Share, Copy Link

### Sayaçlar
- Toplam paylaşım (post meta)
- Platform bazlı paylaşım (post meta)
- Kullanıcı bazlı toplam/platform paylaşım (user meta)
- Duplicate önleme: aynı user/visitor/platform/10 dakika cache

### Share Modal
- Sosyal platform butonları
- Copy link butonu
- Share title dinamik oluşturma

---

## 9. YORUM SİSTEMİ

### Yorum Oluşturma
- Max 250 karakter (veya GIF URL)
- Giriş yapmış kullanıcılar
- Ziyaretçi yorumları: isim (max 10), soyad (max 13), email (max 50)
- GIF desteği (Tenor API, "gif::URL" formatı)
- Emoji picker (8 kategori: yüzler, hayvanlar, yemek, aktivite, seyahat, objeler, semboller, bayraklar)
- Reply (yanıtlama)
- Ziyaretçiler 15 dakika içinde silebilir (cookie bazlı)

### Moderasyon
- Pending yorum sistemi (max 3 pending)
- Duplicate tespiti (aynı içerik 60 saniye)
- Disallowed keys kontrolü
- Link sayısı kontrolü (max limit)
- Spam keyword tespiti: eval(, base64_decode, exec(, system(, shell_exec, passthru
- Script/iframe/object/embed tespiti
- 3+ HTTP link → spam
- Disposable email tespiti (10minutemail, tempmail, guerrillamail vb.)

### Rate Limiting (Rol Bazlı)
- per_minute, per_hour, per_day limitleri
- Roller: guest, user, editor, admin
- Exempt: feedim_admin, feedim_moderator, administrator

### Listeleme
- 10 per page, paginated
- Sıralama: smart (default), newest, popular
- Engellenen/engelleyen kullanıcılar filtrelenir
- Pending yorumlar önce gösterilir

---

## 10. BİLDİRİM SİSTEMİ

### Bildirim Tipleri
1. like: Post beğenildi
2. follow: Takip edildi
3. follow_request: Takip isteği
4. follow_request_accepted: İstek kabul edildi
5. comment: Yorumda
6. reply: Yoruma yanıt
7. mention: Bahsedilme (yorum/post)
8. first_post: Takip edilen ilk post
9. comeback_post: Uzun aradan sonra post
10. milestone: 1K/10K/100K/1M/10M görüntüleme

### Özellikler
- 20 per page, paginated
- Okundu/görüldü durumu ayrı
- Tümünü okundu yap
- Tekli silme
- Bildirim ayarları (tip bazlı açma/kapama)
- 24 saat duraklatma
- Duplicate prevention (aynı bildirim 24 saatte 1)
- Engellenen kullanıcılardan bildirim filtreleme
- 90 gün sonra otomatik silme
- Unread + unseen count (header badge)
- Badge: "99+" eğer > 99

---

## 11. ARAMA SİSTEMİ

### Niyet Tespiti
- @ ile başlarsa: kullanıcı araması
- > 3 kelime veya > 20 karakter: post araması
- <= 2 kelime ve <= 15 karakter: karma

### Kullanıcı Arama Puanlama
- Exact username: +200
- Username starts with: +100
- Username contains: +50
- Exact display name: +150
- Display name starts: +80
- Display name contains: +40
- Spam puanı (negatif): tekrar kelimeler, uzun username, sadece sayı, pattern tekrarı
- İçerik bonus: +300 (başlık +600, içerik +200, etiket +400)
- Verified: +500, Avatar: +300 (yoksa -200), Bio: +150 (yoksa -50)
- Takip ediyorsun: +600, Seni takip ediyor: +250
- Skor < -100 filtrelenir, top 50

### Post Arama Puanlama
- Başlık: *20, İçerik: *10, Yazar: *20, Etiket: *15
- Erişilemeyen yazarlar filtrelenir, top 100

---

## 12. FEED ALGORİTMASI

### Ana Sayfa Feed
- Post type: post, status: published, 12 per page
- Dil tercihi: birincil dil önce
- İçerik tipi önceliği: list/video/post/quiz > news (14 gün) > eski news
- Günlük random seed (cookie bazlı, aynı gün aynı sıralama)

### Filtreler
- Engellediğin kullanıcılar hariç
- Seni engelleyenler hariç
- Durumu aktif olmayan yazarlar hariç (moderation, disabled, deleted, blocked, frozen)
- Private hesaplar: sadece takip ettiklerin (giriş yapmamışlar hiç göremez)

### Özel Sıralama
- postmeta JOIN: content_type, language
- Custom orderby: dil + içerik tipi + random

### Feed Tab'ları
- For You (ana feed)
- Followed (takip ettiklerin)
- Bookmarks (kaydedilenler)
- Takip edilen etiketler (max 15 etiket, her biri bir tab)

---

## 13. ETİKET TAKİP SİSTEMİ

- Max 15 etiket takip
- feedim_followed_tags (kullanıcı meta: term_id array)
- Follow/unfollow toggle
- Feed'de tab olarak görünür
- Etiket sayfasında follow/unfollow butonu

---

## 14. DARK MODE

### Modlar
- Light, Dark, Dim, System (default)

### CSS Değişkenleri
- Light: --bg-primary: #ffffff, --text-primary: #000000
- Dark: --bg-primary: rgba(9,9,9,1), --text-primary: rgba(223,223,223,1)
- Dim: --bg-primary: rgba(14,21,32,1), --text-primary: rgba(223,223,223,1)

### Davranış
- localStorage + user meta senkronizasyonu
- System modu: prefers-color-scheme dinler
- Sayfa yenilemesi gerekmez
- Radio butonlar ile seçim (ikonlu)

---

## 15. ONBOARDING (7 Adım)

1. Welcome (karşılama mesajı) - atlanabilir
2. Profile Photo (avatar upload/crop)
3. Biography (bio textarea)
4. Birth Date (yaş validasyonu 13-120) - atlanabilir
5. Gender (dropdown seçim) - atlanabilir
6. Email Verification (6 haneli kod, 15dk, 180s resend cooldown) - atlanabilir
7. Suggestions (kullanıcı takip önerileri)

- Progress bar (adım/7)
- 2 saniye minimum bekleme her adımda
- Tamamlanınca profile yönlendir
- onboarding_completed meta'sı güncellenir

---

## 16. GÜVENLİK

### Roller
- feedim_admin, feedim_moderator, feedim_editor, feedim_user, feedim_premium

### Şifreleme
- ID encryption: base64 encoding
- HTML çıktıda otomatik ID şifreleme
- AJAX yanıtlarda otomatik şifreleme

### CAPTCHA
- Slider puzzle (400x200, gradient image)
- 30 deneme/saat/IP
- Challenge: 5 dakika, Verification: 10 dakika
- Mouse tracking (min 3 hareket, >0.5s süre)
- %95 doğruluk toleransı

### WAF
- XSS: script, javascript:, onload, iframe, object, embed, eval, expression
- SQLi: UNION SELECT, DROP TABLE, TRUNCATE, exec xp_, benchmark, sleep
- LFI: ../, /etc/passwd, /proc/self, /windows/system
- URL/base64/hex/unicode decode sonrası kontrol

### Dosya Upload
- Tehlikeli uzantılar engellenir (php, exe, sh, bat, svg, html, js vb.)
- MIME tip doğrulama (finfo)
- Malicious content taraması (<?php, <script, eval, exec vb.)
- Max 10MB (genel), 2GB (video)
- EXIF strip, otomatik JPEG dönüşüm (>150KB)

### Güvenlik Headerları
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS: 31536000s
- CSP: self + güvenli domainler

### Session Yönetimi
- Device hash tracking
- Max 5 güvenilir cihaz
- Cihaz engelleme (1 saat cooldown)
- Oturum sonlandırma
- Tüm cihazlardan çıkış

---

## 17. ANALİTİK

### Takip Edilen Olaylar
- pageview, click, form_submission, external_link_click, download
- session_start, session_end, scroll_depth, scroll_percentage
- mouse_movement, mouse_movement_heatmap, performance
- location_update, consent_update, device_profile_update, custom_event

### Device Fingerprinting
- GPU, CPU, cores, RAM, screen resolution, DPI, device type
- OS, browser, renderer, fonts, plugins
- IP, ISP, connection type, timezone
- Confidence scoring, cross-browser matching

### Veritabanı
- feedim_analytics, feedim_devices, feedim_visitors, feedim_sessions

---

## 18. SEO

### Meta Tags
- Title (dinamik), Description, Canonical URL
- OG: title, description, image, type, url
- Twitter Cards
- Schema.org JSON-LD: Article, BreadcrumbList, Organization, Person, Speakable

### Kurallar
- Tek post: başlık, özet, öne çıkan görsel, yazar
- Profil: display name, bio, avatar
- Arşiv: kategori/etiket adı, sayısı
- Ana sayfa: site adı, tagline

---

## 19. REKLAM SİSTEMİ

- Pozisyon bazlı reklam blokları
- Cihaz hedefleme: desktop, tablet, mobile
- Açma/kapama (rol bazlı)
- Custom HTML/AdSense kodu
- Click/close tracking
- CSP header'a reklam domainleri ekleme

---

## 20. VİDEO OYNATICI

- HTML5 custom player
- Play/pause, volume slider, progress bar, seek, fullscreen
- Keyboard: space = play/pause, arrows = seek
- Touch desteği
- Aspect ratio: 16:9 (default), 9:16
- Format: MP4, WebM

---

## 21. MODAL SİSTEMİ

### Tüm Modallar
1. Dark Mode Modal (#themeswmodal)
2. Followers Modal (#followersmodal)
3. Following Modal (#followingmodal)
4. Likes Modal (#likesmodal)
5. Avatar Modal (#profilemodal)
6. Avatar Crop Modal (#avatarcropmodal)
7. Avatar View Modal (#avatarviewmodal)
8. Share Modal (#sharemodal)
9. Report Modal (#reportmodal)
10. Post More Options Modal (#postmoremodal)
11. Comment Modal (#commentmodal)
12. Image Showcase Modal (#imgspmodal)
13. Profile Visitors Modal (#profilevisitorsmodal)
14. Create Select Modal (#createselectmodal)
15. Follow Requests Modal (#followrequestsmodal)
16. Profile Settings Modal (#profilemoremodal)
17. Mutual Followers Modal (#mutualfollowersmodal)

### Modal Yapısı (Standart)
```html
<div class="x32flP4rs" id="[modalId]" role="dialog" aria-modal="true">
  <div class="pop-modal-content type[1-3]">
    <div class="midHead">
      <div class="midHead-left">   <!-- Close button -->
      <div class="midHead-center">  <!-- Title -->
      <div class="midHead-right">   <!-- Info/More button -->
    </div>
    <!-- İçerik alanı -->
  </div>
</div>
```

---

## 22. ALERT SİSTEMİ

- feedimAlert(type, message, options)
- Tipler: error, success, warning, info, question, prompt
- Overlay: z-index 2147483646, alert: z-index 2147483647
- Border-radius: 27px
- Backdrop-filter: blur(65px) brightness(2)
- Animasyonlar: slideIn 0.35s / slideOut 0.3s
- Stack management
- Keyboard: Enter = confirm, Escape = cancel
- Touch: swipe down to dismiss
- Prompt mode (text input)

---

## 23. EMAIL SİSTEMİ

### Email Tipleri
- Yeni kullanıcı bildirimi
- Şifre değişikliği
- Şifre sıfırlama kodu
- Yorum bildirimi
- Email doğrulama kodu
- Admin bildirimleri

### Özellikler
- Email log (max 100)
- Template değişken sistemi
- Tip bazlı açma/kapama
- SMTP yapılandırması

---

## 24. RAPOR SİSTEMİ

### Rapor Tipleri
- Kullanıcı raporu (feedim_user_reports)
- İçerik raporu (feedim_reports: post/comment)
- Kullanıcı başına içerik başına 1 rapor (unique)

### Moderasyon
- Durum: published, moderation, removed
- Otomatik moderasyon: belirli sayıda rapor sonrası
- Admin aksiyon: onay (publish) veya kaldır (remove)

---

## 25. SAYFA YAPISI

### Header
- Logo (desktop + mobile versiyonları)
- Navigation: Home, Explore/Search, Followed, Create Post, Bookmarks, Notifications, Theme Toggle, Settings
- Mobile: hamburger menu, avatar, notification badge
- Expand/collapse butonu

### Footer
- Navigation menüsü
- Footer linkler: Terms, Privacy, Cookies
- Copyright

### Mobile Bottom Nav (ikon tabanlı)
- Home, Search, Create Post, Notifications, Profile

### Skeleton Loading
- Primary post skeleton, Greeder post skeleton
- Comment skeleton, User item skeleton, Notification skeleton
- .skhol (gizle) + .skwrp (skeleton göster), 320ms auto-cleanup

---

## 26. KULLANICI DURUMU YÖNETİMİ

### Durumlar
- active (varsayılan)
- userdisabled: admin tarafından devre dışı
- userdeleted: kalıcı silme
- usermoderation: inceleme altında
- userfreeze: dondurulmuş (manual veya pending delete)
- userblocked: sistem tarafından engelli

### Hesap Freeze
- Manuel freeze: giriş yaparak reaktive et (2 adım)
- Pending delete: 14 gün penceresi, süre dolunca kalıcı silme
- Giriş yapararak iptal edilebilir

### Admin Aksiyonlar
- Durum değiştirme
- Verified badge verme
- Admin kolonu ve filtre desteği
