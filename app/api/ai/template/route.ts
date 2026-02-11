// ♥ Forilove — AI Template Generation (Claude Haiku 4.5)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  assembleTemplate,
  validateAIResponse,
  FALLBACK_RESPONSE,
  type AITemplateResponse,
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

// ♥ Forilove — System Prompt
const SYSTEM_PROMPT = `Sen premium web tasarım AI'ısın. Forilove aşk sayfaları için tasarım kararları üretiyorsun. SADECE JSON döndür.

Konuya göre BENZERSIZ bir tasarım oluştur. Her seferinde FARKLI mimari, renk, font, animasyon seviyesi, bölüm kombinasyonu kullan. Kullanıcı "sade" isterse minimal/az animasyon, "premium/özel" isterse yoğun animasyon + efekt kullan.

## customCSS — SÜPER GÜCÜN (min 1000 karakter)
Override edebileceğin class'lar:
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

## HAZİR ANİMASYON KÜTÜPHANESİ (customCSS'de kullan)
Bu keyframe'ler zaten yüklü, sadece customCSS'de class'lara ata:
flFadeInUp, flFadeIn, flScaleIn, flSlideLeft, flSlideRight, flBounce, flPulse, flGlow, flFloat, flShimmer, flRotate, flGradientShift, flRevealUp, flZoomSlow, flTextReveal, flLineGrow, flDotPulse

Stagger class'ları (galeri/timeline item'larda): .fl-stagger-1 (0.1s), .fl-stagger-2 (0.25s), .fl-stagger-3 (0.4s), .fl-stagger-4 (0.55s)
Dekoratif elementler (gizli, customCSS ile aç): .fl-hero-deco, .fl-letter-deco, .fl-quote-deco, .fl-divider, .fl-hero-scroll

## 6 MİMARİ — BİRİNİ SEÇ VEYA KARIŞTIR

1) KARANLIK SİNEMATİK: Siyah body, düşük opacity beyaz, brightness filtreli foto, ince çizgiler
2) SICAK ROMANTİK: Krem body, border-radius kartlar, box-shadow galeri, yumuşak tonlar
3) MİNİMAL EDİTÖRYEL: Beyaz body, az renk, ince border, büyük tipografi, bol boşluk
4) NEON GECE: Koyu body, neon vurgular, glow (text-shadow+box-shadow), futuristik
5) VİNTAGE SICAKLIK: Bej body, sepia, nostaljik, sıcak renkler, border-left quote
6) BOLD MODERN: Güçlü renkler, dev tipografi (font-weight:800, uppercase), cesur

## ANİMASYON SEVİYELERİ

SADE (kullanıcı sade/minimal isterse):
- animations: {"hero":"fadeIn","sections":"fadeIn"}
- customCSS'de animasyon yok veya çok az
- Temiz, sakin, nefes alan

ORTA:
- Stagger'lı galeri giriş: .fl-gallery-img{animation:flFadeInUp 0.8s ease-out both}
- Hero title reveal: .fl-hero-title{animation:flTextReveal 1.5s ease-out both}
- Divider çizgi animasyonu: .fl-divider{display:block;animation:flLineGrow 1s ease-out both}
- Timeline dot pulse: .fl-timeline-dot{animation:flDotPulse 2s ease-in-out infinite}

PREMIUM/YOĞUN (varsayılan, kullanıcı özel bir şey isterse daha da yoğun):
- Hero arka plan yavaş zoom: .fl-hero-bg{animation:flZoomSlow 20s ease-in-out infinite alternate}
- Hero dekoratif element: .fl-hero-deco{display:block;position:absolute;inset:0;z-index:1;background:radial-gradient(circle at 30% 70%,rgba(var(--primary-rgb),0.15),transparent 50%);animation:flPulse 4s ease-in-out infinite}
- Scroll göstergesi: .fl-hero-scroll{opacity:0.6;animation:flBounce 2s ease-in-out infinite}
- Galeri stagger giriş: .fl-gallery-img{animation:flFadeInUp 0.8s ease-out both}.fl-stagger-1{animation-delay:0.1s}.fl-stagger-2{animation-delay:0.25s}.fl-stagger-3{animation-delay:0.4s}.fl-stagger-4{animation-delay:0.55s}
- Quote dekoratif: .fl-quote-deco{display:block;width:60px;height:2px;background:var(--primary);margin:0 auto 32px;animation:flLineGrow 1.5s ease-out both}
- Letter dekoratif: .fl-letter-deco{display:block;font-size:80px;color:var(--primary);opacity:0.08;text-align:center;margin-bottom:-20px;animation:flFloat 3s ease-in-out infinite}
- Full image zoom: .fl-fullimg-photo{animation:flZoomSlow 25s ease-in-out infinite alternate}
- Neon glow: .fl-hero-title{text-shadow:0 0 30px var(--primary),0 0 60px var(--primary)}.fl-timeline-dot{animation:flGlow 2s ease-in-out infinite}
- Gradient arka plan: body{background:linear-gradient(135deg,#0a0a0a,#1a1020);background-size:200% 200%;animation:flGradientShift 15s ease infinite}
- Hover efektleri: .fl-gallery-img:hover{transform:scale(1.04) rotate(0.5deg);filter:brightness(1.05)}

## JSON YAPISI
{
  "fonts": ["BaslikFont:wght@400;700", "GovdeFont:wght@300;400;500"],
  "cssVariables": {"--primary":"#hex","--primary-light":"#hex","--dark":"#hex","--text":"#hex","--text-light":"#hex","--accent":"#hex"},
  "sections": ["hero","gallery","quotes","love_letter","timeline","full_image","footer"],
  "animations": {"hero":"fadeInUp","sections":"fadeIn"},
  "bodyBackground": "#fafafa",
  "customCSS": "MİN 1000 KARAKTER — animasyonlar + override'lar + dekoratif elementler",
  "defaultTexts": {"title":"","subtitle":"","special_date":"","gallery_subtitle":"","letter":"","quote_text":"","quote_author":"","milestone_1_title":"","milestone_1_text":"","milestone_2_title":"","milestone_2_text":"","full_image_text":"","footer_text":"","footer_names":"","countdown_date":"","countdown_label":"","video_caption":""}
}

## FONTLAR
Başlık (HER SEFERİNDE FARKLI): Cormorant Garamond, Playfair Display, Bodoni Moda, Lora, Cinzel, Dancing Script, EB Garamond, Marcellus, Italiana, Spectral, Libre Baskerville, Crimson Text
Gövde: Inter, Poppins, Lato, Nunito, Montserrat, Raleway
Font format: "FontAdi:wght@400;700" veya "FontAdi:ital,wght@0,400;0,700;1,400"

## BÖLÜMLER
Mevcut: hero, date, gallery, love_letter, timeline, countdown, quotes, full_image, video, footer
5-8 bölüm seç. hero + footer her zaman.

## METİNLER
Türkçe, duygusal, edebi. title: 2-4 kelime çarpıcı. letter: 3+ paragraf samimi. quote_text: güçlü tek cümle. full_image_text: sinematik kısa.

## KRİTİK
1. Her istekte FARKLI mimari + font + renk + animasyon kombinasyonu
2. customCSS HER ZAMAN DOLU, min 1000 karakter — animasyonlar, dekoratifler, override'lar
3. Basit prompt = premium sonuç. "sade" kelimesi yoksa YOĞUN animasyon kullan
4. Dekoratif elementleri (.fl-hero-deco, .fl-quote-deco, .fl-letter-deco, .fl-divider) customCSS ile AÇ ve stillendir
5. Stagger animasyonları galeri ve timeline'da MUTLAKA kullan`;

