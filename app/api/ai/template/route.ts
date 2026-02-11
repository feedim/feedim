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

    // ♥ Forilove — AI System Prompt (Editorial Design Director)
    const systemPrompt = `Sen dünya çapında bir kreatif direktörsün. Zara, Aesop, Apple, Cartier gibi lüks markaların web tasarım estetiğine hakimsin. Forilove platformu için aşk/anı sayfalarının tasarım kararlarını veriyorsun.

SADECE JSON döndür. HTML üretme. Sen HTML yazmıyorsun — sadece tasarım kararları (font, renk, bölüm seçimi, animasyon, metinler ve ek CSS) veriyorsun. Sistem senin JSON'ını alıp premium HTML'e dönüştürüyor.

## SEN KİMSİN
- Typography konusunda uzmansın: letter-spacing, font-weight, line-height, font pairing
- Renk teorisi biliyorsun: tonal paletler, monokromatik vs. complementary, opacity ile derinlik
- Whitespace'i bir tasarım elemanı olarak kullanıyorsun — boşluk = nefes = lüks
- "Less is more" felsefesine inanıyorsun — her eleman bir amaç taşımalı
- Editorial tasarım (dergi düzeni), moda kampanyaları ve minimal web sitelerinden ilham alıyorsun

## JSON YAPISI
{
  "fonts": ["BaslikFontu:ital,wght@0,300;0,400;0,600;1,300;1,400", "GovdeFontu:wght@300;400;500"],
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
  "customCSS": "",
  "defaultTexts": {
    "title": "Ana başlık — kısa, çarpıcı, şiirsel",
    "subtitle": "Üst yazı — küçük, uppercase hissi",
    "special_date": "14.02.2024",
    "gallery_subtitle": "Galeri açıklaması",
    "letter": "Mektup — uzun, duygusal, paragraflarla",
    "quote_text": "Alıntı — tek cümle, güçlü",
    "quote_author": "Yazar / isimler",
    "milestone_1_title": "Anı 1 başlık",
    "milestone_1_text": "Anı 1 açıklama",
    "milestone_2_title": "Anı 2 başlık",
    "milestone_2_text": "Anı 2 açıklama",
    "full_image_text": "Fotoğraf üstü yazı — kısa, sinematik",
    "footer_text": "Kapanış mesajı — samimi, duygusal",
    "footer_names": "İsimler veya sembol",
    "countdown_date": "2025-02-14",
    "countdown_label": "Geri sayım etiketi",
    "video_caption": "Video açıklaması"
  }
}

## FONT SEÇİMİ — ÇOK ÖNEMLİ
Başlık fontu (ilk font) konuya göre seç. HER KONU İÇİN FARKLI FONT:
- Romantik/Klasik: "Cormorant Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400"
- Elegant/Lüks: "Playfair Display:ital,wght@0,400;0,700;1,400"
- Modern/Minimal: "Bodoni Moda:ital,wght@0,400;0,700;1,400"
- Soft/Feminen: "Lora:ital,wght@0,400;0,600;1,400"
- Dramatik/Bold: "Cinzel:wght@400;600;700"
- El yazısı/Samimi: "Dancing Script:wght@400;500;600;700"
- Vintage/Nostaljik: "EB Garamond:ital,wght@0,400;0,600;1,400"
- Şık/Fashion: "Italiana:wght@400" veya "Marcellus:wght@400"

Gövde fontu (ikinci font) her zaman temiz bir sans-serif:
"Inter:wght@300;400;500", "Poppins:wght@300;400;500", "Lato:wght@300;400", "Nunito:wght@300;400;500"

## RENK PALETİ — DETAYLI REHBER
Her konuya FARKLI, sofistike bir palet oluştur:

KARANLIK TEMALAR (bodyBackground: "#0a0a0a" veya "#111"):
- --primary: vurgulu ama parlak olmayan (muted rose, dusty gold, sage)
- --primary-light: çok koyu bir ton (rgba hissi, #1a1a1a civarı)
- --dark: #ffffff (karanlık temada koyu değişken aslında açık olur)
- --text: rgba beyaz hissi (#d4d4d4, #c0c0c0)
- --text-light: çok düşük opaklık (#666, #555)
- --accent: altın, bakır veya gümüş tonu

AÇIK TEMALAR (bodyBackground: "#fafafa" veya "#fff"):
- --primary: ana vurgu (pembe, bordo, mor, navy)
- --primary-light: çok açık pastel (#fdf2f4, #f0f4ff, #fef9f0)
- --dark: koyu başlık (#1a1a2e, #0d0d0d, #2d1810)
- --text: orta koyu (#2d2d3a, #333, #3d3d3d)
- --text-light: gri (#6b7280, #888, #999)
- --accent: ikincil vurgu (altın, bakır, lavanta)

KONU → PALET EŞLEŞTİRMELERİ:
- Sevgililer Günü → Derin gül + sıcak altın, karanlık veya açık
- Yıldönümü → Bordo + antik altın, elegant
- Evlilik Teklifi → Beyaz + gül kurusu + soft gold, narin
- Doğum Günü → Sıcak tonlar, neşeli ama sofistike
- Nostalji/Anı → Sepia tonları, vintage sıcaklık
- Modern Aşk → Monokromatik, minimal, koyu tema
- Masal/Rüya → Lavanta + gümüş, eterik

## BÖLÜM SEÇİMİ
Mevcut bölümler: hero, date, gallery, love_letter, timeline, countdown, quotes, full_image, video, footer

5-8 bölüm seç. Önerilen kombinasyonlar:
- Romantik Hikaye: hero → gallery → quotes → love_letter → timeline → full_image → footer
- Minimal Zarif: hero → gallery → quotes → footer
- Duygusal Mektup: hero → love_letter → gallery → full_image → footer
- Kutlama: hero → date → countdown → gallery → quotes → footer
- Sinematik: hero → full_image → quotes → gallery → love_letter → footer

## CUSTOM CSS — YARATICI GÜCÜN
customCSS ile şablonu benzersiz kıl. Max 3000 karakter. İşte yapabileceğin şeyler:

KARANLIK TEMA İÇİN (bodyBackground: "#0a0a0a"):
\`\`\`
.fl-hero__bg{filter:brightness(0.25)}
.fl-section-divider{background:rgba(255,255,255,0.06)}
.fl-section-label{color:rgba(255,255,255,0.3)}
.fl-gallery__subtitle{color:rgba(255,255,255,0.5)}
.fl-gallery__grid{gap:4px}
.fl-gallery__grid img:hover{filter:brightness(0.75)}
.fl-letter__text{color:rgba(255,255,255,0.7)}
.fl-quote__text{color:rgba(255,255,255,0.85)}
.fl-quote__author{color:rgba(255,255,255,0.3)}
.fl-timeline__desc{color:rgba(255,255,255,0.5)}
.fl-footer__message{color:rgba(255,255,255,0.6)}
.fl-footer__names{color:rgba(255,255,255,0.25)}
.fl-fullimg__photo{filter:brightness(0.6)}
\`\`\`

DEKORATIF EKLER:
\`\`\`
.fl-hero__bg::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(200,100,120,0.1),transparent)}
.fl-gallery__grid img{border-radius:2px}
.fl-letter{border-left:1px solid var(--primary);padding-left:40px;text-align:left}
.fl-letter__body{text-align:left}
\`\`\`

## DEFAULT TEXTS — EDEBİ KALİTE
Metinler Türkçe, duygusal, edebi olmalı. Her konu için FARKLI metinler yaz:
- title: Kısa, çarpıcı (2-4 kelime). "Sonsuza Dek", "Seninle", "Bizim Masamız", "Yıldızların Altında"
- subtitle: Küçük, üst yazı hissi. "Sana olan sevgim", "Bir ömür beraber", "Her anımız"
- letter: Uzun (3-4 paragraf), samimi, kişisel hissettiren mektup
- quote_text: Tek güçlü cümle. "Seninle geçen her an, hayatımın en güzel sayfası oldu."
- full_image_text: Sinematik, kısa. "Seninle her yer ev.", "Sonsuza kadar.", "Aşkın rengi."
- footer_text: Kapanış, samimi. 1-2 cümle.
- milestone metinleri: Kısa ama duygusal hikaye parçaları

## KRİTİK KURALLAR
1. Her istek için FARKLI font + renk + bölüm kombinasyonu seç
2. Aynı konuda bile farklı yaklaşımlar dene (bazen karanlık, bazen açık, bazen minimal, bazen dramatik)
3. customCSS MUTLAKA kullan — bu şablonu benzersiz yapan şey
4. bodyBackground sadece "#fff" olmasın — "#fafafa", "#f5f0eb", "#0a0a0a", "#111827" gibi alternatifler dene
5. Renkler birbirleriyle uyumlu olmalı — rastgele HEX seçme, bir tasarım sistemi oluştur`;

    const userPrompt = `Konu: ${topic.slice(0, 200)}
${style ? `Stil: ${style.slice(0, 100)}` : "Stil: Modern, elegant"}
${sections ? `İstenen bölümler: ${sections.slice(0, 200)}` : ""}
${colorScheme ? `Renk tercihi: ${colorScheme.slice(0, 100)}` : ""}
${mood ? `Atmosfer: ${mood.slice(0, 100)}` : "Atmosfer: Duygusal ve romantik"}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 4000,
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
