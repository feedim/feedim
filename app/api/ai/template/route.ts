// ════════════════════════════════════════════════════════════
// ♥ Forilove — 3-Step Agent Template System
// ♥ Step 1: ANALYZE — concept, colors, mood (hayalci)
// ♥ Step 2: BUILD — CSS + texts (usta)
// ♥ Step 3: REVIEW — check & fix conflicts (kalite kontrol)
// ♥ Claude Haiku 4.5 — şablon canavarı
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  assembleTemplate,
  validateConcept,
  validateImplementation,
  validateReview,
  mergeToResponse,
  FALLBACK_RESPONSE,
  type AITemplateResponse,
  type DesignConcept,
} from "@/lib/constants/template-sections";

// ♥ Forilove — Rate Limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ════════════════════════════════════════════════════════════
// ♥ STEP 1 — HAYAL KUR (Analyze & Dream)
// ♥ Bir tasarım direktörü gibi düşün
// ════════════════════════════════════════════════════════════

const STEP1_PROMPT = `Sen dünyaca ünlü bir tasarım direktörüsün. Aşk sayfası için TASARIM KONSEPTİ oluşturacaksın. Kullanıcının isteğinden yola çık, hayal gücünü kullan, FARKLI ve ÖZGÜl bir konsept yarat.

SADECE JSON döndür. Açıklama yazma.

RENK PALETİ — EN ÖNEMLİ KURAL:
Renkler birbiriyle MUTLAKA uyumlu olacak. Zıt renkler YASAK (siyah primary + beyaz dark gibi saçmalıklar YAPMA).

AÇIK TEMA (bodyBackground beyaz/krem/açık):
- primary: Canlı vurgu rengi (#c4697a, #6366f1, #059669 gibi)
- primaryLight: primary'nin çok açık hali (#fdf2f4, #eef2ff gibi)
- dark: Koyu arka plan tonu (footer için — #1a1a2e, #0f172a gibi)
- text: Koyu metin rengi (#1a1a1a - #3a3a3a arası)
- textLight: Orta gri metin (#6b7280 - #9ca3af arası)
- accent: primary'den farklı tamamlayıcı renk
- isDarkTheme: false

KARANLIK TEMA (bodyBackground siyah/koyu):
- primary: Parlak vurgu rengi (#c9a87c, #e84393, #6366f1 gibi)
- primaryLight: Çok koyu arka plan tonu (#1a1016, #0f172a gibi)
- dark: Body ile aynı veya çok yakın (#0a0a0a)
- text: rgba(255,255,255,0.85) — BEYAZ metin (koyu üstünde)
- textLight: rgba(255,255,255,0.4) — Soluk beyaz
- accent: primary'yi tamamlayan (#8b7355, #6c5ce7 gibi)
- isDarkTheme: true

FONTLAR (Google Fonts):
Başlık: Cormorant Garamond, Playfair Display, Bodoni Moda, Lora, Cinzel, Dancing Script, EB Garamond, Marcellus, Italiana, Spectral, Libre Baskerville, Crimson Text, Montserrat
Gövde: Inter, Poppins, Lato, Nunito, Raleway
Format: "FontAdi:wght@400;700"

BÖLÜMLER (5-8 tane seç, hero + footer zorunlu):
hero, date, gallery, love_letter, timeline, countdown, quotes, full_image, video, footer

KAPAK FOTOĞRAFI MOODU (coverPhotoMood):
romantic, cinematic, nature, urban, minimal, nostalgic, moody, luxury

ANİMASYON: "sade" (kullanıcı sakin istiyorsa), "orta" (normal), "premium" (hareketli/özel)

JSON:
{
  "mood": "2-3 kelime ruh hali",
  "architecture": "2-3 kelime mimari yaklaşım",
  "colorPalette": {
    "primary": "#hex",
    "primaryLight": "#hex",
    "dark": "#hex",
    "text": "#hex veya rgba(...)",
    "textLight": "#hex veya rgba(...)",
    "accent": "#hex"
  },
  "fonts": ["BaslikFont:wght@400;700", "GovdeFont:wght@300;400"],
  "sections": ["hero", ...],
  "animationLevel": "sade|orta|premium",
  "bodyBackground": "#hex veya linear-gradient(...)",
  "coverPhotoMood": "romantic|cinematic|nature|urban|minimal|nostalgic|moody|luxury",
  "isDarkTheme": true|false
}`;