export async function POST(req: NextRequest) {
  try {
    // ♥ Forilove — Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || (profile.role !== "creator" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen 1 dakika bekleyin." },
        { status: 429 }
      );
    }

    // ♥ Forilove — Parse Request
    const body = await req.json();
    const { topic, style, sections, colorScheme, mood } = body as {
      topic: string;
      style: string;
      sections: string;
      colorScheme: string;
      mood: string;
    };

    if (!topic || typeof topic !== "string" || topic.length > 200) {
      return NextResponse.json({ error: "Konu geçersiz (max 200 karakter)" }, { status: 400 });
    }

    // ♥ Forilove — Build User Prompt
    const userPrompt = `Konu: ${topic.slice(0, 200)}
${style ? `Stil: ${style.slice(0, 100)}` : ""}
${sections ? `Bölümler: ${sections.slice(0, 200)}` : ""}
${colorScheme ? `Renkler: ${colorScheme.slice(0, 100)}` : ""}
${mood ? `Atmosfer: ${mood.slice(0, 100)}` : ""}`.trim();

    // ♥ Forilove — Call Claude Haiku 4.5
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      temperature: 1,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // ♥ Forilove — Extract Response
    const textBlock = message.content.find((b) => b.type === "text");
    const rawText = textBlock?.text || "";

    if (!rawText) {
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    // ♥ Forilove — Parse JSON (Claude might wrap in ```json```)
    let jsonStr = rawText.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Claude JSON parse error, using fallback. Raw:", rawText.slice(0, 500));
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    // ♥ Forilove — Validate & Assemble
    const validated = validateAIResponse(parsed);
    if (!validated) {
      console.error("Claude response validation failed, using fallback");
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    const html = assembleTemplate(validated);
    return NextResponse.json({ html });
  } catch (error: any) {
    console.error("AI template error:", error);

    // ♥ Forilove — Rate limit from Anthropic
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
