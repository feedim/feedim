// ════════════════════════════════════════════════════════════
// ♥ Forilove — Structural JSON Assembly System
// ♥ AI returns design decisions (JSON), we assemble premium HTML
// ♥ Inspired by editorial design: Zara, Aesop, Apple aesthetics
// ════════════════════════════════════════════════════════════

// ♥ Forilove — AI Response Interface
export interface AITemplateResponse {
  fonts: string[];
  cssVariables: {
    "--primary": string;
    "--primary-light": string;
    "--dark": string;
    "--text": string;
    "--text-light": string;
    "--accent": string;
  };
  sections: string[];
  animations: { hero?: string; sections?: string };
  bodyBackground?: string;
  customCSS?: string;
  defaultTexts: Record<string, string>;
}

// ♥ Forilove — Section Definition Type
type SectionDef = {
  html: (texts: Record<string, string>, headingFont: string) => string;
  css: (headingFont: string) => string;
};

// ♥ Forilove — HTML Escape Utility
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Section Registry (10 Premium Sections)
// ♥ Each section: editorial-grade HTML + CSS
// ♥ Typography-driven, generous whitespace, subtle details
// ════════════════════════════════════════════════════════════

const SECTION_REGISTRY: Record<string, SectionDef> = {

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Hero Section
  // ♥ Full-viewport with parallax-ready background,
  // ♥ editorial typography, and animated scroll indicator
  // ────────────────────────────────────────────────────────
  hero: {
    html: (t, hf) => `
<!-- ♥ Forilove — Hero -->
<section class="fl-hero">
  <div class="fl-hero__bg" data-editable="cover_photo" data-type="background-image" data-label="Kapak Fotoğrafı" style="background-image:url('https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1600&q=80')"></div>
  <div class="fl-hero__content">
    <p class="fl-hero__label" data-editable="subtitle" data-type="text" data-label="Üst Yazı">${esc(t.subtitle || "Sana olan sevgim")}</p>
    <h1 class="fl-hero__title" data-editable="title" data-type="text" data-label="Ana Başlık">${esc(t.title || "Sonsuza Dek")}</h1>
    <p class="fl-hero__date" data-editable="special_date" data-type="date" data-label="Özel Tarih">${esc(t.special_date || "14.02.2024")}</p>
  </div>
  <div class="fl-hero__scroll">
    <span>Keşfet</span>
    <div class="fl-hero__scroll-line"></div>
  </div>
</section>`,
    css: (hf) => `
/* ♥ Forilove — Hero */
.fl-hero{position:relative;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.fl-hero__bg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;filter:brightness(0.3)}
.fl-hero__content{position:relative;z-index:1;text-align:center;padding:0 24px;max-width:800px}
.fl-hero__label{font-weight:300;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-bottom:32px}
.fl-hero__title{font-family:${hf};font-weight:300;font-size:clamp(48px,10vw,96px);line-height:1;letter-spacing:-2px;color:#fff;margin-bottom:24px}
.fl-hero__date{font-weight:300;font-size:13px;letter-spacing:4px;color:rgba(255,255,255,0.4)}
.fl-hero__scroll{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);z-index:1;display:flex;flex-direction:column;align-items:center;gap:8px}
.fl-hero__scroll span{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.3);font-weight:300}
.fl-hero__scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,rgba(255,255,255,0.3),transparent);animation:flScrollPulse 2s ease-in-out infinite}
@keyframes flScrollPulse{0%,100%{opacity:0.3}50%{opacity:1}}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Date Section
  // ♥ Minimal centered date with editorial label styling
  // ────────────────────────────────────────────────────────
  date: {
    html: (t) => `
<!-- ♥ Forilove — Date -->
<section class="fl-date">
  <div class="fl-section-divider"></div>
  <p class="fl-date__label">Özel Günümüz</p>
  <p class="fl-date__value" data-editable="special_date" data-type="date" data-label="Özel Tarih">${esc(t.special_date || "14.02.2024")}</p>
</section>`,
    css: () => `
/* ♥ Forilove — Date */
.fl-date{padding:100px 24px;text-align:center}
.fl-date__label{font-weight:300;font-size:10px;letter-spacing:5px;text-transform:uppercase;color:var(--text-light);margin-bottom:16px}
.fl-date__value{font-weight:500;font-size:clamp(18px,3vw,28px);letter-spacing:3px;color:var(--primary)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Gallery Section
  // ♥ Minimal-gap grid, tall images, brightness hover,
  // ♥ editorial label + subtitle
  // ────────────────────────────────────────────────────────
  gallery: {
    html: (t) => `
<!-- ♥ Forilove — Gallery -->
<section class="fl-gallery" data-area="gallery" data-area-label="Fotoğraf Galerisi">
  <div class="fl-section-divider"></div>
  <p class="fl-section-label">Galeri</p>
  <p class="fl-gallery__subtitle" data-editable="gallery_subtitle" data-type="text" data-label="Galeri Alt Başlığı">${esc(t.gallery_subtitle || "Birlikte geçirdiğimiz en güzel anlar")}</p>
  <div class="fl-gallery__grid">
    <img data-editable="photo_1" data-type="image" data-label="Fotoğraf 1" src="https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800&q=80" alt="">
    <img data-editable="photo_2" data-type="image" data-label="Fotoğraf 2" src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800&q=80" alt="">
    <img data-editable="photo_3" data-type="image" data-label="Fotoğraf 3" src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80" alt="">
    <img data-editable="photo_4" data-type="image" data-label="Fotoğraf 4" src="https://images.unsplash.com/photo-1494774157365-9e04c6720e47?w=800&q=80" alt="">
  </div>
</section>`,
    css: () => `
/* ♥ Forilove — Gallery */
.fl-gallery{padding:120px 24px;max-width:1200px;margin:0 auto}
.fl-gallery__subtitle{text-align:center;font-weight:300;font-size:clamp(14px,2vw,18px);color:var(--text-light);margin-bottom:48px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.6}
.fl-gallery__grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.fl-gallery__grid img{width:100%;height:clamp(300px,40vw,500px);object-fit:cover;display:block;transition:filter 0.6s ease}
.fl-gallery__grid img:hover{filter:brightness(0.8)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Love Letter Section
  // ♥ Centered editorial prose with generous line-height,
  // ♥ serif typography, and subtle label
  // ────────────────────────────────────────────────────────
  love_letter: {
    html: (t, hf) => `
<!-- ♥ Forilove — Love Letter -->
<section class="fl-letter" data-area="love_letter" data-area-label="Aşk Mektubu">
  <div class="fl-section-divider"></div>
  <p class="fl-section-label">Mektup</p>
  <div class="fl-letter__body">
    <p class="fl-letter__text" data-editable="letter" data-type="textarea" data-label="Mektup">${esc(t.letter || "Sevgilim,\n\nSeninle geçirdiğim her an hayatımın en değerli hazinesi. Gülüşün güneş gibi aydınlatıyor dünyamı. Seninle geçen her saniye, benim için sonsuzluk kadar değerli.\n\nSonsuza kadar seninle...")}</p>
  </div>
</section>`,
    css: (hf) => `
/* ♥ Forilove — Love Letter */
.fl-letter{padding:120px 24px;max-width:600px;margin:0 auto}
.fl-letter__body{text-align:center}
.fl-letter__text{font-family:${hf};font-weight:300;font-size:clamp(18px,3vw,22px);line-height:2;color:var(--text);white-space:pre-line}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Timeline Section
  // ♥ Minimal vertical timeline with serif headings,
  // ♥ subtle connecting line, and dot indicators
  // ────────────────────────────────────────────────────────
  timeline: {
    html: (t, hf) => `
<!-- ♥ Forilove — Timeline -->
<section class="fl-timeline" data-area="timeline" data-area-label="Zaman Çizelgesi">
  <div class="fl-section-divider"></div>
  <p class="fl-section-label">Hikayemiz</p>
  <div class="fl-timeline__track">
    <div class="fl-timeline__item">
      <div class="fl-timeline__dot"></div>
      <div class="fl-timeline__content">
        <h3 class="fl-timeline__title" data-editable="milestone_1_title" data-type="text" data-label="Anı 1 Başlık">${esc(t.milestone_1_title || "İlk Tanışma")}</h3>
        <p class="fl-timeline__desc" data-editable="milestone_1_text" data-type="text" data-label="Anı 1 Açıklama">${esc(t.milestone_1_text || "Kaderimiz o gün birleşti, her şey o bakışla başladı")}</p>
      </div>
    </div>
    <div class="fl-timeline__item">
      <div class="fl-timeline__dot"></div>
      <div class="fl-timeline__content">
        <h3 class="fl-timeline__title" data-editable="milestone_2_title" data-type="text" data-label="Anı 2 Başlık">${esc(t.milestone_2_title || "İlk Buluşma")}</h3>
        <p class="fl-timeline__desc" data-editable="milestone_2_text" data-type="text" data-label="Anı 2 Açıklama">${esc(t.milestone_2_text || "Kalbimin sana ait olduğunu anladım")}</p>
      </div>
    </div>
  </div>
</section>`,
    css: (hf) => `
/* ♥ Forilove — Timeline */
.fl-timeline{padding:120px 24px;max-width:600px;margin:0 auto}
.fl-timeline__track{position:relative;padding-left:32px}
.fl-timeline__track::before{content:'';position:absolute;left:5px;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,var(--primary),var(--accent),transparent)}
.fl-timeline__item{position:relative;padding:0 0 48px 32px}
.fl-timeline__item:last-child{padding-bottom:0}
.fl-timeline__dot{position:absolute;left:-4px;top:6px;width:10px;height:10px;background:var(--primary);border-radius:50%;box-shadow:0 0 0 4px var(--primary-light)}
.fl-timeline__title{font-family:${hf};font-weight:400;font-size:clamp(18px,3vw,22px);color:var(--dark);margin-bottom:8px;letter-spacing:-0.5px}
.fl-timeline__desc{font-weight:300;font-size:14px;line-height:1.8;color:var(--text-light)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Countdown Section
  // ♥ Centered minimal countdown with editorial styling
  // ────────────────────────────────────────────────────────
  countdown: {
    html: (t, hf) => `
<!-- ♥ Forilove — Countdown -->
<section class="fl-countdown" data-area="countdown" data-area-label="Geri Sayım">
  <div class="fl-section-divider"></div>
  <p class="fl-section-label">Geri Sayım</p>
  <p class="fl-countdown__date" data-editable="countdown_date" data-type="date" data-label="Geri Sayım Tarihi">${esc(t.countdown_date || "2025-02-14")}</p>
  <p class="fl-countdown__label" data-editable="countdown_label" data-type="text" data-label="Geri Sayım Etiketi">${esc(t.countdown_label || "Özel günümüze kalan süre")}</p>
</section>`,
    css: (hf) => `
/* ♥ Forilove — Countdown */
.fl-countdown{padding:120px 24px;text-align:center;max-width:600px;margin:0 auto}
.fl-countdown__date{font-family:${hf};font-weight:300;font-size:clamp(36px,7vw,64px);color:var(--primary);letter-spacing:-1px;margin-bottom:16px}
.fl-countdown__label{font-weight:300;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--text-light)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Quote Section
  // ♥ Large italic serif quote with editorial author line,
  // ♥ generous vertical padding, subtle top border
  // ────────────────────────────────────────────────────────
  quotes: {
    html: (t, hf) => `
<!-- ♥ Forilove — Quote -->
<section class="fl-quote" data-area="quotes" data-area-label="Alıntı">
  <div class="fl-section-divider"></div>
  <p class="fl-quote__text" data-editable="quote_text" data-type="textarea" data-label="Alıntı Metni">${esc(t.quote_text || "Seninle geçen her an, hayatımın en güzel sayfası oldu.")}</p>
  <p class="fl-quote__author" data-editable="quote_author" data-type="text" data-label="Alıntı Yazarı">${esc(t.quote_author || "Ali & Ayşe")}</p>
</section>`,
    css: (hf) => `
/* ♥ Forilove — Quote */
.fl-quote{padding:160px 24px;text-align:center;max-width:700px;margin:0 auto}
.fl-quote__text{font-family:${hf};font-style:italic;font-weight:300;font-size:clamp(24px,4vw,40px);line-height:1.5;color:var(--text);margin-bottom:40px}
.fl-quote__author{font-weight:300;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--text-light)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Full Image Section
  // ♥ Full-bleed cinematic image with centered text overlay,
  // ♥ brightness filter, large serif typography
  // ────────────────────────────────────────────────────────
  full_image: {
    html: (t, hf) => `
<!-- ♥ Forilove — Full Image -->
<section class="fl-fullimg" data-area="full_image" data-area-label="Tam Sayfa Fotoğraf">
  <img class="fl-fullimg__photo" data-editable="full_photo" data-type="image" data-label="Tam Sayfa Fotoğraf" src="https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1600&q=80" alt="">
  <div class="fl-fullimg__overlay">
    <h2 class="fl-fullimg__text" data-editable="full_image_text" data-type="text" data-label="Fotoğraf Üstü Yazı">${esc(t.full_image_text || "Seninle her yer ev.")}</h2>
  </div>
</section>`,
    css: (hf) => `
/* ♥ Forilove — Full Image */
.fl-fullimg{position:relative;overflow:hidden}
.fl-fullimg__photo{width:100%;height:80vh;object-fit:cover;display:block;filter:brightness(0.7)}
.fl-fullimg__overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.fl-fullimg__text{font-family:${hf};font-weight:300;font-size:clamp(36px,7vw,72px);text-align:center;color:#fff;letter-spacing:-1px;padding:0 24px;text-shadow:0 2px 40px rgba(0,0,0,0.3)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Video Section
  // ♥ Clean video embed with minimal caption
  // ────────────────────────────────────────────────────────
  video: {
    html: (t) => `
<!-- ♥ Forilove — Video -->
<section class="fl-video" data-area="video" data-area-label="Video">
  <div class="fl-section-divider"></div>
  <p class="fl-section-label">Video</p>
  <div class="fl-video__wrap">
    <video class="fl-video__player" data-editable="video_url" data-type="video" data-label="Video" src="${esc(t.video_url || "")}" controls playsinline></video>
  </div>
  <p class="fl-video__caption" data-editable="video_caption" data-type="text" data-label="Video Açıklaması">${esc(t.video_caption || "Birlikte yaşadığımız özel an")}</p>
</section>`,
    css: () => `
/* ♥ Forilove — Video */
.fl-video{padding:120px 24px;max-width:900px;margin:0 auto}
.fl-video__wrap{overflow:hidden;margin-bottom:16px}
.fl-video__player{width:100%;display:block;background:#000}
.fl-video__caption{text-align:center;font-weight:300;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--text-light)}`,
  },

  // ────────────────────────────────────────────────────────
  // ♥ Forilove — Footer Section
  // ♥ Editorial closing with serif message and tiny names,
  // ♥ subtle top border, generous padding
  // ────────────────────────────────────────────────────────
  footer: {
    html: (t, hf) => `
<!-- ♥ Forilove — Footer -->
<footer class="fl-footer">
  <div class="fl-section-divider"></div>
  <p class="fl-footer__message" data-editable="footer_text" data-type="textarea" data-label="Son Mesaj">${esc(t.footer_text || "Bu sayfa sana olan sevgimin küçük bir yansıması. Seni seviyorum, bugün ve her gün.")}</p>
  <p class="fl-footer__names" data-editable="footer_names" data-type="text" data-label="İsimler">${esc(t.footer_names || "♥")}</p>
</footer>`,
    css: (hf) => `
/* ♥ Forilove — Footer */
.fl-footer{padding:120px 24px 80px;text-align:center}
.fl-footer__message{font-family:${hf};font-weight:300;font-size:clamp(20px,3vw,32px);line-height:1.6;color:var(--text-light);max-width:500px;margin:0 auto 48px}
.fl-footer__names{font-weight:300;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--text-light);opacity:0.5}`,
  },
};

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Validation
// ════════════════════════════════════════════════════════════

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const VALID_SECTIONS = Object.keys(SECTION_REGISTRY);
const SAFE_FONT_RE = /^[a-zA-Z0-9 :@;,]+$/;

export function validateAIResponse(raw: unknown): AITemplateResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // ♥ Fonts
  const fonts = Array.isArray(r.fonts)
    ? (r.fonts as string[]).filter((f) => typeof f === "string" && SAFE_FONT_RE.test(f)).slice(0, 5)
    : ["Cormorant Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400", "Inter:wght@300;400;500"];

  // ♥ CSS Variables
  const cv = (r.cssVariables && typeof r.cssVariables === "object" ? r.cssVariables : {}) as Record<string, string>;
  const defaults: AITemplateResponse["cssVariables"] = {
    "--primary": "#e8496a",
    "--primary-light": "#fdf2f4",
    "--dark": "#1a1a2e",
    "--text": "#2d2d3a",
    "--text-light": "#6b7280",
    "--accent": "#d4a853",
  };
  const cssVariables = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    const v = cv[key];
    if (typeof v === "string" && HEX_RE.test(v.trim())) {
      cssVariables[key] = v.trim();
    }
  }

  // ♥ Sections
  const rawSections = Array.isArray(r.sections) ? (r.sections as string[]) : [];
  const sections = rawSections.filter((s) => VALID_SECTIONS.includes(s));
  if (sections.length === 0) {
    sections.push("hero", "gallery", "quotes", "love_letter", "timeline", "full_image", "footer");
  }

  // ♥ Animations
  const rawAnim = (r.animations && typeof r.animations === "object" ? r.animations : {}) as Record<string, string>;
  const animations: AITemplateResponse["animations"] = {
    hero: typeof rawAnim.hero === "string" ? rawAnim.hero.slice(0, 100) : "fadeInUp",
    sections: typeof rawAnim.sections === "string" ? rawAnim.sections.slice(0, 100) : "fadeInUp",
  };

  // ♥ Body Background
  const bodyBackground =
    typeof r.bodyBackground === "string" && r.bodyBackground.length < 200
      ? r.bodyBackground
      : "#fff";

  // ♥ Custom CSS
  const customCSS =
    typeof r.customCSS === "string" ? sanitizeCustomCss(r.customCSS) : "";

  // ♥ Default Texts
  const rawTexts = (r.defaultTexts && typeof r.defaultTexts === "object" ? r.defaultTexts : {}) as Record<string, string>;
  const defaultTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawTexts)) {
    if (typeof k === "string" && typeof v === "string") {
      defaultTexts[k.slice(0, 50)] = v.slice(0, 1000);
    }
  }

  return { fonts, cssVariables, sections, animations, bodyBackground, customCSS, defaultTexts };
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — CSS Sanitizer
// ════════════════════════════════════════════════════════════

export function sanitizeCustomCss(css: string): string {
  let s = css.slice(0, 3000);
  s = s.replace(/<\/?script[^>]*>/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/expression\s*\(/gi, "");
  s = s.replace(/vbscript\s*:/gi, "");
  s = s.replace(/-moz-binding\s*:/gi, "");
  s = s.replace(/behavior\s*:/gi, "");
  s = s.replace(/<[^>]*>/g, "");
  return s;
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Template Assembler
// ♥ Combines AI design decisions with premium section blocks
// ════════════════════════════════════════════════════════════

export function assembleTemplate(ai: AITemplateResponse): string {
  // ♥ Google Fonts link
  const fontFamilies = ai.fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&");
  const fontsLink = ai.fonts.length > 0
    ? `<link href="https://fonts.googleapis.com/css2?${fontFamilies}&display=swap" rel="stylesheet">`
    : "";

  // ♥ Heading font for CSS
  const headingFontName = ai.fonts[0]?.split(":")[0] || "Cormorant Garamond";
  const headingFont = `'${headingFontName}',serif`;

  // ♥ Body font name
  const bodyFontName = ai.fonts[1]?.split(":")[0] || "Inter";

  // ♥ CSS Variables
  const rootVars = Object.entries(ai.cssVariables)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  // ♥ Base CSS — editorial-grade reset and shared styles
  const baseCSS = `
/* ♥ Forilove — Base Reset */
*{margin:0;padding:0;box-sizing:border-box}
:root{${rootVars}}
html{scroll-behavior:smooth}
body{font-family:'${bodyFontName}',sans-serif;color:var(--text);background:${ai.bodyBackground || "#fff"};overflow-x:hidden}

/* ♥ Forilove — Shared Components */
.fl-section-divider{width:40px;height:1px;background:var(--text-light);opacity:0.2;margin:0 auto 40px}
.fl-section-label{font-weight:300;font-size:10px;letter-spacing:5px;text-transform:uppercase;color:var(--text-light);margin-bottom:40px;text-align:center}

/* ♥ Forilove — Responsive */
@media(max-width:768px){
.fl-gallery__grid{grid-template-columns:1fr}
.fl-gallery__grid img{height:clamp(280px,60vw,400px)}
.fl-fullimg__photo{height:60vh}
.fl-quote{padding:100px 24px}
.fl-letter{padding:80px 24px}
.fl-timeline{padding:80px 24px}
.fl-gallery{padding:80px 24px}
.fl-footer{padding:80px 24px 60px}
}`;

  // ♥ Section HTML + CSS
  let sectionsHTML = "";
  let sectionsCSS = "";
  for (const key of ai.sections) {
    const def = SECTION_REGISTRY[key];
    if (!def) continue;
    sectionsHTML += def.html(ai.defaultTexts, headingFont);
    sectionsCSS += def.css(headingFont);
  }

  // ♥ Animations
  let animCSS = "\n/* ♥ Forilove — Animations */";
  if (ai.animations.hero === "fadeInUp" || ai.animations.sections === "fadeInUp") {
    animCSS += `\n@keyframes flFadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`;
  }
  if (ai.animations.hero === "fadeIn" || ai.animations.sections === "fadeIn") {
    animCSS += `\n@keyframes flFadeIn{from{opacity:0}to{opacity:1}}`;
  }
  if (ai.animations.hero === "scaleIn") {
    animCSS += `\n@keyframes flScaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`;
  }
  // ♥ Map animation names to keyframe names
  const animMap: Record<string, string> = { fadeInUp: "flFadeInUp", fadeIn: "flFadeIn", scaleIn: "flScaleIn" };
  if (ai.animations.hero) {
    const kf = animMap[ai.animations.hero] || "flFadeInUp";
    animCSS += `\n.fl-hero__content{animation:${kf} 1s ease-out}`;
  }
  if (ai.animations.sections) {
    const kf = animMap[ai.animations.sections] || "flFadeInUp";
    animCSS += `\n.fl-gallery,.fl-letter,.fl-timeline,.fl-quote,.fl-countdown,.fl-video,.fl-fullimg{animation:${kf} 0.8s ease-out both}`;
  }

  // ♥ Custom CSS from AI
  const custom = ai.customCSS ? `\n/* ♥ Forilove — AI Custom Styles */\n${ai.customCSS}` : "";

  // ♥ Assemble full document
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<!-- ♥ Forilove — Made with love -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Forilove</title>
${fontsLink}
<style>
${baseCSS}
${sectionsCSS}
${animCSS}
${custom}
</style>
</head>
<body>
${sectionsHTML}
<!-- ♥ Forilove — End -->
</body>
</html>`;
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Fallback Response
// ♥ Premium default when AI fails — editorial romantic style
// ════════════════════════════════════════════════════════════

export const FALLBACK_RESPONSE: AITemplateResponse = {
  fonts: ["Cormorant Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400", "Inter:wght@300;400;500"],
  cssVariables: {
    "--primary": "#c4697a",
    "--primary-light": "#fdf2f4",
    "--dark": "#1a1a2e",
    "--text": "#2d2d3a",
    "--text-light": "#6b7280",
    "--accent": "#d4a853",
  },
  sections: ["hero", "gallery", "quotes", "love_letter", "timeline", "full_image", "footer"],
  animations: { hero: "fadeInUp", sections: "fadeIn" },
  bodyBackground: "#fafafa",
  customCSS: "",
  defaultTexts: {
    title: "Sonsuza Dek",
    subtitle: "Sana olan sevgim",
    special_date: "14.02.2024",
    gallery_subtitle: "Birlikte geçirdiğimiz en güzel anlar",
    letter: "Sevgilim,\n\nSeninle geçirdiğim her an hayatımın en değerli hazinesi. Gülüşün güneş gibi aydınlatıyor dünyamı. Seninle geçen her saniye, benim için sonsuzluk kadar değerli.\n\nSonsuza kadar seninle...",
    quote_text: "Seninle geçen her an, hayatımın en güzel sayfası oldu.",
    quote_author: "Bizim Hikayemiz",
    milestone_1_title: "İlk Tanışma",
    milestone_1_text: "Kaderimiz o gün birleşti, her şey o bakışla başladı",
    milestone_2_title: "İlk Buluşma",
    milestone_2_text: "Kalbimin sana ait olduğunu anladım",
    full_image_text: "Seninle her yer ev.",
    footer_text: "Bu sayfa sana olan sevgimin küçük bir yansıması.\nSeni seviyorum, bugün ve her gün.",
    footer_names: "♥",
  },
};