// ════════════════════════════════════════════════════════════
// ♥ STEP 2 — İNŞA ET (Build CSS + Texts)
// ♥ Bir CSS ustası gibi yaz
// ════════════════════════════════════════════════════════════

function buildStep2Prompt(concept: DesignConcept): string {
  const darkNote = concept.isDarkTheme
    ? `BU KARANLIK TEMA! Tüm metin renkleri rgba(255,255,255,...) formatında olmalı. body rengi koyu. Sınır çizgileri rgba(255,255,255,0.06-0.1) olmalı.`
    : `BU AÇIK TEMA! Metin renkleri koyu (#1a1a1a-#666 arası). body rengi açık. Sınır çizgileri rgba(0,0,0,0.06-0.1) olmalı.`;

  const animNote = concept.animationLevel === "premium"
    ? `YOĞUN ANİMASYON: Hero bg yavaş zoom (flZoomSlow), galeri stagger giriş, timeline dot pulse (flDotPulse), dekoratif float (flFloat), neon glow (flGlow), text reveal (flTextReveal). Dekoratif elementleri AÇ.`
    : concept.animationLevel === "sade"
    ? `MİNİMAL ANİMASYON: Sadece basit fade. Animasyon yok denecek kadar az. Sakin, huzurlu.`
    : `ORTA ANİMASYON: Stagger galeri giriş, divider çizgi animasyonu, hafif hover efektleri.`;

  return `Sen bir CSS ustasısın. Verilen tasarım konseptine göre customCSS ve Türkçe metinler yaz. SADECE JSON döndür.

KONSEPT:
- Ruh hali: ${concept.mood}
- Mimari: ${concept.architecture}
- Renkler: primary=${concept.colorPalette.primary}, primaryLight=${concept.colorPalette.primaryLight}, dark=${concept.colorPalette.dark}, text=${concept.colorPalette.text}, textLight=${concept.colorPalette.textLight}, accent=${concept.colorPalette.accent}
- Body: ${concept.bodyBackground}
- ${darkNote}
- ${animNote}
- Bölümler: ${concept.sections.join(", ")}

YASAKLAR (BUNLARI YAPMA!):
1. .fl-hero-bg'ye background EKLEME — o kullanıcının kapak fotoğrafı, dokunma!
2. .fl-hero'ya background rengi EKLEME — hero zaten fotoğraflı
3. .fl-hero-title, .fl-hero-subtitle, .fl-hero-date rengini KOYU yapma — hero üstü HER ZAMAN beyaz/açık renk
4. animation:none YAZMA — animasyonları kaldırma
5. Aynı renkte metin + arka plan YAPMA (okunmaz!)

ZORUNLU OVERRIDE'LAR:
1. .fl-hero-overlay → gradient ayarla (fotoğrafın üstüne renk katmanı)
2. .fl-divider → display:block ile AÇ, stil ver (çizgi, genişlik, renk)
3. .fl-gallery-img → hover efekti, border-radius, shadow/filter
4. .fl-footer → arka plan rengi (koyu tema: koyu, açık tema: var(--dark))
5. .fl-footer-message + .fl-footer-names → footer üstü metin rengi (footer koyu ise beyazımsı)
${concept.isDarkTheme ? "6. body{color:rgba(255,255,255,0.85)} — karanlık temada metin beyaz" : ""}
${concept.isDarkTheme ? "7. .fl-timeline-title, .fl-quote-text → rgba(255,255,255,0.75+) renk" : ""}

OVERRIDE EDEBİLECEĞİN CLASS'LAR:
HERO: .fl-hero-overlay .fl-hero-deco .fl-hero-subtitle .fl-hero-title .fl-hero-date .fl-hero-scroll
GALLERY: .fl-gallery .fl-gallery-grid .fl-gallery-img .fl-gallery-subtitle
QUOTE: .fl-quote .fl-quote-deco .fl-quote-text .fl-quote-author
LETTER: .fl-letter .fl-letter-deco .fl-letter-text
TIMELINE: .fl-timeline .fl-timeline-track::before .fl-timeline-dot .fl-timeline-title .fl-timeline-desc
FULL IMAGE: .fl-fullimg-photo .fl-fullimg-text
COUNTDOWN: .fl-countdown-date .fl-countdown-text
DATE: .fl-date .fl-date-label .fl-date-value
FOOTER: .fl-footer .fl-footer-message .fl-footer-names
SHARED: .fl-label .fl-divider body

ANİMASYON KÜTÜPHANESI (kullanabilirsin):
flFadeInUp, flFadeIn, flScaleIn, flBounce, flPulse, flGlow, flFloat, flShimmer, flGradientShift, flZoomSlow, flTextReveal, flLineGrow, flDotPulse

GİZLİ ELEMENTLER (display:block ile aç):
.fl-hero-deco — Hero dekoratif katman (radial-gradient, animasyonlu)
.fl-letter-deco — Mektup dekoratif (emoji/sembol, ::before ile)
.fl-quote-deco — Alıntı dekoratif (çizgi veya tırnak işareti)
.fl-divider — Bölüm ayırıcı çizgi
.fl-hero-scroll — Scroll göstergesi

CSS MİNİMUM 800 KARAKTER. Detaylı yaz.

JSON:
{
  "customCSS": "tüm CSS override'lar tek string",
  "defaultTexts": {
    "title": "2-4 kelime çarpıcı başlık",
    "subtitle": "kısa üst yazı",
    "special_date": "14.02.2024",
    "gallery_subtitle": "galeri alt başlığı",
    "letter": "3+ paragraf samimi mektup (\\n ile satır atlama)",
    "quote_text": "güçlü tek cümle",
    "quote_author": "yazar adı",
    "milestone_1_title": "anı 1 başlık",
    "milestone_1_text": "anı 1 açıklama",
    "milestone_2_title": "anı 2 başlık",
    "milestone_2_text": "anı 2 açıklama",
    "full_image_text": "kısa sinematik metin",
    "countdown_date": "2025-02-14",
    "countdown_label": "geri sayım etiketi",
    "footer_text": "kapanış mesajı",
    "footer_names": "isimler veya ♥",
    "video_caption": "video açıklaması"
  }
}

METİNLER: Türkçe, duygusal, edebi. Konseptin ruh haline uygun ton. letter en az 3 paragraf.`;
}

