// ════════════════════════════════════════════════════════════
// ♥ Forilove — 2-Step AI Template System
// ♥ Step 1: AI thinks (concept) → Step 2: AI implements (CSS+texts)
// ♥ No hardcoded presets — every design is unique
// ════════════════════════════════════════════════════════════

// ♥ Forilove — Step 1: Design Concept (AI thinks)
export interface DesignConcept {
  mood: string;
  colorPalette: {
    primary: string;
    primaryLight: string;
    dark: string;
    text: string;
    textLight: string;
    accent: string;
  };
  fonts: string[];
  sections: string[];
  animationLevel: "sade" | "orta" | "premium";
  bodyBackground: string;
  architecture: string;
}

// ♥ Forilove — Step 2: Implementation (AI builds)
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
  bodyBackground: string;
  customCSS: string;
  defaultTexts: Record<string, string>;
}

// ♥ Forilove — Section Definition
type SectionDef = {
  html: (texts: Record<string, string>, headingFont: string) => string;
  css: (headingFont: string) => string;
};

// ♥ Forilove — HTML Escape
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ════════════════════════════════════════════════════════════
// ♥ Forilove — 10 Section Blocks (neutral structure)
// ════════════════════════════════════════════════════════════

const SECTION_REGISTRY: Record<string, SectionDef> = {

  hero: {
    html: (t) => `
<!-- ♥ Forilove — Hero -->
<section class="fl-hero">
  <div class="fl-hero-bg" data-editable="cover_photo" data-type="background-image" data-label="Kapak Fotoğrafı" style="background-image:url('https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1600&q=80')"></div>
  <div class="fl-hero-overlay"></div>
  <div class="fl-hero-deco"></div>
  <div class="fl-hero-content">
    <p class="fl-hero-subtitle" data-editable="subtitle" data-type="text" data-label="Üst Yazı">${esc(t.subtitle || "Sana olan sevgim")}</p>
    <h1 class="fl-hero-title" data-editable="title" data-type="text" data-label="Ana Başlık">${esc(t.title || "Bizim Hikayemiz")}</h1>
    <p class="fl-hero-date" data-editable="special_date" data-type="date" data-label="Özel Tarih">${esc(t.special_date || "14.02.2024")}</p>
  </div>
  <div class="fl-hero-scroll"><span>♥</span></div>
</section>`,
    css: (hf) => `
.fl-hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.fl-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform 8s ease}
.fl-hero:hover .fl-hero-bg{transform:scale(1.03)}
.fl-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.2) 0%,rgba(0,0,0,0.5) 100%)}
.fl-hero-deco{display:none}
.fl-hero-content{position:relative;z-index:1;text-align:center;padding:2rem;max-width:800px;width:100%}
.fl-hero-subtitle{font-size:clamp(11px,1.5vw,14px);letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:clamp(16px,3vw,32px);font-weight:300}
.fl-hero-title{font-family:${hf};font-size:clamp(36px,9vw,88px);line-height:1.05;color:#fff;margin-bottom:clamp(12px,2vw,24px);font-weight:400}
.fl-hero-date{font-size:clamp(12px,1.5vw,14px);letter-spacing:3px;color:rgba(255,255,255,0.5);font-weight:300}
.fl-hero-scroll{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:1;opacity:0.4;font-size:12px}
.fl-hero-scroll span{display:block;animation:flBounce 2s ease-in-out infinite}`,
  },

  date: {
    html: (t) => `
<!-- ♥ Forilove — Date -->
<section class="fl-date">
  <div class="fl-divider"></div>
  <p class="fl-date-label">Özel Günümüz</p>
  <p class="fl-date-value" data-editable="special_date" data-type="date" data-label="Özel Tarih">${esc(t.special_date || "14.02.2024")}</p>
</section>`,
    css: () => `
.fl-date{padding:clamp(60px,10vw,100px) 24px;text-align:center}
.fl-date-label{font-size:clamp(10px,1.2vw,12px);letter-spacing:4px;text-transform:uppercase;color:var(--text-light);margin-bottom:16px;font-weight:400}
.fl-date-value{font-size:clamp(18px,3vw,28px);letter-spacing:2px;color:var(--primary);font-weight:500}`,
  },

  gallery: {
    html: (t) => `
<!-- ♥ Forilove — Gallery -->
<section class="fl-gallery" data-area="gallery" data-area-label="Fotoğraf Galerisi">
  <div class="fl-gallery-header">
    <p class="fl-label">Galeri</p>
    <p class="fl-gallery-subtitle" data-editable="gallery_subtitle" data-type="text" data-label="Galeri Alt Başlığı">${esc(t.gallery_subtitle || "Birlikte geçirdiğimiz en güzel anlar")}</p>
  </div>
  <div class="fl-gallery-grid">
    <img class="fl-gallery-img fl-stagger-1" data-editable="photo_1" data-type="image" data-label="Fotoğraf 1" src="https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800&q=80" alt="">
    <img class="fl-gallery-img fl-stagger-2" data-editable="photo_2" data-type="image" data-label="Fotoğraf 2" src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=800&q=80" alt="">
    <img class="fl-gallery-img fl-stagger-3" data-editable="photo_3" data-type="image" data-label="Fotoğraf 3" src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80" alt="">
    <img class="fl-gallery-img fl-stagger-4" data-editable="photo_4" data-type="image" data-label="Fotoğraf 4" src="https://images.unsplash.com/photo-1494774157365-9e04c6720e47?w=800&q=80" alt="">
  </div>
</section>`,
    css: () => `
.fl-gallery{padding:clamp(60px,10vw,120px) clamp(16px,4vw,48px);max-width:1100px;margin:0 auto}
.fl-gallery-header{text-align:center;margin-bottom:clamp(24px,5vw,48px)}
.fl-gallery-subtitle{font-size:clamp(14px,2vw,17px);color:var(--text-light);line-height:1.6;max-width:480px;margin:0 auto;font-weight:300}
.fl-gallery-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(4px,1vw,12px)}
.fl-gallery-img{width:100%;height:clamp(200px,35vw,500px);object-fit:cover;display:block;transition:all 0.6s cubic-bezier(0.4,0,0.2,1)}
.fl-gallery-img:hover{opacity:0.85;transform:scale(1.01)}
@media(max-width:480px){.fl-gallery-grid{grid-template-columns:1fr}.fl-gallery-img{height:clamp(220px,60vw,350px)}}`,
  },

  love_letter: {
    html: (t, hf) => `
<!-- ♥ Forilove — Love Letter -->
<section class="fl-letter" data-area="love_letter" data-area-label="Aşk Mektubu">
  <div class="fl-divider"></div>
  <p class="fl-label">Mektup</p>
  <div class="fl-letter-body">
    <div class="fl-letter-deco"></div>
    <p class="fl-letter-text" data-editable="letter" data-type="textarea" data-label="Mektup">${esc(t.letter || "Sevgilim,\n\nSeninle geçirdiğim her an hayatımın en değerli hazinesi.\n\nSonsuza kadar seninle...")}</p>
  </div>
</section>`,
    css: (hf) => `
.fl-letter{padding:clamp(60px,10vw,120px) clamp(16px,4vw,24px);max-width:650px;margin:0 auto}
.fl-letter-body{text-align:center;position:relative}
.fl-letter-deco{display:none}
.fl-letter-text{font-family:${hf};font-size:clamp(16px,2.5vw,21px);line-height:2;color:var(--text);white-space:pre-line;font-weight:300}`,
  },

  timeline: {
    html: (t, hf) => `
<!-- ♥ Forilove — Timeline -->
<section class="fl-timeline" data-area="timeline" data-area-label="Zaman Çizelgesi">
  <div class="fl-divider"></div>
  <p class="fl-label">Hikayemiz</p>
  <div class="fl-timeline-track">
    <div class="fl-timeline-item fl-stagger-1">
      <div class="fl-timeline-dot"></div>
      <div class="fl-timeline-content">
        <h3 class="fl-timeline-title" data-editable="milestone_1_title" data-type="text" data-label="Anı 1 Başlık">${esc(t.milestone_1_title || "İlk Tanışma")}</h3>
        <p class="fl-timeline-desc" data-editable="milestone_1_text" data-type="text" data-label="Anı 1 Açıklama">${esc(t.milestone_1_text || "Kaderimiz o gün birleşti")}</p>
      </div>
    </div>
    <div class="fl-timeline-item fl-stagger-2">
      <div class="fl-timeline-dot"></div>
      <div class="fl-timeline-content">
        <h3 class="fl-timeline-title" data-editable="milestone_2_title" data-type="text" data-label="Anı 2 Başlık">${esc(t.milestone_2_title || "İlk Buluşma")}</h3>
        <p class="fl-timeline-desc" data-editable="milestone_2_text" data-type="text" data-label="Anı 2 Açıklama">${esc(t.milestone_2_text || "Kalbimin sana ait olduğunu anladım")}</p>
      </div>
    </div>
  </div>
</section>`,
    css: (hf) => `
.fl-timeline{padding:clamp(60px,10vw,120px) clamp(16px,4vw,24px);max-width:650px;margin:0 auto}
.fl-timeline-track{position:relative;padding-left:clamp(24px,4vw,36px)}
.fl-timeline-track::before{content:'';position:absolute;left:5px;top:0;bottom:0;width:1px;background:var(--primary);opacity:0.3}
.fl-timeline-item{position:relative;padding:0 0 clamp(32px,5vw,48px) clamp(24px,4vw,36px)}
.fl-timeline-item:last-child{padding-bottom:0}
.fl-timeline-dot{position:absolute;left:-5px;top:6px;width:11px;height:11px;background:var(--primary);border-radius:50%;transition:all 0.3s ease}
.fl-timeline-title{font-family:${hf};font-size:clamp(17px,2.5vw,22px);color:var(--dark);margin-bottom:8px;font-weight:500}
.fl-timeline-desc{font-size:clamp(13px,1.8vw,15px);line-height:1.7;color:var(--text-light);font-weight:300}`,
  },

  countdown: {
    html: (t, hf) => `
<!-- ♥ Forilove — Countdown -->
<section class="fl-countdown" data-area="countdown" data-area-label="Geri Sayım">
  <div class="fl-divider"></div>
  <p class="fl-label">Geri Sayım</p>
  <p class="fl-countdown-date" data-editable="countdown_date" data-type="date" data-label="Geri Sayım Tarihi">${esc(t.countdown_date || "2025-02-14")}</p>
  <p class="fl-countdown-text" data-editable="countdown_label" data-type="text" data-label="Geri Sayım Etiketi">${esc(t.countdown_label || "Özel günümüze kalan süre")}</p>
</section>`,
    css: (hf) => `
.fl-countdown{padding:clamp(60px,10vw,120px) 24px;text-align:center;max-width:600px;margin:0 auto}
.fl-countdown-date{font-family:${hf};font-size:clamp(32px,7vw,60px);color:var(--primary);margin-bottom:16px;font-weight:400}
.fl-countdown-text{font-size:clamp(12px,1.5vw,14px);letter-spacing:3px;text-transform:uppercase;color:var(--text-light);font-weight:300}`,
  },

  quotes: {
    html: (t, hf) => `
<!-- ♥ Forilove — Quote -->
<section class="fl-quote" data-area="quotes" data-area-label="Alıntı">
  <div class="fl-divider"></div>
  <div class="fl-quote-deco"></div>
  <p class="fl-quote-text" data-editable="quote_text" data-type="textarea" data-label="Alıntı Metni">${esc(t.quote_text || "Seninle geçen her an, hayatımın en güzel sayfası oldu.")}</p>
  <p class="fl-quote-author" data-editable="quote_author" data-type="text" data-label="Alıntı Yazarı">${esc(t.quote_author || "Bizim Hikayemiz")}</p>
</section>`,
    css: (hf) => `
.fl-quote{padding:clamp(80px,12vw,160px) clamp(16px,4vw,24px);text-align:center;max-width:750px;margin:0 auto;position:relative}
.fl-quote-deco{display:none}
.fl-quote-text{font-family:${hf};font-style:italic;font-size:clamp(20px,4vw,38px);line-height:1.5;color:var(--dark);margin-bottom:clamp(24px,4vw,40px);font-weight:300}
.fl-quote-author{font-size:clamp(10px,1.3vw,12px);letter-spacing:4px;text-transform:uppercase;color:var(--text-light);font-weight:400}`,
  },

  full_image: {
    html: (t, hf) => `
<!-- ♥ Forilove — Full Image -->
<section class="fl-fullimg" data-area="full_image" data-area-label="Tam Sayfa Fotoğraf">
  <img class="fl-fullimg-photo" data-editable="full_photo" data-type="image" data-label="Tam Sayfa Fotoğraf" src="https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1600&q=80" alt="">
  <div class="fl-fullimg-overlay">
    <h2 class="fl-fullimg-text" data-editable="full_image_text" data-type="text" data-label="Fotoğraf Üstü Yazı">${esc(t.full_image_text || "Seninle her yer ev.")}</h2>
  </div>
</section>`,
    css: (hf) => `
.fl-fullimg{position:relative;overflow:hidden}
.fl-fullimg-photo{width:100%;height:clamp(50vh,70vw,80vh);object-fit:cover;display:block;filter:brightness(0.65);transition:transform 8s ease}
.fl-fullimg:hover .fl-fullimg-photo{transform:scale(1.05)}
.fl-fullimg-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px}
.fl-fullimg-text{font-family:${hf};font-size:clamp(28px,6vw,64px);text-align:center;color:#fff;font-weight:300}`,
  },

  video: {
    html: (t) => `
<!-- ♥ Forilove — Video -->
<section class="fl-video" data-area="video" data-area-label="Video">
  <div class="fl-divider"></div>
  <p class="fl-label">Video</p>
  <div class="fl-video-wrap">
    <video class="fl-video-player" data-editable="video_url" data-type="video" data-label="Video" src="${esc(t.video_url || "")}" controls playsinline></video>
  </div>
  <p class="fl-video-caption" data-editable="video_caption" data-type="text" data-label="Video Açıklaması">${esc(t.video_caption || "Birlikte yaşadığımız özel an")}</p>
</section>`,
    css: () => `
.fl-video{padding:clamp(60px,10vw,120px) clamp(16px,4vw,24px);max-width:900px;margin:0 auto}
.fl-video-wrap{overflow:hidden;margin-bottom:16px}
.fl-video-player{width:100%;display:block;background:#000}
.fl-video-caption{text-align:center;font-size:clamp(12px,1.5vw,14px);letter-spacing:2px;text-transform:uppercase;color:var(--text-light);font-weight:300}`,
  },

  footer: {
    html: (t, hf) => `
<!-- ♥ Forilove — Footer -->
<footer class="fl-footer">
  <div class="fl-divider"></div>
  <p class="fl-footer-message" data-editable="footer_text" data-type="textarea" data-label="Son Mesaj">${esc(t.footer_text || "Bu sayfa sana olan sevgimin küçük bir yansıması.\nSeni seviyorum, bugün ve her gün.")}</p>
  <p class="fl-footer-names" data-editable="footer_names" data-type="text" data-label="İsimler">${esc(t.footer_names || "♥")}</p>
</footer>`,
    css: (hf) => `
.fl-footer{padding:clamp(80px,12vw,120px) 24px clamp(48px,6vw,80px);text-align:center}
.fl-footer-message{font-family:${hf};font-size:clamp(17px,3vw,28px);line-height:1.6;color:var(--text-light);max-width:520px;margin:0 auto clamp(24px,4vw,48px);font-weight:300;white-space:pre-line}
.fl-footer-names{font-size:clamp(10px,1.3vw,12px);letter-spacing:5px;text-transform:uppercase;color:var(--text-light);opacity:0.6;font-weight:300}`,
  },
};

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Animation Library
// ════════════════════════════════════════════════════════════

