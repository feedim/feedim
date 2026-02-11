import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface HookInput {
  key: string;
  type: string;
  label: string;
  defaultValue: string;
}

// Rate limit: per-user, max 5 requests per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı (${ms / 1000}s)`)), ms)
    ),
  ]);
}

function sanitizeHooks(hooks: any[]): HookInput[] {
  const allowedTypes = new Set(["text", "textarea", "color", "date", "url", "video", "image", "background-image"]);
  return hooks
    .filter((h) => h && typeof h.key === "string" && h.key.length <= 64 && allowedTypes.has(h.type))
    .map((h) => ({
      key: h.key.slice(0, 64),
      type: h.type,
      label: (typeof h.label === "string" ? h.label : h.key).slice(0, 100),
      defaultValue: (typeof h.defaultValue === "string" ? h.defaultValue : "").slice(0, 500),
    }));
}

// Extract a compact text-only summary of the HTML template structure (no full HTML sent to AI)
function extractTemplateContext(html: string): string {
  if (!html) return "";
  // Extract text content hints from the HTML to understand the template's theme
  const textParts: string[] = [];
  // Get title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) textParts.push(`Şablon adı: "${titleMatch[1]}"`);
  // Get headings
  const headingMatches = html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi);
  for (const m of headingMatches) {
    const text = m[1].replace(/<[^>]*>/g, '').replace(/HOOK_\w+/g, '___').trim();
    if (text && text !== '___') textParts.push(text);
  }
  // Get data-area labels for section context
  const areaMatches = html.matchAll(/data-area="([^"]+)"/g);
  const areas: string[] = [];
  for (const m of areaMatches) areas.push(m[1].replace(/[_-]/g, ' '));
  if (areas.length > 0) textParts.push(`Bölümler: ${areas.join(', ')}`);
  return textParts.slice(0, 10).join(' | ');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen 1 dakika bekleyin." },
        { status: 429 }
      );
    }

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 200_000) {
      return NextResponse.json({ error: "İstek çok büyük" }, { status: 413 });
    }

    const body = await req.json();
    const { prompt, hooks: rawHooks, htmlContent } = body as {
      prompt: string;
      hooks: any[];
      htmlContent?: string;
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0 || prompt.length > 500) {
      return NextResponse.json(
        { error: "Prompt geçersiz veya çok uzun (max 500 karakter)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(rawHooks) || rawHooks.length === 0 || rawHooks.length > 50) {
      return NextResponse.json(
        { error: "Hook listesi geçersiz (1-50 arası)" },
        { status: 400 }
      );
    }
    const hooks = sanitizeHooks(rawHooks);
    if (hooks.length === 0) {
      return NextResponse.json({ error: "Geçerli hook bulunamadı" }, { status: 400 });
    }

    const imageHooks = hooks.filter((h) => h.type === "image" || h.type === "background-image");

    // Extract template context from HTML (compact, no raw HTML to AI)
    const templateContext = typeof htmlContent === "string"
      ? extractTemplateContext(htmlContent.slice(0, 50_000))
      : "";

    // Build detailed hook list for AI
    const hookLines = hooks.map((h) => {
      const typeGuide: Record<string, string> = {
        text: "kısa metin, max 100 karakter",
        textarea: "duygusal paragraf, max 500 karakter, satır sonları kullanılabilir",
        color: "HEX renk kodu (#FF6B9D gibi)",
        date: "GG.AA.YYYY formatında tarih",
        url: "boş string döndür",
        video: "boş string döndür",
        image: "İngilizce Unsplash arama kelimesi (2-4 kelime)",
        "background-image": "İngilizce Unsplash arama kelimesi (2-4 kelime)",
      };
      return `- key:"${h.key}" | tip:${h.type} | label:"${h.label}" | mevcut:"${h.defaultValue.slice(0, 80)}" → ${typeGuide[h.type] || "kısa metin"}`;
    });

    const systemPrompt = `Sen Forilove platformunun AI asistanısın. Kullanıcılar sevdikleri kişiler için özel anı sayfaları oluşturuyor. Sen kullanıcının yazdığı kısa açıklamadan yola çıkarak şablondaki TÜM düzenlenebilir alanları en uygun şekilde dolduruyorsun.

## Platform Bilgisi
Forilove, kişiselleştirilmiş dijital aşk/anı sayfaları oluşturma platformudur. Kullanıcılar şablon seçer, düzenler ve sevdikleriyle paylaşır. Sayfalar sevgililer günü, yıldönümü, doğum günü, evlilik teklifi gibi özel anlar için hazırlanır.

## Görevin
Kullanıcının prompt'unu dikkatlice analiz et:
- İsim geçiyorsa → isim alanlarına o ismi yaz
- Tarih geçiyorsa → tarih alanlarına o tarihi yaz
- İlişki süresi geçiyorsa → metinlerde buna referans ver
- Özel bir tema/ton istiyorsa → tüm içeriği buna göre uyarla
- Belirsiz alanlar için şablonun temasına uygun romantik/duygusal içerik üret

## Şablon Bağlamı
${templateContext || "Genel romantik anı sayfası"}

## Kurallar
1. Tüm metin içeriği Türkçe, samimi ve duygusal olmalı
2. text: kısa, öz metin (max 100 karakter). Başlıklar etkileyici, alt başlıklar tamamlayıcı olmalı
3. textarea: duygusal, içten paragraf (max 500 karakter). Mektup tarzında, kişiye özel hissettirmeli
4. color: HEX renk kodu. Şablonun temasına uygun romantik tonlar (pembe, kırmızı, bordo, altın, leylak)
5. date: GG.AA.YYYY formatında. Kullanıcı tarih verdiyse onu kullan, vermediyse bugünün tarihini kullan
6. url/video: her zaman boş string "" döndür
7. image/background-image: İngilizce Unsplash arama kelimesi (2-4 kelime). Romantik, çift temalı, estetik görseller için anahtar kelime yaz (örn: "romantic couple sunset", "love letter roses", "couple holding hands beach")
8. Her alanın label'ını ve mevcut değerini dikkate al — ne tür içerik beklendiğini anla
9. Hook key'inden de ipucu çıkar: "partner_name" → isim, "anniversary_date" → tarih, "love_message" → uzun mesaj, "cover_photo" → kapak görseli

## Çıktı
Sadece JSON döndür: {"key1":"değer1","key2":"değer2",...}
Başka hiçbir açıklama veya metin ekleme.

## Alanlar
${hookLines.join("\n")}`;

    // Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.85,
        maxOutputTokens: 2000,
      },
    });

    const result = await withTimeout(
      model.generateContent([
        { text: systemPrompt },
        { text: `Kullanıcının isteği: ${prompt.slice(0, 500)}` },
      ]),
      15_000,
      "Gemini"
    );

    const aiText = result.response.text();
    if (!aiText) {
      return NextResponse.json({ error: "AI yanıt üretemedi" }, { status: 500 });
    }

    let aiValues: Record<string, string>;
    try {
      aiValues = JSON.parse(aiText);
    } catch {
      return NextResponse.json({ error: "AI yanıtı parse edilemedi" }, { status: 500 });
    }

    // Unsplash image fetch
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey && unsplashKey !== "..." && imageHooks.length > 0) {
      const imageResults = await withTimeout(
        Promise.all(
          imageHooks.map(async (hook) => {
            const searchQuery = aiValues[hook.key];
            if (!searchQuery || typeof searchQuery !== "string") {
              return { key: hook.key, url: hook.defaultValue };
            }
            try {
              const res = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery.slice(0, 100))}&per_page=1&orientation=landscape`,
                {
                  headers: { Authorization: `Client-ID ${unsplashKey}` },
                  signal: AbortSignal.timeout(8_000),
                }
              );
              if (!res.ok) return { key: hook.key, url: hook.defaultValue };
              const data = await res.json();
              return {
                key: hook.key,
                url: data.results?.[0]?.urls?.regular || hook.defaultValue,
              };
            } catch {
              return { key: hook.key, url: hook.defaultValue };
            }
          })
        ),
        10_000,
        "Unsplash"
      ).catch(() => imageHooks.map((h) => ({ key: h.key, url: h.defaultValue })));

      for (const img of imageResults) {
        aiValues[img.key] = img.url;
      }
    }

    // Filter: only valid hook keys, string values
    const validKeys = new Set(hooks.map((h) => h.key));
    const filteredValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(aiValues)) {
      if (validKeys.has(key) && typeof value === "string") {
        filteredValues[key] = value.slice(0, 2000);
      }
    }

    return NextResponse.json({ values: filteredValues });
  } catch (error: any) {
    console.error("AI generate error:", error);
    const message = error.message || "AI oluşturma hatası";
    const status = message.includes("zaman aşımı") ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
