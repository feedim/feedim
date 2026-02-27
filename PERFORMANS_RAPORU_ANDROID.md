# Feedim Android Performans Raporu

Tarih: 27 Şubat 2026  
Kapsam: `app/` + `components/` + üretim chunk çıktıları (`.next/static/chunks`)  
Not: Kod değişikliği yapılmadı, yalnızca tarama ve raporlama yapıldı.

## 1) Yönetici Özeti

Android cihazlarda performansı en çok düşüren alanlar:

1. **GPU ağır görsel efektler** (`backdrop-filter`, yüksek blur, ambient glow)
2. **Sürekli çalışan döngüler** (`requestAnimationFrame`, sık `setInterval` polling)
3. **Erken/yoğun JS yükleme** (global modal preload, yüksek client-side bileşen sayısı)
4. **Medya odaklı yüksek CPU akışları** (video progress RAF döngüleri, client-side ffmpeg işlemleri)

Bu 4 alan optimize edildiğinde Android’de kaydırma akıcılığı, pil tüketimi ve ilk etkileşim süresinde anlamlı iyileşme beklenir.

## 2) Tarama Metrikleri

- UI satır sayısı (`app+components ts/tsx/css`): **72,087**
- `app/globals.css` uzunluğu: **1,778 satır**
- `use client` dosya sayısı: **161**
- `backdrop-filter/blur` referansı: **40**
- `animation` referansı: **69**
- `transition` referansı: **538**
- `setInterval` referansı: **15**
- `requestAnimationFrame` referansı: **25**
- `setTimeout` referansı: **141**
- `IntersectionObserver` referansı: **8**

Chunk snapshot (`.next/static/chunks`):
- JS chunk sayısı: **368**
- Toplam JS chunk boyutu: **4,332,034 byte (~4.13 MB)**
- En büyük chunklar:
  - `510,810` byte: `.next/static/chunks/a4634e51.244eff4c03f82fcf.js`
  - `477,019` byte: `.next/static/chunks/76567b6f-f10e15270bb8b0cf.js`
  - `207,181` byte: `.next/static/chunks/6622-34959a8493881355.js`

Not: `next build --webpack` sırasında mevcut kod tabanındaki TypeScript hatası (`app/api/posts/route.ts:629`) nedeniyle final route-size tablosu tamamlanamadı.

## 3) Kritik Performans Darboğazları

## Critical

### A) Ambient Light efekti (CPU + GPU + batarya)
- Kanıt:
  - `components/AmbientLight.tsx:72` → `blur(150px) saturate(1.5)`
  - `components/AmbientLight.tsx:313-316` → sürekli `requestAnimationFrame` döngüsü
  - `components/AmbientLight.tsx:331-344` → `150ms` polling ile video tarama
- Etki:
  - Özellikle Android orta/alt segment cihazlarda GPU compositing maliyeti ve sürekli repaint artışı.
  - Uzun kullanımda batarya tüketimini ciddi artırır.

### B) Global blur/backdrop yoğunluğu
- Kanıt:
  - `app/globals.css:811-828` (`feedim-toolbar`, `blur(40px)`)
  - `app/globals.css:1562-1600` (ambient açıkken çoklu `backdrop-filter` katmanı)
- Etki:
  - Backdrop blur mobil GPU’da pahalıdır; üst üste kullanıldığında frame drop üretir.

### C) Global modal preload (ilk açılış yükü)
- Kanıt:
  - `components/ModalsPreload.tsx:5-24` → 19 modal dinamik import
  - `components/ModalsPreload.tsx:33-40` → idle/ilk etkileşimde toplu preload
  - `app/layout.tsx:123` → tüm uygulamada global aktif
- Etki:
  - İlk kullanıcı etkileşiminde JS parse/compile maliyeti yükselir.
  - Düşük RAM Android cihazlarda GC basıncını artırır.

## High

### D) Video yüzeylerinde çoklu RAF döngüleri
- Kanıt:
  - `components/VideoPlayer.tsx:147-153` (progress RAF)
  - `components/EmbedMomentPlayer.tsx:19-28` (ayrı RAF)
  - `components/MomentCard.tsx:468-476` (ayrı RAF)
- Etki:
  - Aynı ekranda birden fazla video/kart olduğunda CPU sürekli meşgul kalır.

### E) Çift bildirim polling
- Kanıt:
  - `components/Sidebar.tsx:44-56` → `30s` polling
  - `components/MobileBottomNav.tsx:20-31` → aynı endpoint için ikinci `30s` polling
- Etki:
  - Gereksiz ağ isteği + state güncellemesi + wake-up maliyeti.

### F) Client-side ffmpeg.wasm/video optimizasyon akışları
- Kanıt:
  - `app/(app)/create/moment/page.tsx:421-426`
  - `app/(app)/create/video/page.tsx:317-322`
  - `lib/videoOptimize.ts:102-126` (`@ffmpeg/ffmpeg`, CDN core load)
  - `components/modals/VideoTrimModal.tsx:252-261`
- Etki:
  - Büyük dosyalarda CPU/RAM tüketimi ve cihaz ısınması.
  - Android browser tab’inde OOM/kill riski artar.