// ════════════════════════════════════════════════════════════
// ♥ STEP 3 — KONTROL ET (Review & Fix)
// ♥ Kalite kontrol uzmanı gibi incele
// ════════════════════════════════════════════════════════════

function buildStep3Prompt(concept: DesignConcept, css: string): string {
  return `Sen bir kalite kontrol uzmanısın. Aşağıdaki CSS'i kontrol et ve sorunları düzelt. SADECE JSON döndür.

KONSEPT:
- Body arka plan: ${concept.bodyBackground}
- Karanlık tema: ${concept.isDarkTheme ? "EVET" : "HAYIR"}
- Primary renk: ${concept.colorPalette.primary}
- Text renk: ${concept.colorPalette.text}

MEVCUT CSS:
${css.slice(0, 3000)}

KONTROL LİSTESİ:
1. RENK ÇAKIŞMASI: Metin rengi ile arka plan rengi aynı/çok yakın mı? (okunmaz!)
   - Karanlık temada metin koyu mu? → rgba(255,255,255,0.85) yap
   - Açık temada metin beyaz mı? → koyu yap
2. HERO FOTOĞRAFI: .fl-hero-bg'ye background rengi eklenmiş mi? → kaldır
3. HERO METİN: .fl-hero-title rengi koyu mu? → beyaz/açık yap (fotoğraf üstünde)
4. FOOTER: Footer mesaj rengi footer arka planıyla aynı mı? → düzelt
5. ANIMASYON: animation:none var mı? → kaldır
6. .fl-divider açılmış mı? (display:block olmalı)
7. .fl-hero-overlay gradient var mı? (fotoğrafı karartmalı)

Sorun varsa fixedCSS olarak DÜZELTİLMİŞ TAM CSS'i döndür.
Sorun yoksa fixedCSS boş bırak.

JSON:
{
  "issues": ["sorun 1", "sorun 2"],
  "fixedCSS": "düzeltilmiş tam CSS (sorun varsa) veya boş string (sorun yoksa)"
}`;
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — JSON Parser
// ════════════════════════════════════════════════════════════

function parseJSON(raw: string): unknown | null {
  let s = raw.trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) s = m[1].trim();
  try { return JSON.parse(s); } catch { return null; }
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Main Handler
// ════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    // ♥ Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || (profile.role !== "creator" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Çok fazla istek. Lütfen 1 dakika bekleyin." }, { status: 429 });
    }

    // ♥ Parse Request
    const body = await req.json();
    const { topic, style, sections, colorScheme, mood } = body as {
      topic: string; style: string; sections: string; colorScheme: string; mood: string;
    };

    if (!topic || typeof topic !== "string" || topic.length > 200) {
      return NextResponse.json({ error: "Konu geçersiz (max 200 karakter)" }, { status: 400 });
    }

    const userInput = `Konu: ${topic.slice(0, 200)}
${style ? `Stil: ${style.slice(0, 100)}` : ""}
${sections ? `Bölümler: ${sections.slice(0, 200)}` : ""}
${colorScheme ? `Renkler: ${colorScheme.slice(0, 100)}` : ""}
${mood ? `Atmosfer: ${mood.slice(0, 100)}` : ""}`.trim();

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // ══════════════════════════════════════════════════════
    // ♥ STEP 1: HAYAL KUR — konsept oluştur
    // ══════════════════════════════════════════════════════

    console.log("♥ Step 1: Analyzing concept...");
    const step1 = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      temperature: 1,
      system: STEP1_PROMPT,
      messages: [{ role: "user", content: userInput }],
    });

    const step1Text = step1.content.find((b) => b.type === "text")?.text || "";
    const step1Parsed = parseJSON(step1Text);
    const concept = validateConcept(step1Parsed);

    if (!concept) {
      console.error("♥ Step 1 failed, using fallback. Raw:", step1Text.slice(0, 300));
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    console.log("♥ Step 1 OK:", concept.mood, concept.architecture, concept.isDarkTheme ? "DARK" : "LIGHT");

    // ══════════════════════════════════════════════════════
    // ♥ STEP 2: İNŞA ET — CSS + metinler yaz
    // ══════════════════════════════════════════════════════

    console.log("♥ Step 2: Building CSS + texts...");
    const step2 = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      temperature: 0.7,
      system: buildStep2Prompt(concept),
      messages: [{ role: "user", content: `Konu: ${topic.slice(0, 200)}` }],
    });

    const step2Text = step2.content.find((b) => b.type === "text")?.text || "";
    const step2Parsed = parseJSON(step2Text);
    const impl = validateImplementation(step2Parsed);

    if (!impl) {
      console.error("♥ Step 2 failed, using fallback. Raw:", step2Text.slice(0, 300));
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    console.log("♥ Step 2 OK: CSS length:", impl.customCSS.length, "chars");

    // ══════════════════════════════════════════════════════
    // ♥ STEP 3: KONTROL ET — sorunları bul ve düzelt
    // ══════════════════════════════════════════════════════

    console.log("♥ Step 3: Reviewing...");
    let finalCSS = impl.customCSS;

    try {
      const step3 = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        temperature: 0,
        system: buildStep3Prompt(concept, impl.customCSS),
        messages: [{ role: "user", content: "Bu CSS'i kontrol et ve sorunları düzelt." }],
      });

      const step3Text = step3.content.find((b) => b.type === "text")?.text || "";
      const step3Parsed = parseJSON(step3Text);
      const review = validateReview(step3Parsed);

      if (review?.fixedCSS && review.fixedCSS.length > 50) {
        console.log("♥ Step 3: Issues found and fixed:", review.issues?.join(", ") || "auto-fixed");
        finalCSS = review.fixedCSS;
      } else {
        console.log("♥ Step 3: No issues found, CSS is clean");
      }
    } catch (e) {
      console.warn("♥ Step 3 failed, using original CSS:", e);
    }

    // ══════════════════════════════════════════════════════
    // ♥ MERGE + ASSEMBLE
    // ══════════════════════════════════════════════════════

    const response = mergeToResponse(concept, { customCSS: finalCSS, defaultTexts: impl.defaultTexts });
    const html = assembleTemplate(response);

    console.log("♥ Template assembled successfully");
    return NextResponse.json({ html });

  } catch (error: any) {
    console.error("AI template error:", error);

    if (error?.status === 429) {
      return NextResponse.json(
        { error: "AI servisi meşgul. Lütfen birkaç saniye bekleyin." },
        { status: 429 }
      );
    }

    const message = error.message || "Şablon oluşturma hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
