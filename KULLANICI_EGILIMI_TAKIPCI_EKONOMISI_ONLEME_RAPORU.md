# Feedim Kullanıcı Eğilimi ve Takipçi Ekonomisi Önleme Raporu

Tarih: 27 Şubat 2026  
Kapsam: Ürün davranışı + takipçi piyasalaşmasını önleme + gelecek planı  
Yaklaşım: Kod tabanlı teknik analiz + ürün/politika/operasyon planı

## 1) Yönetici Özeti

Sistem açıldığında kullanıcıların ilk iki eğilimi:

1. Hızlı içerik üretimi (`post/note/video/moment`)  
2. Hızlı sosyal kanıt arayışı (`takipçi`, `takip`, `görünürlük`)

Mevcut yapıda iyi anti-abuse temelleri var (follow limiti, spam/profile skorları, earning stop eşikleri). Ancak takipçi piyasalaşmasını tam engellemek için kritik açıklar mevcut:

1. Follow limit mantığı “aksiyon” değil “mevcut ilişki” sayıyor; bazı senaryolarda bypass mümkün.  
2. Özel hesapların sosyal grafiği bazı endpointlerde yetki kontrolü olmadan sızabiliyor.  
3. Keşif/öneri tarafında follower tabanlı sinyaller hâlâ güçlü; manipüle edilebilir teşvik üretiyor.  
4. Earning koruması büyük ölçüde cron skorlarına bağlı; gerçek-zamanlı abuse penceresi oluşabiliyor.

## 2) İlk Kullanıcı Eğilimi: Neden “Önce Post, Sonra Takipçi”?

Kod akışına göre bu eğilim ürün tarafından doğal olarak teşvik ediliyor:

1. Ana ekran içerik üretim CTA’sı çok görünür: “Aklında ne var?” kutusu doğrudan create akışına yönlendiriyor.  
Kanıt: `components/DashboardClient.tsx:216-237`

2. Onboarding’in son adımlarında ilgi etiketleri + kişi önerileri var; kullanıcı doğrudan follow davranışına sokuluyor.  
Kanıt: `app/onboarding/page.tsx:302-316`, `app/onboarding/page.tsx:356-390`

3. Profilde follow sonrası “benzer hesaplar” karuseli açılıyor; follow zinciri büyütülüyor.  
Kanıt: `components/ProfileView.tsx:697-701`, `app/api/suggestions/similar/route.ts:36-98`

4. Sağ panelde “Find People” + follow butonları sürekli görünür.  
Kanıt: `components/SuggestionWidget.tsx:210-231`

Bu nedenle başlangıç psikolojisi doğru tahmin: kullanıcı önce içerik üretip sonra hızlı sosyal büyüme ister.

## 3) Mevcut Güçlü Kontroller (Artılar)

1. Follow işleminde block kontrolü, private hesapta request akışı ve günlük limit var.  
Kanıt: `app/api/users/[username]/follow/route.ts:39-47`, `:86-110`

2. Middleware’de API rate limit + WAF var.  
Kanıt: `middleware.ts:146-155`, `lib/waf.ts:1-171`

3. Profil spam skoru manipülasyon sinyalleri içeriyor (rate-limit hit, follower loss, self-comment, mention abuse, hediye yoğunlaşması).  
Kanıt: `lib/profileScore.ts:591-639`, `app/api/cron/profile-scores/route.ts:333-467`

4. Post spam skoru aynı-IP kümesi, reciprocal etkileşim, hızlı like/save, yeni hesap akını gibi sinyalleri işliyor.  
Kanıt: `lib/postScore.ts:520-556`, `:597-624`, `app/api/cron/post-scores/route.ts:270-300`, `:334-369`

5. Coin earning tarafında spam/profile eşikleriyle kesme var.  
Kanıt: `app/api/posts/[id]/view/route.ts:172-207`, `lib/constants.ts:95-101`

## 4) Kritik Riskler ve Açıklar (Takipçi Ekonomisi Perspektifi)

## Critical-1: Follow limit bypass yüzeyi