const ANIMATION_LIBRARY = `
@keyframes flFadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes flFadeIn{from{opacity:0}to{opacity:1}}
@keyframes flScaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
@keyframes flSlideLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}
@keyframes flSlideRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
@keyframes flBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes flPulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes flGlow{0%,100%{box-shadow:0 0 5px var(--primary)}50%{box-shadow:0 0 20px var(--primary),0 0 40px var(--primary)}}
@keyframes flFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes flShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes flGradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes flZoomSlow{from{transform:scale(1)}to{transform:scale(1.08)}}
@keyframes flTextReveal{from{opacity:0;letter-spacing:12px;filter:blur(4px)}to{opacity:1;letter-spacing:inherit;filter:blur(0)}}
@keyframes flLineGrow{from{width:0}to{width:40px}}
@keyframes flDotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.6}}
.fl-stagger-1{animation-delay:0.1s}
.fl-stagger-2{animation-delay:0.25s}
.fl-stagger-3{animation-delay:0.4s}
.fl-stagger-4{animation-delay:0.55s}
.fl-divider{display:none}`;

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Validation
// ════════════════════════════════════════════════════════════

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/;
const VALID_SECTIONS = Object.keys(SECTION_REGISTRY);
const SAFE_FONT_RE = /^[a-zA-Z0-9 :@;,]+$/;