### G) Çok sayıda client bileşen
- Kanıt: `use client` sayısı **161**
- Etki:
  - Hydration ve JS çalıştırma maliyeti yükselir; düşük cihazda TTI gecikir.

## Medium

### H) Editör/oluşturma autosave interval yükü
- Kanıt:
  - `app/(app)/create/page.tsx:163-199`
  - `app/(app)/create/note/page.tsx:126-162`
- Etki:
  - Uzun edit seanslarında periyodik network + state churn.

### I) RichTextEditor klavye geçişlerinde RAF polling
- Kanıt:
  - `components/RichTextEditor.tsx:181-198`
- Etki:
  - Özellikle Android klavye aç/kapa anlarında ekstra frame maliyeti.

## 4) Android Odaklı CSS Güç Tüketimi Analizi

En pahalı CSS desenleri:

1. **Yüksek blur değerleri** (`blur(40px)`, `blur(24px)`, `blur(150px)`)  
2. **Çoklu backdrop katmanı** (üst üste `backdrop-filter`)  
3. **Sürekli animasyonlar** (`animate-marquee`, spinner/pulse zinciri)

İlgili referanslar:
- `app/globals.css:811-828`
- `app/globals.css:1562-1600`
- `app/globals.css:1710-1728` (mobilde kısmi azaltma var, yeterli değil)
- `components/AmbientLight.tsx:72`

### CSS optimizasyon reçetesi (öneri)

1. Android için varsayılan `ambient-light` **kapalı** başlat.
2. Mobilde blur üst sınırını `8-12px` aralığına çek.
3. `backdrop-filter` yerine mümkün olduğu yerde opak/yarı opak background kullan.
4. `animate-marquee` sadece görünür olduğunda çalışsın; değilse durdur.
5. Düşük güç modu (`prefers-reduced-motion`) algısında animasyonları tamamen kapat.

## 5) Runtime ve Ağ Optimizasyonları

### A) Polling birleştirme
- Sidebar + MobileBottomNav bildirim sayacı tek bir paylaşımlı store veya BroadcastChannel ile beslensin.
- `30s` yerine `visibilitychange` ve kullanıcı aktifken polling yapılmalı.

### B) RAF sadeleştirme
- Video progress güncellemesi her frame yerine `timeupdate` + throttled render yaklaşımına çekilmeli.
- Görünmeyen kartlarda RAF kesin durmalı (`IntersectionObserver` ile).

### C) Modal preload stratejisi
- Tüm modalları preload etmek yerine:
  - Sık kullanılan 2-3 modal preload
  - Kalanlar ilk açılışta lazy import

### D) Medya işleme (ffmpeg)
- Android düşük cihazlarda ffmpeg optimize adımı opsiyonel/arka plana alınmalı.
- Büyük dosyalarda “sunucu tarafı işleme” fallback’i sunulmalı.

## 6) Bundle / Yükleme Stratejisi

Bulgu:
- `.next/static/chunks` içinde 500KB+ seviyesinde büyük ortak chunk var.
- Uygulama genelinde ağır UI yüzeyleri için chunk kırılımı artırılabilir.

Öneri:
1. Yardım merkezi, moderasyon, editör ve medya yüzeylerini daha agresif route-level split et.
2. `ModalsPreload`’ı koşullu hale getir (sadece login sonrası + uygun cihaz).
3. Android düşük RAM için “lite mode” bayrağı ile bazı client modülleri devre dışı bırak.

## 7) Öncelikli Uygulama Planı (14 Gün)

### Gün 1-3 (Hızlı kazanım)
1. Ambient light Android default: `off`
2. `blur/backdrop` yoğunluğunu yarıya indir
3. Çift bildirim polling’i tek kaynağa indir

### Gün 4-7
1. `ModalsPreload` kapsamını 19’dan 3-5 kritik modal’a düşür
2. Video progress RAF’larını görünürlük tabanlı ve throttled hale getir
3. Marquee/continuous animasyonları visibility-based çalıştır

### Gün 8-14
1. ffmpeg akışına cihaz gücü algısı + server fallback ekle
2. Ağır create/video akışları için Android “lite upload path” tanımla
3. Route/chunk bütçesi belirle ve CI kontrolüne al

## 8) Beklenen Etki (Tahmini)

Bu rapordaki kritik + yüksek maddeler uygulandığında (özellikle Android):

- Ortalama scroll akıcılığı: **+15% ila +35%**
- Uzun oturum batarya tüketimi: **-10% ila -25%**
- İlk etkileşim gecikmesi (algısal): **iyileşir**
- Düşük segment cihazlarda frame drop: **belirgin azalır**

## 9) Sonuç

Sistemde performans maliyetinin ana kaynağı tek bir nokta değil; **GPU ağırlıklı görsel efektler + sürekli çalışan runtime döngüleri + erken JS preload** birlikte etki ediyor. Android hızlanması için en hızlı ve en güvenli yol:

1. Ambient/blur sadeleştirme
2. Polling ve RAF döngülerini azaltma
3. Modal/bundle yükünü kademeli ve davranışa göre yükleme

Bu üç hat kapatıldığında uygulama hissedilir şekilde daha hızlı ve daha serin çalışır.
