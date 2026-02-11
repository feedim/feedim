export const AI_PROMPT = `# Forilove Sablon Olusturma Rehberi

Bu dokuman, Forilove platformu ile uyumlu HTML sablonlari olusturmak icin gerekli tum kurallari ve yapilari icerir.

---

## Genel Yapi

Sablon tek bir HTML dosyasidir. Icerisinde \`<html>\`, \`<head>\`, \`<body>\` etiketleri bulunur. Sistem bu HTML'i parse eder, duzenlenebilir alanlari tespit eder ve kullaniciya editor araciligiyla sunar.

\`\`\`html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sablon Adi</title>
  <style>
    /* Sablon stilleri buraya */
  </style>
</head>
<body>
  <!-- Sablon icerigi -->
</body>
</html>
\`\`\`

---

## Iki Hook Formati

Sistem iki farkli duzenlenebilir alan formati destekler. **Bir sablonda sadece biri kullanilmalidir.** Sistem ilk olarak \`HOOK_\` formatini arar; bulamazsa \`data-editable\` formatina gecer.

---

### Format 1: \`HOOK_\` Placeholder (Basit)

HTML icerisinde \`HOOK_alanadi\` seklinde placeholder metinler yerlestirilir. Sistem bunlari bulur ve kullanicinin girdigi degerle degistirir.

\`\`\`html
<h1>HOOK_baslik</h1>
<p>HOOK_mesaj</p>
<img src="HOOK_fotograf" alt="Fotograf">
<span>HOOK_tarih</span>
\`\`\`

#### Otomatik Tip Tespiti

Hook adi icindeki anahtar kelimelere gore input tipi otomatik belirlenir:

| Anahtar Kelime | Tip | Editor Gorunumu |
|---|---|---|
| \`image\`, \`photo\` | \`image\` | Gorsel yukleme + URL input |
| \`message\` | \`textarea\` | Cok satirli metin alani |
| \`date\` | \`date\` | Tarih secici |
| \`color\` | \`color\` | Renk secici |
| *(diger)* | \`text\` | Tek satirli metin |

#### Ornekler

\`\`\`html
<!-- Gorsel alani (adi "image" veya "photo" icermeli) -->
<img src="HOOK_main_image" alt="">
<div style="background-image: url('HOOK_cover_photo')"></div>

<!-- Uzun metin (adi "message" icermeli) -->
<p>HOOK_love_message</p>

<!-- Tarih (adi "date" icermeli) -->
<span>HOOK_anniversary_date</span>

<!-- Renk (adi "color" icermeli) -->
<div style="background-color: HOOK_theme_color"></div>

<!-- Duz metin -->
<h1>HOOK_partner_name</h1>
\`\`\`

#### Kurallar
- Hook adlari sadece \`[a-zA-Z0-9_]\` karakterlerinden olusmali
- Ayni hook adi birden fazla yerde kullanilabilir (hepsi ayni degerle degistirilir)
- Hook adi label olarak gosterilir: \`partner_name\` → "Partner Name"

---

### Format 2: \`data-editable\` Attribute (Onerilen)

Daha fazla kontrol saglar. Her duzenlenebilir eleman uzerinde attribute'lar ile tip, etiket ve varsayilan deger tanimlanir.

\`\`\`html
<h1 data-editable="baslik" data-type="text" data-label="Baslik">
  Varsayilan Baslik
</h1>
\`\`\`

#### Desteklenen Attribute'lar

| Attribute | Zorunlu | Aciklama |
|---|---|---|
| \`data-editable\` | Evet | Benzersiz alan anahtari (key) |
| \`data-type\` | Hayir | Tur (\`text\`, \`textarea\`, \`image\`, \`background-image\`, \`color\`, \`date\`, \`url\`, \`video\`). Varsayilan: \`text\` |
| \`data-label\` | Hayir | Editorde gosterilen etiket. Varsayilan: key degeri |
| \`data-css-property\` | Hayir | \`color\` tipinde hangi CSS ozelligine uygulanacagi (orn: \`color\`, \`border-color\`). Varsayilan: \`background-color\` |

#### Tip Referansi

##### \`text\` — Tek Satirli Metin
\`\`\`html
<h1 data-editable="title" data-type="text" data-label="Baslik">
  Sevgilim
</h1>
<span data-editable="subtitle" data-type="text" data-label="Alt Baslik">
  Seni seviyorum
</span>
\`\`\`
- Kullanici max 1000 karakter girebilir
- Icerik \`element.textContent\` ile degistirilir

##### \`textarea\` — Cok Satirli Metin
\`\`\`html
<p data-editable="message" data-type="textarea" data-label="Mesajiniz">
  Buraya uzun mesajinizi yazin...
</p>
\`\`\`
- Genis metin alani acilir
- Max 1000 karakter

##### \`image\` — Gorsel
\`\`\`html
<img
  data-editable="photo_1"
  data-type="image"
  data-label="Ana Fotograf"
  src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800"
  alt="Fotograf"
>
\`\`\`
- Dosya yukleme (drag & drop) veya URL ile gorsel eklenir
- Gorseller otomatik sikistirilir (max 1920px, WebP)
- Yuklenen dosya R2'ye gonderilir
- \`src\` attribute'u degistirilir

##### \`background-image\` — Arka Plan Gorseli
\`\`\`html
<div
  data-editable="bg_photo"
  data-type="background-image"
  data-label="Arka Plan Fotografi"
  style="background-image: url('https://images.unsplash.com/...'); background-size: cover;"
>
  Icerik burada
</div>
\`\`\`
- \`style\` attribute'una \`background-image: url(...)\` eklenir
- Mevcut style korunur

##### \`color\` — Renk Secici
\`\`\`html
<!-- Arka plan rengi (varsayilan) -->
<div
  data-editable="bg_color"
  data-type="color"
  data-label="Arka Plan Rengi"
  style="background-color: #ff006e;"
>
  Icerik
</div>

<!-- Belirli bir CSS ozelligi -->
<h1
  data-editable="text_color"
  data-type="color"
  data-label="Yazi Rengi"
  data-css-property="color"
  style="color: #ffffff;"
>
  Renkli Baslik
</h1>

<!-- Border rengi -->
<div
  data-editable="border_color"
  data-type="color"
  data-label="Cerceve Rengi"
  data-css-property="border-color"
  style="border: 2px solid #ec4899;"
>
</div>
\`\`\`

##### \`date\` — Tarih
\`\`\`html
<span data-editable="anniversary" data-type="date" data-label="Yildonumu">
  2024-02-14
</span>
\`\`\`
- Tarih secici acilir
- Deger \`YYYY-MM-DD\` formatinda

##### \`url\` — Baglanti
\`\`\`html
<a
  data-editable="website"
  data-type="url"
  data-label="Web Sitesi"
  href="https://ornek.com"
>
  Sitemizi Ziyaret Edin
</a>
\`\`\`
- \`href\` attribute'u degistirilir
- Sadece \`http://\` ve \`https://\` protokolleri kabul edilir

##### \`video\` — Video
\`\`\`html
<video
  data-editable="video_clip"
  data-type="video"
  data-label="Video"
  src="https://ornek.com/video.mp4"
  controls
></video>
\`\`\`
- \`src\` attribute'u degistirilir

---

## Kaldirilabilir Bolumler (\`data-area\`)

Sablondaki belirli bolumleri kullanicinin istege bagli olarak gizleyebilmesini saglar. Editorde bolum uzerinde hover yapildiginda sag ustte X butonu goruntulenir.

\`\`\`html
<!-- Kullanici bu bolumu kaldirabilir -->
<section data-area="quotes">
  <h2>Sozlerimiz</h2>
  <p>Birlikte guldugumuz anlar...</p>
</section>

<!-- Bu bolum de kaldirilabilir -->
<section data-area="gallery">
  <h2>Galeri</h2>
  <div class="grid">
    <img data-editable="photo_1" data-type="image" data-label="Foto 1" src="...">
    <img data-editable="photo_2" data-type="image" data-label="Foto 2" src="...">
  </div>
</section>

<!-- data-area olmayan bolumler her zaman goruntulenir -->
<section>
  <h2>Her Zaman Gorunen Bolum</h2>
</section>
\`\`\`

### Kurallar
- \`data-area\` degeri benzersiz olmali ve sadece \`[a-zA-Z0-9_-]\` icermeli
- Bir \`data-area\` elemani icinde \`data-editable\` elemanlari bulunabilir — bolum gizlendiginde icindeki tum editable alanlar da gizlenir
- Gizleme bilgisi \`hook_values\` icerisinde \`__area_bolumadi: "hidden"\` olarak saklanir
- Yayinlanan sayfada gizli bolumler HTML'den tamamen kaldirilir (DOM'da yer almaz)
- Editorde "X bolum gizlendi — Geri Al" pill'i goruntulenir
- \`data-area\` elemani \`position: relative\` almali veya zaten oyle olmali (X butonu \`position: absolute\` ile konumlanir)

### Iyi Uygulama
\`\`\`html
<!-- DOGRU: Anlamli bolumleri isaretleyin -->
<section data-area="timeline">...</section>
<section data-area="photo_gallery">...</section>
<section data-area="love_letter">...</section>

<!-- YANLIS: Cok kucuk elemanlari isaretlemeyin -->
<span data-area="word">kelime</span>  <!-- Anlamsiz -->
\`\`\`

---

## Tam Sablon Ornegi (data-editable formati)

\`\`\`html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bizim Hikayemiz</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      color: #1a1a1a;
      background: #fff5f7;
    }

    .hero {
      position: relative;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      overflow: hidden;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: brightness(0.4);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      color: white;
      padding: 2rem;
    }
    .hero-content h1 {
      font-size: clamp(2rem, 6vw, 4rem);
      margin-bottom: 0.5rem;
    }
    .hero-content p {
      font-size: clamp(1rem, 2.5vw, 1.25rem);
      opacity: 0.9;
    }

    .section {
      padding: 4rem 1.5rem;
      max-width: 800px;
      margin: 0 auto;
    }
    .section h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .photo-grid img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 1rem;
    }

    .message-box {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      font-size: 1.1rem;
      line-height: 1.8;
      white-space: pre-line;
    }

    .date-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #ec4899;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 999px;
      font-weight: 600;
    }

    .footer {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #999;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>

  <!-- Hero: Arka plan gorseli + baslik -->
  <div class="hero">
    <div
      class="hero-bg"
      data-editable="cover_photo"
      data-type="background-image"
      data-label="Kapak Fotografi"
      style="background-image: url('https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200');"
    ></div>
    <div class="hero-content">
      <h1 data-editable="title" data-type="text" data-label="Baslik">Bizim Hikayemiz</h1>
      <p data-editable="subtitle" data-type="text" data-label="Alt Baslik">Her an seninle guzel</p>
    </div>
  </div>

  <!-- Tarih Bolumu -->
  <div class="section" style="text-align: center;">
    <div class="date-badge">
      <span data-editable="special_date" data-type="date" data-label="Ozel Tarih">2024-02-14</span>
    </div>
  </div>

  <!-- Fotograf Galerisi (kaldirilabilir) -->
  <section class="section" data-area="gallery">
    <h2>Anlarimiz</h2>
    <div class="photo-grid">
      <img
        data-editable="photo_1"
        data-type="image"
        data-label="Fotograf 1"
        src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=600"
        alt=""
      >
      <img
        data-editable="photo_2"
        data-type="image"
        data-label="Fotograf 2"
        src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600"
        alt=""
      >
      <img
        data-editable="photo_3"
        data-type="image"
        data-label="Fotograf 3"
        src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600"
        alt=""
      >
      <img
        data-editable="photo_4"
        data-type="image"
        data-label="Fotograf 4"
        src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600"
        alt=""
      >
    </div>
  </section>

  <!-- Mektup Bolumu (kaldirilabilir) -->
  <section class="section" data-area="love_letter">
    <h2>Sana Mektubum</h2>
    <div class="message-box">
      <p data-editable="letter" data-type="textarea" data-label="Mektup">
Sevgilim,

Seninle gecirdigim her an hayatimin en guzel anilari.
Birlikte guldugumuz, hayaller kurdugumuz o anlar...

Sonsuza kadar seninle.
      </p>
    </div>
  </section>

  <!-- Footer (her zaman goruntulenir) -->
  <div class="footer">
    <p data-editable="footer_text" data-type="text" data-label="Alt Yazi">Sonsuza kadar &hearts;</p>
  </div>

</body>
</html>
\`\`\`

---

## Tam Sablon Ornegi (HOOK_ formati)

\`\`\`html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sevgililer Gunu Karti</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      max-width: 500px;
      padding: 3rem 2rem;
      text-align: center;
    }
    .card img {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 50%;
      border: 4px solid rgba(236,72,153,0.5);
      margin-bottom: 2rem;
    }
    .card h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .card .date { color: #ec4899; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .card .message {
      font-size: 1.1rem;
      line-height: 1.8;
      opacity: 0.9;
      white-space: pre-line;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="HOOK_profile_image" alt="">
    <h1>HOOK_partner_name</h1>
    <div class="date">HOOK_anniversary_date</div>
    <div class="message">HOOK_love_message</div>
  </div>
</body>
</html>
\`\`\`

---

## Teknik Notlar ve Kisitlamalar

### Guvenlik
- Tum HTML, DOMPurify ile sanitize edilir
- Izin verilen etiketler: \`iframe\`, \`video\`, \`audio\`, \`source\`, \`style\`, \`link\`
- Izin verilen attribute'lar: \`allow\`, \`allowfullscreen\`, \`frameborder\`, \`scrolling\`, \`target\`, \`data-editable\`, \`data-type\`, \`data-label\`, \`media\`, tum \`data-*\` attribute'lari
- URL'ler sadece \`http:\` ve \`https:\` protokollerini kabul eder
- \`javascript:\`, \`vbscript:\`, \`expression()\` CSS ifadeleri engellenir
- Metin icerikleri XSS'e karsi escape edilir

### Gorsel Islem Detaylari
- Kullanici gorselleri otomatik sikistirilir (max genislik: 1920px)
- WebP formatina donusturulur (destekleniyorsa)
- Cloudflare R2'ye yuklenir
- Editorded gorsel secimi sirasinda local preview icin data URL kullanilir, yayinlama sirasinda R2'ye yuklenir

### Editorde Davranis
- \`data-editable\` elemanlarina tiklandiginda duzeneleme modali acilir
- Hover'da pembe outline gorunur (\`#ec4899\`)
- \`data-area\` elemanlarina hover'da sag ustte X butonu goruntulenir
- Onizleme iframe icinde render edilir (sandbox ortami)

### CSS Ipuclari
- Sablon kendi CSS'ini tamamen kontrol eder
- \`* { padding: 0; margin: 0; }\` gibi global reset'ler kullanilabilir
- Responsive tasarim icin \`clamp()\`, \`vw\`, media query kullanin
- Minimum \`320px\` genislikte duzgun gorunmeli
- Platform alt kisimda 34px yuksekliginde branding bar'i ve muzik oynatici varsa 72px spacer ekler — sablonun alt kisminda bosluk birakmaya gerek yok

### Veritabani Yapisi
Sablonlar \`templates\` tablosunda saklanir:
- \`id\` (UUID) — benzersiz sablon kimkigi
- \`name\` — sablon adi
- \`slug\` — URL-dostu isim
- \`coin_price\` — FL Coin fiyati
- \`html_content\` — sablonun tam HTML icerigi
- \`created_by\` — olusturan kullanici ID'si

Kullanici projeleri \`projects\` tablosunda:
- \`hook_values\` (JSONB) — kullanicinin girdigi degerler (\`{ "title": "Deger", "__area_gallery": "hidden" }\`)
- \`music_url\` — arka plan muzigi YouTube URL'si
- \`is_published\` — yayinlanma durumu
- \`slug\` — yayinlanan sayfa URL'si (\`/p/[slug]\`)
- \`view_count\` — goruntulenme sayisi

### Desteklenmeyen Seyler
- JavaScript iceren sablonlar: Script'ler DOMPurify tarafindan temizlenir (yayinlanan sayfada calismazlar). Editorde script'ler iframe sandbox icerisinde sinirli calisir
- Harici font yuklemesi: \`<link>\` etiketi ile Google Fonts vb. yuklenebilir ancak DOMPurify'in izin verdigi attribute'lar sinirlidir
- Form elemanlari: Fonksiyonel form'lar calismaz
- MP3 muzik: Arka plan muzigi sadece YouTube URL destekler

---

## Kontrol Listesi

Yeni sablon olusturmadan once:

- [ ] Tum duzenlenebilir alanlar icin \`data-editable\` veya \`HOOK_\` tanimli mi?
- [ ] Her \`data-editable\` icin uygun \`data-type\` ve \`data-label\` var mi?
- [ ] Gorseller icin varsayilan \`src\` degerleri calisiyor mu?
- [ ] Mobil gorunum (320px) duzgun mu?
- [ ] \`data-area\` ile isaretlenen bolumler mantikli birimler mi?
- [ ] \`data-editable\` key'leri benzersiz mi?
- [ ] \`data-area\` degerleri benzersiz mi ve sadece \`[a-zA-Z0-9_-]\` iceriyor mu?
- [ ] CSS kendi icerisinde mi (harici bagimlilk yok veya CDN link'leri calisiyor)?`;