export function validateConcept(raw: unknown): DesignConcept | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const mood = typeof r.mood === "string" ? r.mood.slice(0, 100) : "romantic";
  const architecture = typeof r.architecture === "string" ? r.architecture.slice(0, 100) : "warm";

  const cp = (r.colorPalette && typeof r.colorPalette === "object" ? r.colorPalette : {}) as Record<string, string>;
  const colorPalette = {
    primary: (typeof cp.primary === "string" && COLOR_RE.test(cp.primary.trim())) ? cp.primary.trim() : "#c4697a",
    primaryLight: (typeof cp.primaryLight === "string" && COLOR_RE.test(cp.primaryLight.trim())) ? cp.primaryLight.trim() : "#fdf2f4",
    dark: (typeof cp.dark === "string" && COLOR_RE.test(cp.dark.trim())) ? cp.dark.trim() : "#1a1a2e",
    text: (typeof cp.text === "string" && COLOR_RE.test(cp.text.trim())) ? cp.text.trim() : "#2d2d3a",
    textLight: (typeof cp.textLight === "string" && COLOR_RE.test(cp.textLight.trim())) ? cp.textLight.trim() : "#6b7280",
    accent: (typeof cp.accent === "string" && COLOR_RE.test(cp.accent.trim())) ? cp.accent.trim() : "#d4a853",
  };

  const fonts = Array.isArray(r.fonts)
    ? (r.fonts as string[]).filter((f) => typeof f === "string" && SAFE_FONT_RE.test(f)).slice(0, 3)
    : ["Playfair Display:wght@400;700", "Inter:wght@300;400;500"];

  const rawSections = Array.isArray(r.sections) ? (r.sections as string[]) : [];
  const sections = rawSections.filter((s) => VALID_SECTIONS.includes(s));
  if (sections.length === 0) sections.push("hero", "gallery", "quotes", "love_letter", "timeline", "footer");

  const validLevels = ["sade", "orta", "premium"];
  const animationLevel = (typeof r.animationLevel === "string" && validLevels.includes(r.animationLevel))
    ? r.animationLevel as DesignConcept["animationLevel"] : "orta";

  const bodyBackground = typeof r.bodyBackground === "string" && r.bodyBackground.length < 200
    ? r.bodyBackground : "#ffffff";

  return { mood, colorPalette, fonts, sections, animationLevel, bodyBackground, architecture };
}

