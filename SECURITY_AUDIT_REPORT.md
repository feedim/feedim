# FEEDIM Güvenlik Tam Kapsam Tarama Raporu

- Tarih: 2026-02-27 17:28:51 +03
- Mod: Sadece tarama ve raporlama (kod değişikliği yapılmadı)
- Hedef: `/Users/alisozer/Desktop/feedim`

## 1) 10 Aşamalı Tam Kapsam Tarama Planı

1. API envanteri ve attack-surface çıkarımı: Tamamlandı
2. Kimlik doğrulama / yetkilendirme kontrolleri: Tamamlandı
3. Ödeme, premium ve coin ekonomisi suistimal analizi: Tamamlandı
4. Hesap izolasyonu ve veri gizliliği analizi: Tamamlandı
5. Gönderi görünürlük (public/followers/only_me) kontrolü: Tamamlandı
6. Upload, dış URL fetch ve SSRF analizi: Tamamlandı
7. Rate limit, anti-spam ve dağıtık ortam bypass analizi: Tamamlandı
8. Cron/Admin endpoint güvenliği: Tamamlandı
9. Secrets, env ve bağımlılık risk taraması: Kısmi tamamlandı (network kısıtı var)
10. Risk matrisi + önceliklendirilmiş bulgu listesi: Tamamlandı

## 2) Kod Tabanı Ölçümleri

- API route sayısı: `95`
- API route toplam satır: `15,007`
- Çekirdek kaynak satır (app/components/lib/i18n/messages/types/scripts/supabase; ts/tsx/sql/css): `80,167` (~`80.1 bin`)
- Çekirdek TS/TSX/SQL satır: `78,389`
- Toplam kaynak (ts/tsx/js/jsx/sql, node_modules/.next hariç): `78,899`

## 3) Kritikten Düşüğe Güvenlik Bulguları

