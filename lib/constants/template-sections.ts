// ============================================================
// Forilove — Structural JSON Assembly System
// AI returns design decisions (JSON), we assemble high-quality HTML
// ============================================================

// --- Interface ---

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

// --- Section Registry ---

type SectionDef = {
  html: (texts: Record<string, string>, headingFont: string) => string;
  css: (headingFont: string) => string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SECTION_REGISTRY: Record<string, SectionDef> = {
  // ─── HERO ─────────────────────────────────────────────
  hero: {
    html: (t, hf) => `
<div class="hero">
  <div class="hero-bg" data-editable="cover_photo" data-type="background-image" data-label="Kapak Fotoğrafı" style="background-image:url('https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1400&q=80')"></div>
  <div class="hero-content">
    <h1 data-editable="title" data-type="text" data-label="Ana Başlık">${esc(t.title || "Bizim Hikayemiz")}</h1>
    <p data-editable="subtitle" data-type="text" data-label="Alt Başlık">${esc(t.subtitle || "Her anımız bir masal gibi")}</p>
  </div>
</div>
<div class="heart-divider"><span>♥</span></div>`,
    css: (hf) => `
.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(26,26,46,0.3),rgba(26,26,46,0.7))}
.hero-content{position:relative;z-index:1;text-align:center;padding:2rem;max-width:700px}
.hero-content h1{font-family:${hf};font-size:clamp(2.5rem,7vw,5rem);color:#fff;margin-bottom:0.75rem;line-height:1.1;text-shadow:0 2px 20px rgba(0,0,0,0.3)}
.hero-content p{font-size:clamp(1rem,2.5vw,1.25rem);color:rgba(255,255,255,0.9);font-weight:300;letter-spacing:0.02em}`,
  },

  // ─── DATE ─────────────────────────────────────────────
  date: {
    html: (t) => `
<div class="section" style="text-align:center">
  <div class="date-badge">
    <span data-editable="special_date" data-type="date" data-label="Özel Tarih">${esc(t.special_date || "14.02.2024")}</span>
  </div>
</div>`,
    css: () => `
.date-badge{display:inline-flex;align-items:center;gap:0.5rem;background:var(--primary);color:#fff;padding:0.75rem 2rem;border-radius:999px;font-weight:500;font-size:0.95rem;box-shadow:0 4px 15px rgba(232,73,106,0.3)}`,
  },

  // ─── GALLERY ──────────────────────────────────────────
  gallery: {
    html: (t, hf) => `
<section class="section" data-area="gallery" data-area-label="Fotoğraf Galerisi">
  <h2 class="section-title">Anılarımız</h2>
  <p class="section-subtitle" data-editable="gallery_subtitle" data-type="text" data-label="Galeri Alt Başlığı">${esc(t.gallery_subtitle || "Birlikte geçirdiğimiz en güzel anlar")}</p>
  <div class="photo-grid">
    <img data-editable="photo_1" data-type="image" data-label="Fotoğraf 1" src="https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=600&q=80" alt="">
    <img data-editable="photo_2" data-type="image" data-label="Fotoğraf 2" src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80" alt="">
    <img data-editable="photo_3" data-type="image" data-label="Fotoğraf 3" src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&q=80" alt="">
    <img data-editable="photo_4" data-type="image" data-label="Fotoğraf 4" src="https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&q=80" alt="">
  </div>
</section>`,
    css: (hf) => `
.photo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(0.5rem,2vw,1rem)}
.photo-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:1rem;transition:transform 0.4s ease;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
.photo-grid img:hover{transform:scale(1.03)}`,
  },

  // ─── LOVE LETTER ──────────────────────────────────────
  love_letter: {
    html: (t, hf) => `
<section class="section" data-area="love_letter" data-area-label="Aşk Mektubu">
  <h2 class="section-title">Sana Mektubum</h2>
  <div class="letter-card">
    <p data-editable="letter" data-type="textarea" data-label="Mektup">${esc(t.letter || "Sevgilim,\n\nSeninle geçirdiğim her an hayatımın en değerli hazinesi. Gülüşün güneş gibi aydınlatıyor dünyamı.\n\nSonsuza kadar seninle...")}</p>
  </div>
</section>`,
    css: () => `
.letter-card{background:var(--primary-light);border-radius:1.5rem;padding:clamp(1.5rem,4vw,3rem);position:relative;overflow:hidden}
.letter-card::before{content:'"';position:absolute;top:-20px;left:20px;font-size:8rem;color:var(--primary);opacity:0.1;font-family:serif;line-height:1}
.letter-card p{font-size:clamp(1rem,2.5vw,1.15rem);line-height:1.9;color:var(--text);position:relative;white-space:pre-line}`,
  },

  // ─── TIMELINE ─────────────────────────────────────────
  timeline: {
    html: (t, hf) => `
<section class="section" data-area="timeline" data-area-label="Zaman Çizelgesi">
  <h2 class="section-title">Hikayemiz</h2>
  <div class="timeline">
    <div class="timeline-item">
      <h3 data-editable="milestone_1_title" data-type="text" data-label="Anı 1 Başlık">${esc(t.milestone_1_title || "İlk Tanışma")}</h3>
      <p data-editable="milestone_1_text" data-type="text" data-label="Anı 1 Açıklama">${esc(t.milestone_1_text || "Kaderimiz o gün birleşti")}</p>
    </div>
    <div class="timeline-item">
      <h3 data-editable="milestone_2_title" data-type="text" data-label="Anı 2 Başlık">${esc(t.milestone_2_title || "İlk Buluşma")}</h3>
      <p data-editable="milestone_2_text" data-type="text" data-label="Anı 2 Açıklama">${esc(t.milestone_2_text || "Kalbimin sana ait olduğunu anladım")}</p>
    </div>
  </div>
</section>`,
    css: (hf) => `
.timeline{position:relative;padding-left:2rem}
.timeline::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,var(--primary),var(--accent))}
.timeline-item{position:relative;padding:0 0 2.5rem 2rem}
.timeline-item::before{content:'';position:absolute;left:-0.45rem;top:0.25rem;width:12px;height:12px;background:var(--primary);border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--primary)}
.timeline-item h3{font-family:${hf};font-size:1.1rem;margin-bottom:0.25rem;color:var(--dark)}
.timeline-item p{color:var(--text-light);font-size:0.9rem;line-height:1.6}`,
  },

  // ─── COUNTDOWN ────────────────────────────────────────
  countdown: {
    html: (t) => `
<section class="section" data-area="countdown" data-area-label="Geri Sayım">
  <h2 class="section-title">Geri Sayım</h2>
  <div class="countdown-container">
    <div class="countdown-date">
      <span data-editable="countdown_date" data-type="date" data-label="Geri Sayım Tarihi">${esc(t.countdown_date || "2025-02-14")}</span>
    </div>
    <p class="countdown-label" data-editable="countdown_label" data-type="text" data-label="Geri Sayım Etiketi">${esc(t.countdown_label || "Özel günümüze kalan süre")}</p>
  </div>
</section>`,
    css: () => `
.countdown-container{text-align:center;padding:2rem 0}
.countdown-date{display:inline-flex;align-items:center;gap:0.5rem;background:var(--primary);color:#fff;padding:1rem 2.5rem;border-radius:1rem;font-size:1.5rem;font-weight:700;box-shadow:0 8px 25px rgba(232,73,106,0.25);margin-bottom:1rem}
.countdown-label{color:var(--text-light);font-size:0.95rem;margin-top:1rem}`,
  },

  // ─── QUOTES ───────────────────────────────────────────
  quotes: {
    html: (t, hf) => `
<section class="section" data-area="quotes" data-area-label="Alıntı">
  <div class="quote-card">
    <div class="quote-mark">"</div>
    <p class="quote-text" data-editable="quote_text" data-type="text" data-label="Alıntı Metni">${esc(t.quote_text || "Seni sevmek, nefes almak kadar doğal...")}</p>
    <span class="quote-author" data-editable="quote_author" data-type="text" data-label="Alıntı Yazarı">${esc(t.quote_author || "— Anonim")}</span>
  </div>
</section>`,
    css: (hf) => `
.quote-card{background:var(--primary-light);border-radius:1.5rem;padding:clamp(2rem,5vw,3.5rem);text-align:center;position:relative}
.quote-mark{font-family:${hf};font-size:5rem;color:var(--primary);opacity:0.2;line-height:1;margin-bottom:-1rem}
.quote-text{font-family:${hf};font-size:clamp(1.1rem,3vw,1.5rem);line-height:1.8;color:var(--dark);font-style:italic;margin-bottom:1rem}
.quote-author{color:var(--text-light);font-size:0.9rem}`,
  },

  // ─── VIDEO ────────────────────────────────────────────
  video: {
    html: (t) => `
<section class="section" data-area="video" data-area-label="Video">
  <h2 class="section-title">Özel Anımız</h2>
  <div class="video-container">
    <video data-editable="video_url" data-type="video" data-label="Video" src="${esc(t.video_url || "")}" controls playsinline></video>
  </div>
  <p class="video-caption" data-editable="video_caption" data-type="text" data-label="Video Açıklaması">${esc(t.video_caption || "Birlikte yaşadığımız özel an")}</p>
</section>`,
    css: () => `
.video-container{border-radius:1rem;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.1);margin-bottom:1rem}
.video-container video{width:100%;display:block;background:#000}
.video-caption{text-align:center;color:var(--text-light);font-size:0.9rem;margin-top:0.75rem}`,
  },

  // ─── FOOTER ───────────────────────────────────────────
  footer: {
    html: (t) => `
<div class="footer">
  <p data-editable="footer_text" data-type="text" data-label="Alt Yazı">${t.footer_text || 'Sonsuza kadar <span>♥</span>'}</p>
</div>`,
    css: () => `
.footer{text-align:center;padding:3rem 1.5rem;background:var(--dark);color:rgba(255,255,255,0.6);font-size:0.875rem}
.footer span{color:var(--primary)}`,
  },
};

// --- Validation ---

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

const VALID_SECTIONS = Object.keys(SECTION_REGISTRY);

const SAFE_FONT_RE = /^[a-zA-Z0-9 :@;,]+$/;

export function validateAIResponse(raw: unknown): AITemplateResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // fonts
  const fonts = Array.isArray(r.fonts)
    ? (r.fonts as string[]).filter((f) => typeof f === "string" && SAFE_FONT_RE.test(f)).slice(0, 5)
    : ["Playfair Display:wght@400;700", "Inter:wght@300;400;500"];

  // cssVariables
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

  // sections
  const rawSections = Array.isArray(r.sections) ? (r.sections as string[]) : [];
  const sections = rawSections.filter((s) => VALID_SECTIONS.includes(s));
  if (sections.length === 0) {
    sections.push("hero", "date", "gallery", "love_letter", "timeline", "footer");
  }

  // animations
  const rawAnim = (r.animations && typeof r.animations === "object" ? r.animations : {}) as Record<string, string>;
  const animations: AITemplateResponse["animations"] = {
    hero: typeof rawAnim.hero === "string" ? rawAnim.hero.slice(0, 100) : "fadeInUp",
    sections: typeof rawAnim.sections === "string" ? rawAnim.sections.slice(0, 100) : "fadeInUp",
  };

  // bodyBackground
  const bodyBackground =
    typeof r.bodyBackground === "string" && r.bodyBackground.length < 200
      ? r.bodyBackground
      : "#fff";

  // customCSS
  const customCSS =
    typeof r.customCSS === "string" ? sanitizeCustomCss(r.customCSS) : "";

  // defaultTexts
  const rawTexts = (r.defaultTexts && typeof r.defaultTexts === "object" ? r.defaultTexts : {}) as Record<string, string>;
  const defaultTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawTexts)) {
    if (typeof k === "string" && typeof v === "string") {
      defaultTexts[k.slice(0, 50)] = v.slice(0, 1000);
    }
  }

  return { fonts, cssVariables, sections, animations, bodyBackground, customCSS, defaultTexts };
}