export function validateImplementation(raw: unknown): { customCSS: string; defaultTexts: Record<string, string> } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const customCSS = typeof r.customCSS === "string" ? sanitizeCustomCss(r.customCSS) : "";
  if (!customCSS || customCSS.length < 50) return null;

  const rawTexts = (r.defaultTexts && typeof r.defaultTexts === "object" ? r.defaultTexts : {}) as Record<string, string>;
  const defaultTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawTexts)) {
    if (typeof k === "string" && typeof v === "string") defaultTexts[k.slice(0, 50)] = v.slice(0, 1000);
  }

  return { customCSS, defaultTexts };
}

// ♥ Forilove — Merge concept + implementation into AITemplateResponse
export function mergeToResponse(concept: DesignConcept, impl: { customCSS: string; defaultTexts: Record<string, string> }): AITemplateResponse {
  const animMap: Record<string, { hero: string; sections: string }> = {
    sade: { hero: "fadeIn", sections: "fadeIn" },
    orta: { hero: "fadeInUp", sections: "fadeIn" },
    premium: { hero: "fadeInUp", sections: "fadeInUp" },
  };

  return {
    fonts: concept.fonts,
    cssVariables: {
      "--primary": concept.colorPalette.primary,
      "--primary-light": concept.colorPalette.primaryLight,
      "--dark": concept.colorPalette.dark,
      "--text": concept.colorPalette.text,
      "--text-light": concept.colorPalette.textLight,
      "--accent": concept.colorPalette.accent,
    },
    sections: concept.sections,
    animations: animMap[concept.animationLevel] || animMap.orta,
    bodyBackground: concept.bodyBackground,
    customCSS: impl.customCSS,
    defaultTexts: impl.defaultTexts,
  };
}

