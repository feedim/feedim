# Feedim UI Denetim Raporu

Tarih: 27 Şubat 2026  
Denetim tipi: Kod tabanlı statik UI/UX taraması (değişiklik uygulanmadı, yalnızca raporlama)

## 1) Kapsam ve Envanter

- Tarama kapsamı: `app/` + `components/` (UI ile ilişkili tüm TS/TSX/CSS yüzeyleri)
- Toplam taranan UI dosyası: `458`
- Toplam UI satır sayısı (app+components ts/tsx/css): `72,088`
- Toplam TS/TSX satır sayısı (repo geneli): `78,868`
- `page.tsx` sayısı: `94`
- `layout.tsx` sayısı: `34`
- Dinamik route sayfası: `8`
- Modal bileşen sayısı: `31`

UI yoğunluğu yüksek dosyalar (örnek):
- `components/RichTextEditor.tsx` (`1,978` satır)
- `app/globals.css` (`1,778` satır)
- `app/(app)/moderation/page.tsx` (`1,299` satır)
- `components/VideoPlayer.tsx` (`1,182` satır)
- `app/(app)/create/moment/page.tsx` (`1,133` satır)

## 2) Ölçülebilir Bulgular (Koddan Çıkan Metrikler)

- `<img>` kullanımı: `117`
- `next/image` import: `0`
- Boş `alt=""` kullanımı: `88`
- `aria-label` kullanımı: `118`
- `text-[0.xxrem]` özel boyut kullanımı: `650`
- `<=0.75rem` küçük tipografi kullanımı: `289`
- Sabit `w-[..px] / h-[..px]` kullanımı: `251`
- `text-text-muted` kullanım adedi: `1125`
- Hardcoded `z-[...]` kullanımı: `57`
- Özel animasyon / animation kullanım adedi: `117`

## 3) Kritik UI/UX Riskleri (Öncelik Sırası)

### Critical

1. Klavye odak görünürlüğü globalde kapatılmış
- Kanıt: `app/globals.css:738-741`
- Etki: Klavye ile gezen kullanıcılar aktif odak noktasını göremiyor; erişilebilirlik ve kullanılabilirlikte ciddi düşüş.

2. Modal erişilebilirlik semantiği eksik (`role="dialog"`, `aria-modal`, odak tuzağı)
- Kanıt: `components/modals/Modal.tsx:472-520` (modal root var, ancak dialog semantiği ve focus trap yapısı yok)
- Etki: Ekran okuyucu ve klavye kullanıcıları için modal içinde yön kaybı, yanlış odak akışı.

### High

1. Görsel performans ve erişilebilirlik: `next/image` hiç kullanılmıyor
- Kanıt: metrikte `next/image import: 0`, `<img>: 117`
- Etki: LCP/CLS ve bant kullanımında gereksiz maliyet; responsive image optimizasyonu yok.

2. Boş `alt` oranı yüksek
- Kanıt: `88` adet boş `alt`
- Etki: Ekran okuyucu için içerik kaybı (dekoratif olmayan görsellerde ciddi problem).

3. Aşırı küçük tipografi
- Kanıt örnekleri:
  - `components/PostCard.tsx:267,271` (`text-[0.62rem]`)
  - `components/PostCard.tsx:53` (`text-[0.7rem]`)
  - `app/landing/page.tsx:247` (`text-[0.68rem]`)
  - `components/MobileBottomNav.tsx:117` (`text-[8px]`)
- Etki: Okunabilirlik ve dokunmatik kullanım kalitesi düşüyor.

4. Navigasyon tanımı birden çok yerde kopyalı
- Kanıt:
  - `components/Sidebar.tsx:27-32,85-94`
  - `components/MobileBottomNav.tsx:36-48`
  - `components/ColumnHeader.tsx:50-62`
- Etki: Tutarsız menü davranışı riski, bakım maliyeti ve hataya açıklık artıyor.

5. Bilinçli gecikme (min delay) ile yapay yavaşlık
- Kanıt:
  - `app/(auth)/login/page.tsx:140-143`
  - `app/(auth)/register/page.tsx:144-147`
  - `app/onboarding/page.tsx:153-156`
- Etki: Algılanan performans ve dönüşüm (özellikle auth) olumsuz etkilenir.

### Medium

1. Ayarlar bilgi mimarisi tek sayfada aşırı yoğun
- Kanıt: `app/(app)/settings/page.tsx` `718` satır, çok sayıda bölüm (`300+` satırlarda ardışık bloklar)
- Etki: Tarama süresi uzar, kullanıcı doğru ayarı bulmakta zorlanır.

2. Tüm görsellere genel pointer imleci verilmesi
- Kanıt: `app/globals.css:1776-1778`
- Etki: Tıklanabilirlik affordance’ı yanlış sinyal verir.