// --- CSS Sanitizer ---

export function sanitizeCustomCss(css: string): string {
  let s = css.slice(0, 3000);
  // Strip dangerous patterns
  s = s.replace(/<\/?script[^>]*>/gi, "");
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/expression\s*\(/gi, "");
  s = s.replace(/vbscript\s*:/gi, "");
  s = s.replace(/-moz-binding\s*:/gi, "");
  s = s.replace(/behavior\s*:/gi, "");
  // Strip any remaining HTML tags
  s = s.replace(/<[^>]*>/g, "");
  return s;
}

// --- Assembler ---

export function assembleTemplate(ai: AITemplateResponse): string {
  // 1. Google Fonts link
  const fontFamilies = ai.fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&");
  const fontsLink = ai.fonts.length > 0
    ? `<link href="https://fonts.googleapis.com/css2?${fontFamilies}&display=swap" rel="stylesheet">`
    : "";

  // Heading font for CSS references
  const headingFontName = ai.fonts[0]?.split(":")[0] || "Playfair Display";
  const headingFont = `'${headingFontName}',serif`;

  // 2. CSS Variables
  const rootVars = Object.entries(ai.cssVariables)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  // 3. Base CSS
  const baseCSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{${rootVars}}
html{scroll-behavior:smooth}
body{font-family:'${ai.fonts[1]?.split(":")[0] || "Inter"}',sans-serif;color:var(--text);background:${ai.bodyBackground || "#fff"};overflow-x:hidden}
.section{padding:clamp(3rem,8vw,6rem) clamp(1rem,4vw,2rem);max-width:900px;margin:0 auto}
.section-title{font-family:${headingFont};font-size:clamp(1.5rem,4vw,2.25rem);text-align:center;margin-bottom:0.5rem;color:var(--dark)}
.section-subtitle{text-align:center;color:var(--text-light);font-size:0.95rem;margin-bottom:2.5rem}
.heart-divider{display:flex;align-items:center;justify-content:center;gap:1rem;padding:2rem 0}
.heart-divider::before,.heart-divider::after{content:'';width:60px;height:1px;background:var(--primary)}
.heart-divider span{color:var(--primary);font-size:1.25rem}
@media(max-width:640px){
.photo-grid{grid-template-columns:1fr 1fr;gap:0.5rem}
.timeline{padding-left:1.5rem}
.timeline-item{padding-left:1.5rem}
}`;

  // 4. Section HTML + CSS
  let sectionsHTML = "";
  let sectionsCSS = "";
  for (const key of ai.sections) {
    const def = SECTION_REGISTRY[key];
    if (!def) continue;
    sectionsHTML += def.html(ai.defaultTexts, headingFont);
    sectionsCSS += def.css(headingFont);
  }

  // 5. Animation CSS
  let animCSS = "";
  if (ai.animations.hero === "fadeInUp" || ai.animations.sections === "fadeInUp") {
    animCSS += `\n@keyframes fadeInUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`;
  }
  if (ai.animations.hero === "fadeIn" || ai.animations.sections === "fadeIn") {
    animCSS += `\n@keyframes fadeIn{from{opacity:0}to{opacity:1}}`;
  }
  if (ai.animations.hero === "scaleIn") {
    animCSS += `\n@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`;
  }
  if (ai.animations.hero) {
    animCSS += `\n.hero-content{animation:${ai.animations.hero} 1s ease-out}`;
  }
  if (ai.animations.sections) {
    animCSS += `\n.section{animation:${ai.animations.sections} 0.8s ease-out both}`;
  }

  // 6. Custom CSS
  const custom = ai.customCSS ? `\n/* Custom */\n${ai.customCSS}` : "";

  // 7. Full document
  return `<!DOCTYPE html>
<html lang="tr">
<head>
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
</body>
</html>`;
}

// --- Fallback ---

export const FALLBACK_RESPONSE: AITemplateResponse = {
  fonts: ["Playfair Display:wght@400;700", "Inter:wght@300;400;500"],
  cssVariables: {
    "--primary": "#e8496a",
    "--primary-light": "#fdf2f4",
    "--dark": "#1a1a2e",
    "--text": "#2d2d3a",
    "--text-light": "#6b7280",
    "--accent": "#d4a853",
  },
  sections: ["hero", "date", "gallery", "love_letter", "timeline", "footer"],
  animations: { hero: "fadeInUp", sections: "fadeInUp" },
  bodyBackground: "#fff",
  customCSS: "",
  defaultTexts: {
    title: "Bizim Hikayemiz",
    subtitle: "Her anımız bir masal gibi",
    special_date: "14.02.2024",
    gallery_subtitle: "Birlikte geçirdiğimiz en güzel anlar",
    letter: "Sevgilim,\n\nSeninle geçirdiğim her an hayatımın en değerli hazinesi. Gülüşün güneş gibi aydınlatıyor dünyamı.\n\nSonsuza kadar seninle...",
    milestone_1_title: "İlk Tanışma",
    milestone_1_text: "Kaderimiz o gün birleşti",
    milestone_2_title: "İlk Buluşma",
    milestone_2_text: "Kalbimin sana ait olduğunu anladım",
    footer_text: "Sonsuza kadar ♥",
  },
};
