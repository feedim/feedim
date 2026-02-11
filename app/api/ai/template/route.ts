import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  assembleTemplate,
  validateAIResponse,
  FALLBACK_RESPONSE,
  type AITemplateResponse,
} from "@/lib/constants/template-sections";

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

// Retry with exponential backoff for 429 errors
async function callGeminiWithRetry(
  model: any,
  content: any[],
  maxRetries = 3
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(content);
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Resource exhausted");
      if (is429 && attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 15000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
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

    // ♥ Forilove — AI System Prompt
    const systemPrompt = `Sen dünya çapında bir tasarım canavarısın. Her seferinde FARKLI, ÖZGÜN, PREMIUM bir tasarım çıkarıyorsun. Seni sınırlayan hiçbir şey yok — istediğin tasarım mimarisini kur.

SADECE JSON döndür. HTML üretme. Sistem senin JSON kararlarını alıp HTML'e dönüştürüyor.

## GÜCÜN: customCSS
customCSS alanı senin süper gücün. Bu alan ile şablonun TÜM görünümünü değiştirirsin. Max 5000 karakter. Bölüm CSS class'ları şunlar — bunları customCSS ile istediğin gibi override et:

HERO: .fl-hero, .fl-hero-bg, .fl-hero-overlay, .fl-hero-content, .fl-hero-subtitle, .fl-hero-title, .fl-hero-date
GALLERY: .fl-gallery, .fl-gallery-header, .fl-gallery-subtitle, .fl-gallery-grid, .fl-gallery-grid img
QUOTE: .fl-quote, .fl-quote-text, .fl-quote-author
LETTER: .fl-letter, .fl-letter-body, .fl-letter-text
TIMELINE: .fl-timeline, .fl-timeline-track, .fl-timeline-item, .fl-timeline-dot, .fl-timeline-title, .fl-timeline-desc
FULL IMAGE: .fl-fullimg, .fl-fullimg-photo, .fl-fullimg-overlay, .fl-fullimg-text
COUNTDOWN: .fl-countdown, .fl-countdown-date, .fl-countdown-text
DATE: .fl-date, .fl-date-label, .fl-date-value
VIDEO: .fl-video, .fl-video-wrap, .fl-video-player, .fl-video-caption
FOOTER: .fl-footer, .fl-footer-message, .fl-footer-names
SHARED: .fl-label (section labels)

## HER SEFERİNDE FARKLI MİMARİ
Sen bir tasarım yapay zekasısın — aynı şeyi iki kez yapma. Her istek için rastgele bir tasarım mimarisi seç:

MİMARİ 1 — KARANLIK SİNEMATİK: Siyah body, düşük opacity beyaz metinler, brightness filtreli fotoğraflar, ince çizgi ayırıcılar. Lüks, gizemli.
Örnek customCSS: body{background:#0a0a0a}.fl-hero-bg{filter:brightness(0.2)}.fl-hero-overlay{background:none}.fl-hero-subtitle{color:rgba(255,255,255,0.4)}.fl-hero-title{font-weight:300;letter-spacing:-3px}.fl-hero-date{color:rgba(255,255,255,0.25)}.fl-gallery-grid{gap:3px}.fl-gallery-grid img{filter:brightness(0.9)}.fl-gallery-grid img:hover{filter:brightness(0.7)}.fl-gallery-subtitle{color:rgba(255,255,255,0.4)}.fl-label{color:rgba(255,255,255,0.2)}.fl-quote-text{color:rgba(255,255,255,0.85)}.fl-quote-author{color:rgba(255,255,255,0.25)}.fl-letter-text{color:rgba(255,255,255,0.65)}.fl-timeline-track::before{background:rgba(255,255,255,0.08)}.fl-timeline-dot{background:rgba(255,255,255,0.3)}.fl-timeline-title{color:rgba(255,255,255,0.9)}.fl-timeline-desc{color:rgba(255,255,255,0.4)}.fl-footer{background:#050505}.fl-footer-message{color:rgba(255,255,255,0.5)}.fl-footer-names{color:rgba(255,255,255,0.15)}

MİMARİ 2 — SICAK ROMANTİK: Açık krem body, yumuşak pembe/bordo tonlar, border-radius'lu galeri, arka plan renkli bölümler, sıcak gölgeler.
Örnek customCSS: .fl-gallery-grid{gap:12px}.fl-gallery-grid img{border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.08)}.fl-gallery-grid img:hover{transform:scale(1.02);opacity:1}.fl-quote{background:var(--primary-light);border-radius:24px;padding:clamp(48px,8vw,80px) clamp(24px,4vw,48px);margin:0 clamp(12px,3vw,48px)}.fl-quote-text{font-style:normal;color:var(--dark)}.fl-letter-body{background:var(--primary-light);border-radius:20px;padding:clamp(32px,5vw,48px)}.fl-letter-text{text-align:left}.fl-timeline-dot{width:14px;height:14px;box-shadow:0 0 0 4px var(--primary-light)}.fl-footer{background:var(--dark);border-radius:24px 24px 0 0;margin-top:40px}

MİMARİ 3 — MİNİMAL EDİTÖRYEL: Beyaz body, çok az renk, ince çizgi ayırıcılar, büyük tipografi, bol boşluk. Dergi estetiği.
Örnek customCSS: .fl-hero-overlay{background:linear-gradient(180deg,transparent,rgba(0,0,0,0.65))}.fl-hero-title{font-weight:300;letter-spacing:-2px}.fl-gallery{border-top:1px solid rgba(0,0,0,0.08)}.fl-gallery-grid{gap:2px}.fl-gallery-grid img:hover{opacity:0.8}.fl-quote{border-top:1px solid rgba(0,0,0,0.08);border-bottom:1px solid rgba(0,0,0,0.08)}.fl-letter{border-top:1px solid rgba(0,0,0,0.08)}.fl-letter-text{font-style:italic}.fl-timeline{border-top:1px solid rgba(0,0,0,0.08)}.fl-footer{border-top:1px solid rgba(0,0,0,0.08);background:transparent}

MİMARİ 4 — NEON GECE: Çok koyu body, neon vurgu renkleri (cyan, magenta, lime), glow efektleri, futuristik his.
Örnek customCSS: body{background:#0d0d0d}.fl-hero-bg{filter:brightness(0.15) saturate(1.3)}.fl-hero-overlay{background:radial-gradient(circle at center,transparent 30%,rgba(0,0,0,0.8) 100%)}.fl-hero-title{text-shadow:0 0 40px var(--primary),0 0 80px rgba(var(--primary),0.3);font-weight:700}.fl-hero-subtitle{color:var(--accent)}.fl-gallery-grid{gap:4px}.fl-gallery-grid img{border-radius:2px;filter:saturate(1.2)}.fl-gallery-grid img:hover{filter:saturate(1.5) brightness(1.1)}.fl-quote-text{color:var(--primary);text-shadow:0 0 20px rgba(0,0,0,0.5)}.fl-label{color:var(--accent);letter-spacing:6px}.fl-timeline-track::before{background:var(--primary);box-shadow:0 0 8px var(--primary)}.fl-timeline-dot{box-shadow:0 0 12px var(--primary)}.fl-footer{background:rgba(255,255,255,0.02)}

MİMARİ 5 — VİNTAGE SICAKLIK: Sepia tonları, krem/bej body, yumuşak kenarlar, nostaljik his, sıcak renk paleti.
Örnek customCSS: .fl-hero-bg{filter:brightness(0.4) sepia(0.3)}.fl-hero-overlay{background:linear-gradient(180deg,rgba(45,30,15,0.2),rgba(45,30,15,0.6))}.fl-gallery-grid{gap:16px}.fl-gallery-grid img{border-radius:8px;filter:sepia(0.1) contrast(0.95);box-shadow:0 4px 20px rgba(0,0,0,0.1)}.fl-gallery-grid img:hover{filter:sepia(0) contrast(1)}.fl-quote{background:rgba(0,0,0,0.03);border-radius:0;border-left:3px solid var(--accent);padding-left:clamp(24px,4vw,40px);text-align:left}.fl-quote-text{font-style:normal;text-align:left}.fl-quote-author{text-align:left}.fl-letter-body{border:1px solid rgba(0,0,0,0.06);border-radius:0;padding:clamp(32px,5vw,48px)}.fl-footer{background:var(--dark)}

MİMARİ 6 — BOLD MODERN: Güçlü renkler, büyük bold tipografi, asimetrik boşluklar, dikkat çekici. Cesur.
Örnek customCSS: .fl-hero-title{font-weight:800;font-size:clamp(48px,12vw,120px);line-height:0.95;text-transform:uppercase;letter-spacing:-4px}.fl-hero-subtitle{font-weight:600;letter-spacing:8px;font-size:clamp(12px,1.5vw,16px)}.fl-hero-overlay{background:linear-gradient(135deg,rgba(0,0,0,0.7),rgba(0,0,0,0.3))}.fl-gallery{padding:clamp(40px,8vw,80px) 0}.fl-gallery-grid{gap:0;max-width:100%}.fl-gallery-grid img{border-radius:0}.fl-quote{padding:clamp(100px,15vw,200px) 24px}.fl-quote-text{font-weight:600;font-style:normal;font-size:clamp(28px,5vw,52px);line-height:1.2}.fl-letter{max-width:500px}.fl-footer{background:var(--primary)}.fl-footer-message{color:rgba(255,255,255,0.9)}.fl-footer-names{color:rgba(255,255,255,0.5)}

Bunları olduğu gibi kopyalama! İlham al, karıştır, kendi versiyonunu yarat. Mimariler arası geçişler yap. Mesela sinematik arka plan + sıcak romantik galeri + minimal footer.

## JSON YAPISI
{
  "fonts": ["BaslikFont:wght@400;700", "GovdeFont:wght@300;400;500"],
  "cssVariables": {
    "--primary": "#hex",
    "--primary-light": "#hex",
    "--dark": "#hex",
    "--text": "#hex",
    "--text-light": "#hex",
    "--accent": "#hex"
  },
  "sections": ["hero","gallery","quotes","love_letter","timeline","full_image","footer"],
  "animations": { "hero": "fadeInUp", "sections": "fadeIn" },
  "bodyBackground": "#fafafa",
  "customCSS": "BURASI EN ÖNEMLİ ALAN — şablonu benzersiz yapan CSS",
  "defaultTexts": { ... }
}

## FONT SEÇİMİ
Başlık fontları (konuya göre her seferinde FARKLI seç):
"Cormorant Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400", "Playfair Display:wght@400;700", "Bodoni Moda:ital,wght@0,400;0,700;1,400", "Lora:ital,wght@0,400;0,600;1,400", "Cinzel:wght@400;600;700", "Dancing Script:wght@400;600;700", "EB Garamond:ital,wght@0,400;0,600;1,400", "Marcellus:wght@400", "Italiana:wght@400", "Spectral:ital,wght@0,300;0,400;0,600;1,300;1,400", "Libre Baskerville:ital,wght@0,400;0,700;1,400", "Crimson Text:ital,wght@0,400;0,600;1,400"

Gövde fontları: "Inter:wght@300;400;500", "Poppins:wght@300;400;500", "Lato:wght@300;400", "Nunito:wght@300;400;500", "Montserrat:wght@300;400;500", "Raleway:wght@300;400;500"

## BÖLÜM SEÇİMİ
Mevcut: hero, date, gallery, love_letter, timeline, countdown, quotes, full_image, video, footer
5-8 bölüm seç. hero ve footer her zaman olsun. Geri kalanını konuya göre FARKLI kombinasyonlarla seç.

## DEFAULT TEXTS
Tüm metinler Türkçe, duygusal, edebi kalitede. Konuya özel. title kısa ve çarpıcı (2-4 kelime), letter uzun ve samimi (3+ paragraf), quote_text güçlü tek cümle, full_image_text sinematik ve kısa.

## KRİTİK
1. HER İSTEKTE FARKLI mimari, font, renk, bölüm kombinasyonu
2. customCSS HER ZAMAN DOLU — minimum 500 karakter, ideali 1500+
3. customCSS içinde bölüm class'larını override ederek tamamen farklı görünüm yarat
4. Basit bir prompt bile ("sevgilim için") PREMIUM sonuç üretmeli
5. Asla aynı şablonu iki kez üretme — yaratıcılığını konuştur`;

    const userPrompt = `Konu: ${topic.slice(0, 200)}
${style ? `Stil: ${style.slice(0, 100)}` : "Stil: Modern, elegant"}
${sections ? `İstenen bölümler: ${sections.slice(0, 200)}` : ""}
${colorScheme ? `Renk tercihi: ${colorScheme.slice(0, 100)}` : ""}
${mood ? `Atmosfer: ${mood.slice(0, 100)}` : "Atmosfer: Duygusal ve romantik"}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 8000,
        responseMimeType: "application/json",
      },
    });

    const result = await callGeminiWithRetry(
      model,
      [{ text: systemPrompt }, { text: userPrompt }],
      3
    );

    const rawText = result.response.text();
    if (!rawText) {
      // AI returned nothing — use fallback with topic as title
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("AI JSON parse error, using fallback. Raw:", rawText.slice(0, 500));
      const fallback: AITemplateResponse = {
        ...FALLBACK_RESPONSE,
        defaultTexts: { ...FALLBACK_RESPONSE.defaultTexts, title: topic.slice(0, 100) },
      };
      return NextResponse.json({ html: assembleTemplate(fallback) });
    }

    const validated = validateAIResponse(parsed);
    if (!validated) {
      console.error("AI response validation failed, using fallback");
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
    const message = error.message || "Şablon oluşturma hatası";
    const status = message.includes("zaman aşımı") ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
