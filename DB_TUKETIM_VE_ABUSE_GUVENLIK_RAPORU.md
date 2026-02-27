# Feedim Veritabanı Tüketimi ve Abuse/Saldırı Yüzeyi Raporu

Tarih: 2026-02-27  
Kapsam: `app/api`, `lib`, `middleware.ts`, `supabase/migrations` (statik kod taraması)  
Rapor modu: Sadece analiz/rapor, kod değişikliği yok.

## 1) Tarama Özeti

- Toplam kod satırı (TS/JS/SQL): **78,900**
- `app/api` toplam satır: **15,014**
- API route dosyası: **95**
- HTTP method handler sayısı: **130**
- Mutasyon endpoint (POST/PUT/PATCH/DELETE) dosyası: **59**
- DB işlem izi (`.from()` + `.rpc()` referansı): **1,022**
- Mutasyon endpointlerinde lokal rate-limit izi (heuristic): **14/59**
- Lokal rate-limit izi bulunmayan mutasyon endpointi (heuristic): **45/59**

Not: Rate-limit sayımı statik anahtar kelime taramasıdır; middleware/global limit ayrı bir katmandır.

## 2) En Çok DB Tüketen Sıcak Noktalar (Dosya Bazlı)

Aşağıdaki sıralama, dosya içindeki `.from()`/`.rpc()` yoğunluğuna göredir:

1. `app/api/admin/moderation/route.ts` → **145**
2. `app/api/reports/route.ts` → **51**
3. `app/api/cron/profile-scores/route.ts` → **41**
4. `app/api/posts/[id]/route.ts` → **32**
5. `app/api/analytics/route.ts` → **32**
6. `app/api/posts/route.ts` → **30**
7. `app/api/posts/[id]/comments/route.ts` → **22**
8. `app/api/profile/route.ts` → **21**
9. `app/api/posts/[id]/view/route.ts` → **19**
10. `app/api/admin/copyright-claims/route.ts` → **17**
11. `app/api/withdrawal/route.ts` → **16**
12. `app/api/premium/subscribe/route.ts` → **15**
13. `app/api/posts/explore/route.ts` → **14**
14. `app/api/cron/post-scores/route.ts` → **14**
15. `app/api/users/[username]/route.ts` → **13**
16. `app/api/payment/dev/route.ts` → **13**

## 3) Kritik Bulgular (Critical)

### C1) Ödeme doğrulaması olmadan premium aktivasyonu
- Kanıt: `app/api/premium/subscribe/route.ts:91-131`, `113-121`
- Sorun: Endpoint, ödeme doğrulaması olmadan abonelik/premium kaydı açabiliyor (`payment_method: dev/paytr` yazıp `status: completed` oluşturuyor).
- Etki: Kullanıcılar ücret ödemeden premium olabilir.
- Risk: **Critical**

### C2) `payment/dev` endpointi ile coin/premium basımı
- Kanıt: `app/api/payment/dev/route.ts:21-99`, `101-221`
- Sorun: Auth olan kullanıcı, dev endpoint üzerinden doğrudan coin ve premium alabiliyor.
- Etki: Gelir modeli kırılır, coin ekonomisi manipüle edilir.
- Risk: **Critical**

### C3) Kimlik doğrulamasız e-posta doğrulama bypass endpointi
- Kanıt: `app/api/auth/auto-confirm/route.ts:10-27`
- Sorun: Sadece `user_id` alıp `email_confirm: true` set ediyor; auth/secret kontrolü yok.
- Etki: Hesap doğrulama zinciri bypass edilebilir.
- Risk: **Critical**

### C4) Kimlik doğrulamasız kritik cron cleanup endpointleri
- Kanıt:
  - `app/api/cron/mod-logs-cleanup/route.ts:5-16`
  - `app/api/cron/reports-cleanup/route.ts:5-10`
- Sorun: Auth/secret olmadan moderasyon logları, bildirimler, kararlar ve raporlar silinebiliyor.
- Etki: Denetim izi ve moderasyon geçmişi saldırgan tarafından temizlenebilir.
- Risk: **Critical**

### C5) Kullanıcı adı -> e-posta çözümleme (PII ifşası)
- Kanıt: `app/api/users/resolve/route.ts:16-27`
- Sorun: Public endpoint username karşılığında e-posta döndürüyor.
- Etki: PII sızıntısı, hedefli phishing/account-takeover riski artar.
- Risk: **Critical**

### C6) Profil verisi aşırı ifşa (potansiyel toplu hesap bilgisi sızıntısı)
- Kanıt: `app/api/users/[username]/route.ts:17-21`, `34`, `151-159`
- Sorun: `select("*")` ile profil satırı dönülüyor; response’da `profile` doğrudan yayına veriliyor.
- Etki: Profillerde hassas kolonlar varsa (email, güvenlik/meta alanları), başkaları görebilir.
- Risk: **Critical**

