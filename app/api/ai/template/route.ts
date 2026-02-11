// ════════════════════════════════════════════════════════════
// ♥ Forilove — 2-Step AI Template Generation
// ♥ Step 1: AI thinks — concept, colors, architecture
// ♥ Step 2: AI implements — CSS + texts
// ♥ Claude Haiku 4.5 — iterative quality
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  assembleTemplate,
  validateConcept,
  validateImplementation,
  mergeToResponse,
  validateAIResponse,
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
// ♥ Forilove — Step 1 Prompt: THINK (concept + colors)
// ════════════════════════════════════════════════════════════

const STEP1_PROMPT = `Sen bir premium web tasarım direktörüsün. Aşk sayfası için TASARIM KONSEPTI oluştur. SADECE JSON döndür.

Kullanıcının isteğine göre ÖZGÜN bir tasarım konsepti düşün:
- Renk paleti oluştur (6 renk, uyumlu ve profesyonel)
- Font çifti seç (başlık + gövde, Google Fonts'tan)
- Bölümleri seç (5-8 arası)
- Animasyon seviyesi belirle
- Arka plan rengi/gradienti belirle

RENK PALETİ KURALLARI (ÇOK ÖNEMLİ):
- Renkler birbiriyle HARMONİK olmalı
- primary: Ana vurgu rengi (buton, link, nokta rengi)
- primaryLight: Çok açık arka plan tonu (primary'nin %95 beyaza karışımı)
- dark: En koyu ton (footer arka planı, karanlık temalarda body)
- text: Ana metin rengi (okunabilir, göze batmayan)
- textLight: İkincil metin (label, açıklama, soluk yazılar)
- accent: İkincil vurgu (primary'den farklı, tamamlayıcı)
- Karanlık tema isterse: dark body, rgba beyaz text değerleri kullan
- Açık tema isterse: beyaz/krem body, koyu text değerleri kullan

FONT SEÇENEKLERİ:
Başlık: Cormorant Garamond, Playfair Display, Bodoni Moda, Lora, Cinzel, Dancing Script, EB Garamond, Marcellus, Italiana, Spectral, Libre Baskerville, Crimson Text, Montserrat
Gövde: Inter, Poppins, Lato, Nunito, Raleway, Montserrat
Format: "FontAdi:wght@400;700"

BÖLÜMLER: hero, date, gallery, love_letter, timeline, countdown, quotes, full_image, video, footer
hero + footer zorunlu. 5-8 bölüm seç.

ANİMASYON SEVİYELERİ:
- "sade": Kullanıcı minimal/sade/sakin istiyorsa
- "orta": Normal istekler
- "premium": Hareketli/özel/lüks istekler

MİMARİ FİKİRLER (ilham al, kopyalama):
- Sinematik karanlık, editöryal minimal, romantik sıcak, neon futuristik, vintage nostaljik, cesur modern, pastel rüya, lüks altın, doğa yeşili, okyanus mavisi...

JSON YAPISI:
{
  "mood": "konseptin ruh hali (2-3 kelime)",
  "architecture": "mimari yaklaşım (2-3 kelime)",
  "colorPalette": {
    "primary": "#hex",
    "primaryLight": "#hex",
    "dark": "#hex",
    "text": "#hex veya rgba(...)",
    "textLight": "#hex veya rgba(...)",
    "accent": "#hex"
  },
  "fonts": ["BaslikFont:wght@400;700", "GovdeFont:wght@300;400"],
  "sections": ["hero", "gallery", ...],
  "animationLevel": "sade|orta|premium",
  "bodyBackground": "#hex veya linear-gradient(...)"
}`;

// ════════════════════════════════════════════════════════════
// ♥ Forilove — Step 2 Prompt: IMPLEMENT (CSS + texts)
// ════════════════════════════════════════════════════════════