Follow limiti `follows` tablosundaki mevcut satır sayısına bakıyor. Unfollow ile satır silinince aynı gün tekrar follow kapasitesi açılıyor. Private hesapta follow request ise `follows` tablosuna yazılmadığı için limit hesabına hiç girmeyebiliyor.

Kanıt:

1. Limit hesabı mevcut `follows` satırlarıyla yapılıyor: `lib/limits.ts:62-69`  
2. Unfollow satırı siliniyor: `app/api/users/[username]/follow/route.ts:56-59`  
3. Private hesapta follow yerine `follow_requests` insert ediliyor: `app/api/users/[username]/follow/route.ts:97-110`

Etkisi:

1. Follow/unfollow churn ile limit istismarı  
2. Private hesaplara request spam  
3. Takipçi pazarı scriptlerinin maliyeti düşer

## Critical-2: Özel hesap sosyal grafiği API seviyesinde sızabilir

UI private guard koysa da bazı API’ler `account_private` yetki kontrolü yapmıyor.

Kanıt:

1. Followers endpoint: private kontrolü yok  
`app/api/users/[username]/followers/route.ts:22-38`
2. Following endpoint: private kontrolü yok  
`app/api/users/[username]/following/route.ts:22-38`
3. Likes endpoint: private kontrolü yok  
`app/api/users/[username]/likes/route.ts:25-50`
4. Comments endpoint: private kontrolü yok  
`app/api/users/[username]/comments/route.ts:24-51`

Etkisi:

1. “Kullanıcı başkasının hesabı ile alakalı bilgiye sahip olamaz” hedefi kırılır  
2. Özel hesap network scraping mümkün olur  
3. Takipçi pazarı için lead toplama kolaylaşır

## High-1: Keşif/öneri tarafında follower-temelli teşvikler

Algoritma tarafında follower_count ve sosyal graph sinyalleri belirgin ağırlık taşıyor.

Kanıt:

1. Suggestions popular backfill follower_count ile: `app/api/suggestions/route.ts:199-214`
2. Search user skoru follower_count bonusu alıyor: `app/api/search/route.ts:146-148`
3. Explore skoru sosyal sinyallerle güçlü boost alıyor: `app/api/posts/explore/route.ts:222-231`

Etkisi:

1. Satın alınmış veya düşük kaliteli follower büyümesi görünürlük getirir  
2. “takipçi sektörü” için ekonomik teşvik oluşur

## High-2: Earning korumasında gerçek-zamanlı boşluk

Earning kesmesi `post.spam_score` ve `author.profile_score` eşiğine bağlı; bu skorlar cron ile güncelleniyor. Cron arası pencerede hızlı abuse denenebilir.

Kanıt:

1. Cron skor hesap: `app/api/cron/post-scores/route.ts:12-33`, `app/api/cron/profile-scores/route.ts:25-33`
2. View sırasında eşik kontrol: `app/api/posts/[id]/view/route.ts:172-207`

Etkisi:

1. Kısa süreli coin farming penceresi  
2. Sonradan ceza/clawback ihtiyacı artar

## Medium-1: In-memory API rate limit ölçeklenme riski

Middleware rate limiter `Map` tabanlı process memory kullanıyor. Çok-instance dağıtımda global limit garantisi zayıflar.

Kanıt: `middleware.ts:21-35`

Etkisi:

1. Botnet ve dağıtık isteklerde etkisi düşer  
2. Uygulama node bazlı koruma verir, ağ bazlı değil

## 5) Hedef Durum (Instagram Seviyesi Güvenlik Standardı İçin)

Takipçi ekonomisini bitirmek için sistemin “ham follower sayısı” yerine “güvenilir sosyal sermaye”yi ölçmesi gerekir:

1. `trusted_follower_count` ana metrik olur  
2. Düşük güvenli hesaplardan gelen follow etkisi ya sıfırlanır ya gecikmeli sayılır  
3. Discovery ve gelir sadece “trusted engagement” ile yükselir  
4. Private graph erişimi API katmanında sert kapatılır

## 6) Gelecek Planı (0-90+ Gün)

## Faz-1 (0-7 Gün) Acil Kapanış