// ♥ Legacy single-step validation (fallback)
export function validateAIResponse(raw: unknown): AITemplateResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const fonts = Array.isArray(r.fonts)
    ? (r.fonts as string[]).filter((f) => typeof f === "string" && SAFE_FONT_RE.test(f)).slice(0, 5)
    : ["Playfair Display:wght@400;700", "Inter:wght@300;400;500"];

  const cv = (r.cssVariables && typeof r.cssVariables === "object" ? r.cssVariables : {}) as Record<string, string>;
  const defaults: AITemplateResponse["cssVariables"] = {
    "--primary": "#c4697a", "--primary-light": "#fdf2f4", "--dark": "#1a1a2e",
    "--text": "#2d2d3a", "--text-light": "#6b7280", "--accent": "#d4a853",
  };
  const cssVariables = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    const v = cv[key];
    if (typeof v === "string" && COLOR_RE.test(v.trim())) cssVariables[key] = v.trim();
  }

  const rawSections = Array.isArray(r.sections) ? (r.sections as string[]) : [];
  const sections = rawSections.filter((s) => VALID_SECTIONS.includes(s));
  if (sections.length === 0) sections.push("hero", "gallery", "quotes", "love_letter", "timeline", "footer");

  const rawAnim = (r.animations && typeof r.animations === "object" ? r.animations : {}) as Record<string, string>;
  const animations: AITemplateResponse["animations"] = {
    hero: typeof rawAnim.hero === "string" ? rawAnim.hero.slice(0, 100) : "fadeInUp",
    sections: typeof rawAnim.sections === "string" ? rawAnim.sections.slice(0, 100) : "fadeInUp",
  };

  const bodyBackground = typeof r.bodyBackground === "string" && r.bodyBackground.length < 200 ? r.bodyBackground : "#fff";
  const customCSS = typeof r.customCSS === "string" ? sanitizeCustomCss(r.customCSS) : "";

  const rawTexts = (r.defaultTexts && typeof r.defaultTexts === "object" ? r.defaultTexts : {}) as Record<string, string>;
  const defaultTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawTexts)) {
    if (typeof k === "string" && typeof v === "string") defaultTexts[k.slice(0, 50)] = v.slice(0, 1000);
  }

  return { fonts, cssVariables, sections, animations, bodyBackground, customCSS, defaultTexts };
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — CSS Sanitizer
// ════════════════════════════════════════════════════════════

