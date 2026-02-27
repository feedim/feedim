# Feedim Dosya/Medya Guvenlik ve Lazy-Load Raporu
Tarih: 2026-02-27 18:14 (+03)
Kapsam: Yukleme akislari, medya URL guveni, yeniden adlandirma, metadata temizligi, lazy-load/perf.

## Kisa Sonuc
- Tum yuklenen dosyalar icin "tam temizleme + tam yeniden adlandirma" garanti degil.
- Islenmeden kalabilen medya var (ozellikle dis URL fallback senaryolari).
- Lazy-load altyapisi var ama kapsam yetersiz; Android dusuk cihazlar icin iyilestirme gerekli.
- Dosya/medya hattinda guvenlik aciklari mevcut (kritik ve yuksek seviye dahil).

## Dogrudan Sorularin Cevabi
1. Sisteme yuklenen tum dosyalarin bilgileri temizlenip yeniden isimlendiriliyor mu?
- Hayir, tam degil.
- `image` ve `avatar` akislari metadata strip/optimizasyon yapiyor.
- `video` ve `audio` akislari dogrudan presigned upload yapiyor; sunucu tarafi post-upload binary dogrulama/metadata scrub gorunmuyor.
- Image path olusturmada orijinal dosya adinin sanitize edilmis parcasi korunuyor.

2. Yapilmayan media ogesi var mi?
- Evet.
- Dis kaynak gorseller publish sirasinda tekrar yuklenmeye calisiliyor; hata olursa orijinal dis URL korunuyor.
- Bu durumda "tum medya bizim CDN uzerinden geciyor" garantisi yok.

3. Lazy-load optimizasyon onerisi var mi, yoksa sistem yeterince iyi mi?
- Su an yeterince iyi degil (orta seviye).
- Tarama metrikleri:
  - Toplam `<img>`: 156
  - `loading="lazy"` olan: 30
  - `loading` ozelligi olmayan: 126
  - `preload="auto"` kullanimlari: 4

4. Dosyalarda guvenlik acigi var mi?
- Evet, var. Asagida kritikten dusuge listelendi.

## Bulgular (Kritik -> Dusuk)

### Kritik
1. SSRF riski (sunucu tarafi URL fetch)
- Konum: `app/api/upload/image/route.ts` (JSON URL modunda `fetch(url)`).
- Durum: Harici URL sunucu tarafinda indiriliyor; private IP/domain denylist/allowlist kontrolu gorunmuyor.
- Etki: Ic aga erisim, metadata endpoint denemeleri, ag kesfi.
- Oneri:
  - Yalnizca allowlist domain modeli.
  - RFC1918, localhost, link-local, `.internal` vb bloklama.
  - Redirect zinciri dogrulama ve DNS rebinding korumasi.

2. Video/audio icin sunucu tarafi icerik dogrulama eksigi
- Konum: `app/api/upload/video/route.ts`, `app/api/upload/audio/route.ts`.
- Durum: `contentType` ve `fileSize` istemci beyanina gore kontrol ediliyor; upload sonrasi magic-byte/codec dogrulamasi yok.
- Etki: Yanlis tipte dosya depolama, kotuye kullanim, maliyet artisi, analiz/moderasyon borcu.
- Oneri:
  - "Upload finalize" endpoint ile sunucu tarafinda tekrar dogrulama.
  - `ffprobe`/signature kontrolu, izinli codec/container zorlamasi.
  - Gecersiz dosyalari otomatik silme karantina akisi.

### Yuksek
3. Medya URL guven modeli zayif
- Konum: `app/api/posts/route.ts`, `app/api/posts/[id]/route.ts` (featured_image/video_url/video_thumbnail), `app/api/posts/[id]/transcode-complete/route.ts` (hls_url).
- Durum: URL alanlari icin net CDN/domain allowlist zorlamasi gorunmuyor.
- Etki: Ucuncu taraf tracking URL, kotu amacli medya baglantisi, beklenmeyen harici bagimliliklar.
- Oneri:
  - Kayit oncesi tek bir `validateMediaUrl` kati.
  - Sadece kontrol edilen CDN/domain/path pattern kabul etme.

4. Image dosya adinda bilgi sizmasi
- Konum: `app/api/upload/image/route.ts` (`safeName` path'e ekleniyor).
- Durum: Sanitized da olsa orijinal isim parcasi URL/path'te kaliyor.
- Etki: Kisisel/verisel ipucu sizmasi.
- Oneri:
  - Tam rastgele isim (UUID/nanoid) + opsiyonel extension.
  - Orijinal ad gerekiyorsa DB'de private alan olarak tutma, URL'de gostermeme.

5. Dagitik ortamda zayif rate limit
- Konum: upload route'larinda `Map` tabanli limiter.
- Durum: Process-local; coklu instance'da kolay asilir.
- Etki: Spam/maliyet artisi, upload abuse.
- Oneri:
  - Redis/KV tabanli merkezi rate limit (IP + user + endpoint kombinasyonu).

### Orta
6. Harici gorsel fallback nedeniyle islenmemis medya
- Konum: `lib/reuploadExternalImages.ts`.
- Durum: Reupload basarisizsa orijinal URL korunuyor.
- Etki: Temizleme/standartlastirma zinciri kiriliyor.
- Oneri:
  - Publish'te "fail-closed" secenegi (dis URL kalirsa yayin engelle).
  - Arkaplanda kuyrukla tekrar deneme + izleme metriği.

7. Lazy-load kapsami yetersiz
- Durum: Cok sayida `<img>` etiketi explicit lazy/decoding olmadan.
- Etki: Ilk yuklemede gereksiz ag/CPU kullanimi, Android dusuk cihazlarda drop-frame.
- Oneri:
  - Tum list/card/discovery gorsellerinde varsayilan `loading="lazy"`, `decoding="async"`.
  - Fold-ustu haric preload kapatma.
  - Mumkunse ortak `BlurImage` bilesenine gecis.

8. Medya preload stratejisinde agresif davranis
- Konum: `VideoPlayer`, `MomentCard`, `ThumbnailPickerModal` icinde `preload="auto"` kullanimlari.
- Etki: Mobilde erken bant/genislik ve pil tuketimi.
- Oneri:
  - Varsayilan `preload="metadata"` veya `none`.
  - IntersectionObserver ile gorunurlukte yukleme.

## Guclu Noktalar
- Image/avatar akisinda magic-byte kontrolu var.
- Image metadata strip ve optimizasyon var.
- Medya tip allowlist kontrolleri mevcut.
- Bazi route'larda hiz sinirlama katmani var.

## Oncelikli Yol Haritasi (7 Gun)
1. SSRF korumasi + URL allowlist katini merkezi hale getir.
2. Video/audio finalize dogrulama (signature + codec + boyut) ekle.
3. Tum medya URL alanlarini sadece guvenli CDN/domain ile sinirla.
4. Image dosya adini tamamen rastgelelestir.
5. Merkezi (Redis/KV) rate limit'e gec.
6. Lazy-load standartini tum `<img>` kullanimlarina uygula.
7. `preload="auto"` kullanimlarini mobil agirlikli azalt.

## Son Hukum
- "Zerre acik yok" seviyesinde degil.
- Kritik ve yuksek bulgular kapatilmadan Instagram seviyesinde guvenlik hedefi karsilanmis sayilmaz.
