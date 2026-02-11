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

    // --- JSON-mode system prompt ---
    const systemPrompt = `Sen bir tasarım direktörüsün. Forilove platformu için aşk/anı sayfası tasarım kararları üretiyorsun.

SADECE JSON döndür. HTML üretme. Aşağıdaki yapıda JSON döndür:

{
  "fonts": ["GoogleFontAdi:wght@400;700", "DigerFont:wght@300;400;500"],
  "cssVariables": {
    "--primary": "#hex",
    "--primary-light": "#hex",
    "--dark": "#hex",
    "--text": "#hex",
    "--text-light": "#hex",
    "--accent": "#hex"
  },
  "sections": ["hero","date","gallery","love_letter","timeline","footer"],
  "animations": { "hero": "fadeInUp", "sections": "fadeInUp" },
  "bodyBackground": "#fff",
  "customCSS": "",
  "defaultTexts": {
    "title": "Sayfa başlığı",
    "subtitle": "Alt başlık",
    "special_date": "14.02.2024",
    "gallery_subtitle": "Galeri açıklaması",
    "letter": "Mektup metni",
    "milestone_1_title": "Anı 1 başlık",
    "milestone_1_text": "Anı 1 açıklama",
    "milestone_2_title": "Anı 2 başlık",
    "milestone_2_text": "Anı 2 açıklama",
    "footer_text": "Alt yazı",
    "countdown_date": "2025-02-14",
    "countdown_label": "Geri sayım etiketi",
    "quote_text": "Alıntı metni",
    "quote_author": "Alıntı yazarı",
    "video_caption": "Video açıklaması"
  }
}

## KURALLAR
- fonts: 2 Google Font seç — ilki başlık fontu (Playfair Display, Cormorant Garamond, Dancing Script, Lora, Great Vibes, Parisienne, Cinzel, Bodoni Moda gibi), ikincisi gövde fontu (Inter, Poppins, Lato, Nunito, Open Sans, Montserrat gibi). Format: "FontAdi:wght@400;700"
- cssVariables: 6 HEX renk. Temaya uygun, uyumlu palet seç. --primary ana vurgu rengi, --primary-light açık arka plan, --dark koyu ton, --text ana metin, --text-light ikincil metin, --accent ikincil vurgu.
- sections: Mevcut bölümler: hero, date, gallery, love_letter, timeline, countdown, quotes, video, footer. Konuya göre 5-7 bölüm seç. hero ve footer hemen her zaman olmalı.
- animations: hero ve sections için animasyon. Seçenekler: "fadeInUp", "fadeIn", "scaleIn". Konuya göre seç.
- bodyBackground: Arka plan rengi veya gradient. Genellikle "#fff" veya çok açık bir ton.
- customCSS: Ek CSS (max 3000 karakter). Bunu kullanarak şablona özel stil ekleyebilirsin. Örnek: .hero-bg::after gradient'ını değiştirme, bölümlere özel arka planlar, dekoratif kenarlıklar vb.
- defaultTexts: Tüm bölümlerdeki editable alanların varsayılan metinleri. Türkçe, duygusal, konuya uygun olmalı.

## ÖNEMLİ
- Farklı konular için FARKLI fontlar, renkler ve bölüm kombinasyonları seç
- Renkler konuya uygun olmalı: Sevgililer günü=kırmızı/pembe, Yıldönümü=altın/bordo, Evlilik teklifi=beyaz/gül, Doğum günü=neşeli renkler
- defaultTexts konuya özel, anlamlı Türkçe metinler içermeli`;

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