export function sanitizeCustomCss(css: string): string {
  let s = css.slice(0, 8000);
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
// ════════════════════════════════════════════════════════════

export function assembleTemplate(ai: AITemplateResponse): string {
  const fontFamilies = ai.fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&");
  const fontsLink = ai.fonts.length > 0
    ? `<link href="https://fonts.googleapis.com/css2?${fontFamilies}&display=swap" rel="stylesheet">`
    : "";

  const headingFontName = ai.fonts[0]?.split(":")[0] || "Playfair Display";
  const headingFont = `'${headingFontName}',serif`;
  const bodyFontName = ai.fonts[1]?.split(":")[0] || "Inter";

  const rootVars = Object.entries(ai.cssVariables).map(([k, v]) => `${k}:${v}`).join(";");

  const baseCSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{${rootVars}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:'${bodyFontName}',sans-serif;color:var(--text);background:${ai.bodyBackground || "#fff"};overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
img{max-width:100%;height:auto}
.fl-label{font-size:clamp(10px,1.2vw,12px);letter-spacing:4px;text-transform:uppercase;color:var(--text-light);margin-bottom:clamp(24px,4vw,40px);text-align:center;font-weight:400}`;

  let sectionsHTML = "";
  let sectionsCSS = "";
  for (const key of ai.sections) {
    const def = SECTION_REGISTRY[key];
    if (!def) continue;
    sectionsHTML += def.html(ai.defaultTexts, headingFont);
    sectionsCSS += def.css(headingFont);
  }

  const animMap: Record<string, string> = { fadeInUp: "flFadeInUp", fadeIn: "flFadeIn", scaleIn: "flScaleIn" };
  let entranceCSS = "";
  if (ai.animations.hero) {
    const kf = animMap[ai.animations.hero] || "flFadeInUp";
    entranceCSS += `.fl-hero-content{animation:${kf} 1.2s ease-out both}`;
    entranceCSS += `.fl-hero-subtitle{animation:${kf} 1s ease-out 0.2s both}`;
    entranceCSS += `.fl-hero-title{animation:${kf} 1s ease-out 0.4s both}`;
    entranceCSS += `.fl-hero-date{animation:${kf} 1s ease-out 0.6s both}`;
  }
  if (ai.animations.sections) {
    const kf = animMap[ai.animations.sections] || "flFadeInUp";
    entranceCSS += `.fl-gallery,.fl-letter,.fl-timeline,.fl-quote,.fl-countdown,.fl-video,.fl-date,.fl-fullimg,.fl-footer{animation:${kf} 0.8s ease-out both}`;
  }

  const custom = ai.customCSS ? `\n/* ♥ Forilove — AI Theme */\n${ai.customCSS}` : "";

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
${ANIMATION_LIBRARY}
${sectionsCSS}
${entranceCSS}
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
// ════════════════════════════════════════════════════════════

export const FALLBACK_RESPONSE: AITemplateResponse = {
  fonts: ["Playfair Display:wght@400;700", "Inter:wght@300;400;500"],
  cssVariables: {
    "--primary": "#c4697a", "--primary-light": "#fdf2f4", "--dark": "#1a1a2e",
    "--text": "#2d2d3a", "--text-light": "#6b7280", "--accent": "#d4a853",
  },
  sections: ["hero", "gallery", "quotes", "love_letter", "timeline", "full_image", "footer"],
  animations: { hero: "fadeInUp", sections: "fadeIn" },
  bodyBackground: "#fafafa",
  customCSS: `.fl-divider{display:block;width:40px;height:1px;background:var(--primary);opacity:0.2;margin:0 auto 32px}.fl-gallery-img{border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.06)}.fl-hero-overlay{background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.55) 100%)}.fl-quote{border-top:1px solid rgba(0,0,0,0.06)}.fl-quote-deco{display:block;font-size:48px;color:var(--primary);opacity:0.12;margin-bottom:16px;font-family:Georgia,serif}.fl-quote-deco::before{content:"\\201C"}.fl-letter-text{font-style:italic}.fl-footer{background:var(--dark)}.fl-footer-message{color:rgba(255,255,255,0.6)}.fl-footer-names{color:rgba(255,255,255,0.3)}`,
  defaultTexts: {
    title: "Bizim Hikayemiz", subtitle: "Sana olan sevgim", special_date: "14.02.2024",
    gallery_subtitle: "Birlikte geçirdiğimiz en güzel anlar",
    letter: "Sevgilim,\n\nSeninle geçirdiğim her an hayatımın en değerli hazinesi.\n\nSonsuza kadar seninle...",
    quote_text: "Seninle geçen her an, hayatımın en güzel sayfası oldu.", quote_author: "Bizim Hikayemiz",
    milestone_1_title: "İlk Tanışma", milestone_1_text: "Kaderimiz o gün birleşti",
    milestone_2_title: "İlk Buluşma", milestone_2_text: "Kalbimin sana ait olduğunu anladım",
    full_image_text: "Seninle her yer ev.",
    footer_text: "Bu sayfa sana olan sevgimin küçük bir yansıması.\nSeni seviyorum, bugün ve her gün.", footer_names: "♥",
  },
};