| ID | Seviye | Bulgu | Kanıt | Etki |
|---|---|---|---|---|
| C-01 | Critical | Yetkisiz email auto-confirm endpoint | `app/api/auth/auto-confirm/route.ts:10-20` | Herkes herhangi bir `user_id` için email doğrulamasını zorlayabilir (hesap doğrulama bypass). |
| C-02 | Critical | Korumasız cron endpoint ile moderasyon verisi silme | `app/api/cron/mod-logs-cleanup/route.ts:5-15` | Kimlik doğrulama olmadan moderasyon logları/notification/decision kayıtları silinebilir. |
| C-03 | Critical | Korumasız cron endpoint ile report silme | `app/api/cron/reports-cleanup/route.ts:5-10` | Herkes rapor kayıtlarını silebilir, denetim izi kaybolur. |
| C-04 | Critical | Premium satın alma ödeme doğrulaması olmadan tamamlanıyor | `app/api/premium/subscribe/route.ts:91-121` | Kullanıcı ödeme yapmadan premium aktifleyebilir (`status: completed`). |
| C-05 | Critical | Dev ödeme endpoint’i prod’da açık kalırsa ücretsiz coin/premium üretimi | `app/api/payment/dev/route.ts:21-227` | Gerçek ödeme olmadan coin/premium kazanımı; ekonomik sistem kırılır. |
| C-06 | Critical | Gönderi `visibility` (followers/only_me) server-side enforce edilmiyor | `app/api/posts/route.ts:389` (alan yazılıyor), ancak `app/api/posts/[id]/route.ts`, `app/api/posts/feed/route.ts`, `app/api/posts/explore/route.ts`, `app/api/posts/moments/route.ts`, `app/api/users/[username]/posts/route.ts` içinde visibility filtresi yok | Özel gönderiler yetkisiz kullanıcılara sızabilir; hesap izolasyonu ihlali. |
| C-07 | Critical | View earning akışında atomiklik yok (race condition) | `app/api/posts/[id]/view/route.ts:99-125`, `223-258` | Paralel isteklerle aynı görüntüleme için birden fazla kazanç yazımı riski. |
| C-08 | Critical | Withdrawal akışında atomiklik yok (race condition) | `app/api/withdrawal/route.ts:82-134` | Aynı anda çoklu istekle birden fazla çekim talebi/yanlış bakiye düşümü riski. |
| H-01 | High | SSRF riski: kullanıcı kontrollü URL’ler sunucuda fetch ediliyor | `app/api/upload/image/route.ts:50-59`, `lib/nsfwCheck.ts:236-246`, `lib/copyright.ts:430-435`, `app/api/posts/route.ts:248-253`, `app/api/posts/[id]/route.ts:463-466` | İç ağ/metadata endpoint’lerine sunucu üzerinden istek atılabilir. |
| H-02 | High | Public profile endpoint’inde `select("*")` ile aşırı veri ifşası riski | `app/api/users/[username]/route.ts:19`, `34`, `38` | Profil tablosundaki gereksiz hassas alanlar istemciye sızabilir. |
| H-03 | High | Username -> email çözümleme endpoint’i (enumeration) | `app/api/users/resolve/route.ts:17-27` | Kullanıcı-adı/email eşleştirmesi çıkarılabilir. |
| H-04 | High | Email availability endpoint’i (enumeration) | `app/api/users/check-email/route.ts:15-23` | Hesap var/yok keşfi yapılabilir. |
| H-05 | High | In-memory rate limitler dağıtık/prod ortamda bypass edilebilir | `middleware.ts:21-35`, `lib/otpRateLimit.ts:9-48`, `app/api/payment/payttr/initiate/route.ts:8-16`, `app/api/payment/payttr/premium/initiate/route.ts:6-15`, `app/api/upload/*` | Multi-instance/serverless ortamda spam/fraud koruması zayıflar. |
| M-01 | Medium | Account unblock akışında 2 aşamalı doğrulama stateful değil | `app/api/account/unblock-verify/route.ts:24-45`, `47-71` | `verify_code` adımı tek başına hesap açabilir; parola adımı zorunlu olarak bağlanmamış. |
| M-02 | Medium | IP fallback geolocation HTTP kullanıyor | `app/api/location/route.ts:45` | Şifrelenmemiş istekle IP/konum verisi üçüncü tarafa açık taşınır. |
| M-03 | Medium | Bazı endpointler görünürlük/gizlilik modelini tutarlı uygulamıyor | Örnek: `app/api/posts/[id]/comments/route.ts`, `app/api/posts/[id]/likes/route.ts`, `app/api/users/[username]/likes/route.ts`, `app/api/users/[username]/comments/route.ts` | Özel içerikle ilişkili sosyal sinyaller dolaylı sızabilir. |
| L-01 | Low | Kullanıcı adı uygunluk endpoint’i enumerasyona açık | `app/api/users/check-username/route.ts:15-23` | Botlar kullanıcı adı envanteri çıkarabilir. |
| L-02 | Low | Post like/comment bildirim hedef alanı tutarsız | `app/api/posts/[id]/like/route.ts:82-85` | Güvenlikten çok fonksiyonel yanlış hedefleme riski. |

## 4) Pozitif Güvenlik Kontrolleri (Mevcut Güçlü Noktalar)

- Çoğu cron endpoint `CRON_SECRET` kontrol ediyor: `account-cleanup`, `post-scores`, `profile-scores`, `suggested-tags`, `trending`.
- PayTR callback endpointlerinde hash doğrulaması ve idempotency var.
- Birçok mutasyon endpointinde auth kontrolü ve kullanıcı bağlamı doğrulaması var.
- Blok ilişkileri, private hesap kontrolü ve moderation kontrolleri birçok akışta uygulanmış.

## 5) Bağımlılık Taraması Durumu

- `npm audit --omit=dev --json` denendi, network erişimi olmadığı için tamamlanamadı.
- Hata: `ENOTFOUND registry.npmjs.org`

## 6) Sonuç

Mevcut durumda sistemde kritik seviyede açıklar var; özellikle:

- Yetkisiz account/premium/cron akışları,
- Gönderi görünürlük modelinin server-side enforce edilmemesi,
- Coin kazanımı ve çekimde race-condition kaynaklı suistimal riskleri.

Bu bulgular giderilmeden "Instagram standardında sıfır tolerans" güvenlik seviyesine ulaşılmış sayılmaz.