### C7) Çekim (withdrawal) yarış koşulu
- Kanıt: `app/api/withdrawal/route.ts:82-134`
- Sorun: `pendingCount` + bakiye kontrolü + bakiye düşüm + talep insert işlemleri tek transaction/atomic claim içinde değil.
- Etki: Paralel isteklerde birden fazla çekim talebi açılıp bakiye/işlem tutarsızlığı oluşabilir.
- Risk: **Critical**

### C8) Görüntüleme kazanç (coin earning) yarış koşulu
- Kanıt: `app/api/posts/[id]/view/route.ts:98-125`, `142-243`, `249-258`
- Sorun: Coin kredi işlemleri, `post_views` insert’inden önce yapılıyor; tek transaction yok.
- Etki: Paralel isteklerde aynı view için tekrar kazanç yazımı veya limit aşımı oluşabilir.
- Risk: **Critical**

## 4) Yüksek Bulgular (High)

### H1) Dağıtık ortamda bypass edilebilir in-memory rate-limit
- Kanıt:
  - `middleware.ts:21-35` (global API limiter)
  - `lib/otpRateLimit.ts:9-35`
  - `app/api/upload/image/route.ts:16-29`
  - `app/api/upload/video/route.ts:10-22`
  - `app/api/upload/audio/route.ts:10-22`
  - `app/api/payment/verify/route.ts:6-9`
  - `app/api/payment/payttr/initiate/route.ts:8-17`
  - `app/api/payment/payttr/premium/initiate/route.ts:6-15`
- Sorun: Tüm limitler process-memory’de. Çoklu instance/CDN arkasında tutarlı değil.
- Etki: Botnet/distributed spam ile limitler aşılabilir.
- Risk: **High**

### H2) Mutasyon endpointlerinin büyük kısmında endpoint-seviyesi throttle yok
- Ölçüm: 59 mutasyon endpoint dosyasının ~45’inde lokal limit izi yok (heuristic).
- Etki: Toggle/spam endpointleri (share/save/comment-like/visit vb.) DB write amplifikasyonu ve manipülasyon riski taşır.
- Risk: **High**

### H3) Davranış metrikleri spam’a açık endpointler
- Kanıt:
  - `app/api/posts/[id]/share/route.ts:35-40`
  - `app/api/users/[username]/visit/route.ts:23-26`
  - `app/api/posts/[id]/comments/[commentId]/like/route.ts:38-50`
- Sorun: Sık tekrar istekleri için güçlü idempotency/cooldown görünmüyor.
- Etki: engagement/trending/profile-score manipülasyonu.
- Risk: **High**

### H4) Private hesap sosyal grafiği ifşası
- Kanıt:
  - `app/api/users/[username]/followers/route.ts:33-39`, `47-51`
  - `app/api/users/[username]/following/route.ts:33-39`, `47-51`
- Sorun: Private hesap için follower/following listesi erişim kontrolü zayıf.
- Etki: Hesap gizlilik modeli zedelenir.
- Risk: **High**

## 5) Orta Bulgular (Medium)

### M1) Search endpointinde public cache başlığı + kişiselleştirme
- Kanıt: `app/api/search/route.ts:31-47`, `225-227`
- Sorun: Kullanıcıya göre blok/follow etkili sonuçlar var; response `public` cache-control veriyor.
- Etki: Yanlış cache davranışında kullanıcılar arası sonuç karışması riski.
- Risk: **Medium**

### M2) WAF muafiyeti geniş (`/api/posts`, `/api/upload`)
- Kanıt: `lib/waf.ts:157-163`, `169-170`
- Sorun: En yoğun payload yüzeyleri WAF muaf.
- Etki: İç endpoint validasyonuna tam bağımlılık; bypass durumunda risk artar.
- Risk: **Medium**

### M3) Bildirim endpointlerinde ağır sorgu paterni
- Kanıt:
  - `app/api/notifications/grouped/route.ts:25-33` (`limit(200)` raw çekim)
  - `app/api/notifications/grouped/route.ts:192-219` (ek query zincirleri)
- Etki: Mobil polling senaryosunda DB yükü artar.
- Risk: **Medium**

### M4) Analytics endpointinde yüksek fan-out ve büyük `IN` listeleri
- Kanıt:
  - `app/api/analytics/route.ts:79-102`, `118-125`, `230-239`
  - `app/api/analytics/route.ts:248-260` (`followers` -> `limit(10000)` + çoklu `in(user_id, followerIds)`)
- Etki: Büyük hesaplarda sorgu maliyeti patlar.
- Risk: **Medium**

## 6) DB Performans Darboğazları