3. İçerik sekmeleri semantik tab yapısı kullanmıyor
- Kanıt: `components/FeedTabs.tsx:37-55` (button var, `role="tablist"/"tab"` yok)
- Etki: Erişilebilirlikte eksik bağlam.

4. Sabit piksel yoğunluğu yüksek
- Kanıt: `251` adet sabit `px` boyut sınıfı
- Etki: Bazı breakpoint’lerde sıkışma/ölçek dengesizliği riski.

## 4) 10 Modüllü Tam Kapsam UI Tarama Planı

Bu plan, sistemin düzenli aralıklarla tekrar taranması için önerilen standarttır.

1. Navigasyon ve Bilgi Mimarisi
- Sidebar, mobile nav, header menülerinin tek kaynakta birleştirilmesi.
- Route-label eşleşmesi, aktif durum ve geçiş tutarlılığı kontrolü.

2. Erişilebilirlik (WCAG 2.2 AA)
- Fokus görünürlüğü, tab sırası, modal dialog semantiği, ekran okuyucu etiketleri.
- Form label/description ilişkileri, hata mesajı anonsları.

3. Tipografi ve Okunabilirlik
- Minimum body text tabanı (`>=0.875rem`) ve metadata alt sınırı (`>=0.75rem`).
- Küçük metinlerin kontrast ve satır yüksekliği testleri.

4. Renk, Kontrast ve Tema
- Light/dark/dim modlarında kontrast haritası.
- `text-text-muted` yoğun kullanılan alanların AA doğrulaması.

5. Görsel ve Medya Performansı
- `next/image` dönüşüm planı, responsive image kaynakları.
- Avatar/fallback görsellerinde erişilebilir alternatif metin standardı.

6. Form ve Onboarding UX
- Auth/onboarding adımlarında bekleme süreleri ve drop-off noktaları.
- Inline doğrulama, hata geri bildirimi ve başarı geri bildirimi standardı.

7. İçerik Üretim Deneyimi
- Create akışında 2 adımın bilişsel yük analizi.
- Editör toolbar erişilebilirliği, mobil klavye etkileşimi, autosave şeffaflığı.

8. Bildirim ve Etkileşim Yüzeyleri
- Bildirim listesi yoğunluğu, gruplama, eylem netliği.
- Rozet/badge okunabilirliği (özellikle küçük ekranlarda).

9. Hareket/Motion Sistemi
- Animasyon tutarlılığı, reduced-motion kapsamı, giriş/çıkış hızları.
- Kritik eylemlerde motion yerine anlık geri bildirim fallback’i.

10. Ölçümleme ve UI Kalite Kapısı
- Her release öncesi UI checklist + metrik eşiği.
- LCP/INP/CLS, form tamamlama oranı, onboarding adım terk oranı takibi.

## 5) Öncelikli İyileştirme Backlog’u

### Faz 1 (0-7 gün)

1. Global fokus görünürlüğünü geri getir (`app/globals.css:738-741`)
2. Modal köküne erişilebilir dialog semantiği ekle (`components/modals/Modal.tsx`)
3. En kritik küçük yazıları normalize et (`PostCard`, `landing`, `mobile badge`)
4. `img` için kullanım standardı çıkar: dekoratif/dolgu görseller hariç anlamlı `alt`

### Faz 2 (1-3 hafta)

1. `next/image` geçiş planı (önce feed ve auth yüzeyleri)
2. Navigasyon tanımlarını merkezi bir konfigürasyona taşı
3. Settings IA sadeleştirme: bölüm kartlarını alt ekranlara daha net dağıt
4. Auth/onboarding yapay bekleme stratejisini yeniden tasarla

### Faz 3 (3-6 hafta)

1. Tasarım token standardı: font-size/spacing/z-index ölçeklerini kilitle
2. UI lint kuralları: minimum text size, odak görünürlüğü, aria kuralları
3. Görsel regresyon ve erişilebilirlik CI kontrolleri (axe + screenshot diff)

## 6) Instagram-Standart Seviyesine Yaklaşmak İçin Hedef KPI Seti

- Auth başarı oranı: +`%8` ila `+%15`
- Onboarding tamamlanma: +`%10` ila `+%20`
- İlk içerik üretim süresi: `-%20`
- Mobil bildirim ekranında etkileşim: +`%12`
- A11y kritik ihlal sayısı: `0`
- Core Web Vitals (LCP/INP/CLS): release başına düşen trend

## 7) Sonuç

Feedim’in UI altyapısı kapsamlı ve güçlü bir temel üzerine kurulmuş; ancak erişilebilirlik, tipografi ölçeği, navigasyon tekilleştirme ve algılanan performans alanlarında sistemik iyileştirme ihtiyacı var. Bu rapordaki kritik ve yüksek öncelikli maddeler kapatıldığında ürün, hem güven hem de kullanılabilirlik açısından belirgin şekilde daha üst seviyeye taşınır.