function buildStep2Prompt(concept: DesignConcept): string {
  return `Sen bir CSS ustasısın. Aşağıdaki tasarım konseptine göre customCSS ve metinler yaz. SADECE JSON döndür.

TASARIM KONSEPTİ:
- Ruh hali: ${concept.mood}
- Mimari: ${concept.architecture}
- Renkler: primary=${concept.colorPalette.primary}, primaryLight=${concept.colorPalette.primaryLight}, dark=${concept.colorPalette.dark}, text=${concept.colorPalette.text}, textLight=${concept.colorPalette.textLight}, accent=${concept.colorPalette.accent}
- Body arka plan: ${concept.bodyBackground}
- Animasyon seviyesi: ${concept.animationLevel}
- Bölümler: ${concept.sections.join(", ")}

OVERRIDE EDEBİLECEĞİN CSS CLASS'LARI:
HERO: .fl-hero .fl-hero-bg .fl-hero-overlay .fl-hero-deco .fl-hero-content .fl-hero-subtitle .fl-hero-title .fl-hero-date .fl-hero-scroll
GALLERY: .fl-gallery .fl-gallery-header .fl-gallery-subtitle .fl-gallery-grid .fl-gallery-img .fl-stagger-1 .fl-stagger-2 .fl-stagger-3 .fl-stagger-4
QUOTE: .fl-quote .fl-quote-deco .fl-quote-text .fl-quote-author
LETTER: .fl-letter .fl-letter-body .fl-letter-deco .fl-letter-text
TIMELINE: .fl-timeline .fl-timeline-track .fl-timeline-item .fl-timeline-dot .fl-timeline-title .fl-timeline-desc
FULL IMAGE: .fl-fullimg .fl-fullimg-photo .fl-fullimg-overlay .fl-fullimg-text
COUNTDOWN: .fl-countdown .fl-countdown-date .fl-countdown-text
DATE: .fl-date .fl-date-label .fl-date-value
FOOTER: .fl-footer .fl-footer-message .fl-footer-names
SHARED: .fl-label .fl-divider body

KULLANILABILIR ANİMASYONLAR (keyframe'ler zaten yüklü):
flFadeInUp, flFadeIn, flScaleIn, flSlideLeft, flSlideRight, flBounce, flPulse, flGlow, flFloat, flShimmer, flGradientShift, flZoomSlow, flTextReveal, flLineGrow, flDotPulse

STAGGER: .fl-stagger-1 (0.1s), .fl-stagger-2 (0.25s), .fl-stagger-3 (0.4s), .fl-stagger-4 (0.55s)
GİZLİ ELEMENTLER (customCSS ile aç): .fl-hero-deco, .fl-letter-deco, .fl-quote-deco, .fl-divider, .fl-hero-scroll

CSS YAZIM KURALLARI:
1. var(--primary), var(--text) gibi CSS değişkenlerini kullan
2. .fl-divider'ı display:block ile aç ve stillendir
3. .fl-hero-overlay gradient'ini konsepte göre ayarla
4. Karanlık tema ise: body rengini override et, text renklerini rgba(255,255,255,...) yap
5. .fl-gallery-img'e hover efekti ekle
6. .fl-quote-deco veya .fl-letter-deco'yu aç ve stillendir
7. .fl-footer arka planını ayarla
8. ${concept.animationLevel === "premium" ? "YOĞUN animasyon: hero bg zoom, gallery stagger, dot pulse, glow, float efektleri" : concept.animationLevel === "sade" ? "MİNİMAL animasyon: sadece fade, animasyon az" : "ORTA animasyon: stagger galeri, fade giriş, hafif hover"}
9. Minimum 800 karakter CSS yaz, detaylı ol
10. filter:brightness(), box-shadow, border-radius, letter-spacing, text-shadow gibi detayları kullan

JSON YAPISI:
{
  "customCSS": "tüm override CSS'ler tek string olarak — HER class için uygun stil yaz",
  "defaultTexts": {
    "title": "2-4 kelime çarpıcı başlık",
    "subtitle": "kısa üst yazı",
    "special_date": "14.02.2024",
    "gallery_subtitle": "galeri alt başlığı",
    "letter": "3+ paragraf samimi mektup",
    "quote_text": "güçlü tek cümle alıntı",
    "quote_author": "alıntı yazarı",
    "milestone_1_title": "anı 1 başlık",
    "milestone_1_text": "anı 1 açıklama",
    "milestone_2_title": "anı 2 başlık",
    "milestone_2_text": "anı 2 açıklama",
    "full_image_text": "fotoğraf üstü kısa metin",
    "countdown_date": "2025-02-14",
    "countdown_label": "geri sayım etiketi",
    "footer_text": "kapanış mesajı",
    "footer_names": "♥"
  }
}

METİN KURALLARI:
- Türkçe, duygusal, edebi
- title: kısa, çarpıcı (2-4 kelime)
- letter: en az 3 paragraf, samimi, duygusal
- quote_text: tek güçlü cümle
- Konseptin ruh haline uygun ton kullan`;
}

// ════════════════════════════════════════════════════════════
// ♥ Forilove — JSON Parser Helper
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
    // ♥ STEP 1: AI düşünür — konsept oluşturur
    // ══════════════════════════════════════════════════════

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
      console.error("Step 1 failed, using fallback. Raw:", step1Text.slice(0, 300));
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    // ══════════════════════════════════════════════════════
    // ♥ STEP 2: AI uygular — CSS + metinler yazar
    // ══════════════════════════════════════════════════════

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
      console.error("Step 2 failed, using fallback. Raw:", step2Text.slice(0, 300));
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    // ══════════════════════════════════════════════════════
    // ♥ MERGE + ASSEMBLE
    // ══════════════════════════════════════════════════════

    const response = mergeToResponse(concept, impl);
    const html = assembleTemplate(response);
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