### P1) `admin/moderation` çok yüksek query fan-out
- `tab` bazlı çoklu path; bazı yerlerde döngü içinde query (`map/for` içinde ek select/update).
- Ağır rapor/moderasyon dönemlerinde latency artışı beklenir.

### P2) `reports` endpointi arka plan işlerinde N+1 davranış
- Raportör başına notification insert döngüleri var.
- İçerik türüne göre ek sorgular (post/comment/profile) çoğalıyor.

### P3) `suggestions` endpointi çok fazlı scoring ve çoklu toplu sorgu
- FOF, tag, konum, popüler backfill, profile fetch zinciri tek request içinde.
- Yüksek concurrency’de DB CPU/IO tüketimi yükselir.

### P4) `view` endpointi ekonomik işlem + analitik + milestone bildirimini tek isteğe sıkıştırıyor
- Hem yazma hem okuma yoğun; yarış koşulu da mevcut.

## 7) Tekrarlı İstek (Replay/Spam) Saldırı Senaryoları

1. `POST /api/posts/[id]/view`
- Paralel burst isteklerle coin awarding yarış koşulu tetiklenebilir.
- Etki: Haksız kazanç, günlük/post limit bypass ihtimali.

2. `POST /api/withdrawal`
- Aynı anda birden fazla çekim isteği ile pending kontrolü yarışa sokulabilir.
- Etki: Finansal tutarsızlık.

3. `POST /api/posts/[id]/share` ve `POST /api/users/[username]/visit`
- Endpoint-seviyesi sert limit/idempotency yok.
- Etki: Metrik manipülasyonu.

4. `POST /api/payment/payttr*/initiate`, `POST /api/upload/*`
- In-memory limit dağıtıkta zayıf.
- Etki: Flood ve maliyet artışı.

## 8) 10 Adımlı Güvenlik + DB Tarama Planı (Operasyon Planı)

1. Public endpoint kimlik doğrulama matrisi çıkar.
2. Service-role (`createAdminClient`) kullanılan endpointlerde zorunlu auth/role policy doğrula.
3. Finansal endpointlerde (payment/withdrawal/view-earning/gift) transaction ve idempotency zorunlu kıl.
4. Replay saldırılarına karşı Redis tabanlı distributed rate-limit uygula.
5. Hassas veri sızıntısı için tüm `select("*")` çağrılarını explicit allowlist’e çevir.
6. Privacy model testleri: private hesap, followers/following, profile alanları.
7. DB index denetimi: hot query kolonlarında composite index ve unique constraint doğrulaması.
8. Ağır endpointleri (analytics/reports/moderation/suggestions) profil çıkarıp query budget belirle.
9. WAF muafiyetlerini daralt; endpoint bazlı body validation ve schema enforcement ekle.
10. Güvenlik regresyon testi (CI): kritik abuse senaryoları için otomatik test.

## 9) Acil Aksiyon Önceliği

### İlk 24 Saat (Bloker)
1. `api/payment/dev`, `api/premium/subscribe`, `api/auth/auto-confirm` erişimini prod’da kapat.
2. `api/cron/mod-logs-cleanup` ve `api/cron/reports-cleanup` için secret auth ekle.
3. `api/users/resolve` email dönüşünü kaldır veya sadece internal trusted flow’a taşı.
4. `api/users/[username]` endpointinde `select("*")` kaldır, strict field allowlist uygula.

### 3-7 Gün
1. Withdrawal ve view-earning akışlarını DB transaction + idempotency key ile yeniden tasarla.
2. Redis/KV tabanlı distributed rate-limit ve anti-replay (nonce/timestamp) ekle.
3. Share/visit/comment-like için cooldown + uniqueness kuralı ekle.

### 1-2 Hafta
1. Analytics/suggestions/moderation için query optimizasyonu + index paketi çıkar.
2. Load test + abuse test (burst/parallel/slowloris benzeri) senaryolarını CI’ye bağla.

## 10) Önerilen Teknik Kontroller (Kısa Liste)

- Finansal ve ödül akışları: **ACID transaction + optimistic lock + idempotency key**
- `post_views`: en azından `(post_id, viewer_id)` unique + insert-önce-claim deseni
- `withdrawal_requests`: kullanıcı başına `pending/processing` partial unique index
- `coin_transactions`: double-entry ledger yaklaşımı
- Cache/rate-limit: process memory yerine Redis/KV
- PII endpointleri: data minimization, field-level allowlist, audit log

---

Bu rapor statik kod incelemesiyle hazırlanmıştır; canlı trafik/saldırı simülasyonu ve DB query plan ölçümü yapılmamıştır. Bu nedenle bulguların bir kısmı “potansiyel” kategoride olup canlı doğrulama ile kesinleştirilmelidir.