1. Follow limitini action-log temelli yap: `follow_attempt`, `follow_success`, `follow_request_sent`, `unfollow` ayrı olaylar.  
2. Limitleri `follows` sayısından değil immutable event tablosundan hesapla.  
3. Followers/following/likes/comments endpointlerinde private yetki kontrolü zorunlu yap.  
4. Private profile için anonim erişimde her sayfa için `401/403` veya boş dönüş standardını tekilleştir.

Başarı kriteri:

1. Follow-request spam oranı 24 saatte %80+ düşmeli  
2. Private profil graph scraping denemeleri 403 ile bloklanmalı

## Faz-2 (8-30 Gün) Anti-Marketplace Çekirdeği

1. `trusted_follower_count` alanı ekle.  
2. Trust tier sistemi kur:
   - Tier-0: yeni/düşük güvenli hesap, düşük follow kapasitesi
   - Tier-1: doğrulanmış davranış, orta kapasite
   - Tier-2: yüksek güven, tam kapasite
3. Keşif ve aramada raw follower etkisini düşür; trusted follower ve qualified engagement ağırlığını artır.  
4. Follow velocity kuralları ekle: dakika/saat/gün + hedef çeşitliliği + cihaz/IP parmak izi.

Başarı kriteri:

1. Düşük güvenli takipçilerin keşif etkisi %70+ azalmalı  
2. Yapay follow ring tespiti precision > %90

## Faz-3 (31-90 Gün) Gerçek-Zamanlı Risk Motoru

1. View/earning endpointine senkron risk skoru ekle:
   - viewer trust
   - same-IP cluster
   - account-age burst
   - device reuse
2. Riskli earningleri `pending` cüzdana yaz, netleşince `available` yap.  
3. Otomatik clawback ve geçici earning freeze mekanizması kur.

Başarı kriteri:

1. Coin farming kaynaklı fraud kaybı %90+ düşmeli  
2. Yanlış pozitif (iyi kullanıcıyı kesme) <%1

## Faz-4 (90+ Gün) Operasyon ve Politika Sertleştirme

1. “Satın alınmış takipçi / koordineli etkileşim” politikası yayınla.  
2. Moderasyon paneline “network abuse” görünümü ekle.  
3. Şikayet + otomatik tespit + insan moderasyon üçgenini SLA ile bağla.

Başarı kriteri:

1. Tekrarlayan abuse hesaplarında 7 gün içinde tekrar oranı %50 altı  
2. Marketplace odaklı kümelerin tespit süresi < 24 saat

## 7) 10 Modüllük Sürekli Tarama Planı

1. Kimlik ve oturum güvenliği taraması  
2. Yetkilendirme (owner/admin/private scope) taraması  
3. Sosyal graph erişim yüzeyi taraması  
4. Follow/follow-request rate-limit ve abuse taraması  
5. Öneri/keşif manipülasyon sinyali taraması  
6. Earning/coin fraud ve replay taraması  
7. API rate-limit ve WAF dayanıklılık taraması  
8. Veri tabanı sorgu maliyeti ve abuse amplifikasyonu taraması  
9. Moderasyon/ceza geri-bildirim döngüsü taraması  
10. Gözlemleme/KPI/alert kapsamı taraması

## 8) KPI Seti (Takipçi Ekonomisini Ölçmek İçin)

1. `suspicious_follow_velocity_rate`  
2. `follow_request_spam_per_user`  
3. `private_graph_access_denied_count`  
4. `trusted_follower_ratio`  
5. `reciprocal_ring_score_distribution`  
6. `earning_fraud_attempt_rate`  
7. `action_log_limit_breach_rate`  
8. `marketplace_cluster_detection_time`

## 9) Sonuç

Sistemde iyi bir temel var; ancak follower sektörleşmesini bitirmek için kritik fark şudur:  
`ham takipçi büyümesini` ödüllendiren yerler kapatılmalı, `güvenilir etkileşim` dışında hiçbir sinyalin keşif/gelir etkisi bırakılmamalı.  

Bu rapordaki Faz-1 ve Faz-2 tamamlanmadan “sıfır follower piyasası” hedefi operasyonel olarak gerçekçi değildir.
