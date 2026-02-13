import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

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

function sanitizeHooks(hooks: any[]): HookInput[] {
  const allowedTypes = new Set(["text", "textarea", "color", "date", "url"]);
  return hooks
    .filter((h) => h && typeof h.key === "string" && h.key.length <= 64 && allowedTypes.has(h.type))
    .map((h) => ({
      key: h.key.slice(0, 64),
      type: h.type,
      label: (typeof h.label === "string" ? h.label : h.key).slice(0, 100),
      defaultValue: (typeof h.defaultValue === "string" ? h.defaultValue : "").slice(0, 500),
    }));
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
    const { prompt, hooks: rawHooks } = body as {
      prompt: string;
      hooks: any[];
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

    // Today's date
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

    // Build compact field list — each field on one line with type and what's expected
    const fieldLines = hooks.map((h) => {
      const defaultLen = h.defaultValue ? h.defaultValue.length : 0;
      const lenHint = defaultLen > 0 ? `, hedef ~${Math.min(defaultLen + 10, h.type === 'text' ? 60 : 200)} kar` : '';
      const typeHint = h.type === 'text' ? `çok kısa metin (3-6 kelime, max 60 kar)${lenHint}`
        : h.type === 'textarea' ? `kısa paragraf (2-3 cümle, max 200 kar)${lenHint}`
        : h.type === 'date' ? `tarih, format: GG.AA.YYYY`
        : h.type === 'color' ? 'hex renk, ör: #FF6B9D'
        : h.type === 'url' ? 'boş string döndür'
        : h.type;
      return `"${h.key}": ${typeHint} (label: "${h.label}")`;
    });

    // Required keys list for emphasis
    const requiredKeys = hooks.map(h => `"${h.key}"`).join(', ');

    const systemPrompt = `Sen romantik içerik yazarısın. Forilove platformu için aşk/anı sayfası içeriği üretiyorsun.

Bugün: ${todayStr}

GÖREV: Kullanıcının açıklamasına göre aşağıdaki TÜM alanları doldur. Hiçbir alan atlanmamalı.

ALANLAR (${hooks.length} adet):
${fieldLines.join('\n')}

KURALLAR:
- text: KISA VE ÖZ yaz. Başlıklar max 3-5 kelime, alt başlıklar max 8-10 kelime. Hero başlığı: max 4 kelime. Etiket/badge: 1-2 kelime. Asla uzun cümle yazma.
- textarea: Orta uzunlukta, samimi ve duygusal yaz. Max 2-3 cümle (150 karakter civarı). Mektup tarzı ama kısa tut. Paragraflar yapma.
- date: GG.AA.YYYY formatında. Kullanıcı tarih verdiyse onu kullan, yoksa ${todayStr}
- color: HEX renk kodu (#FF6B9D gibi). Romantik tonlar kullan (pembe, kırmızı, bordo, altın)
- url: Her zaman "" (boş string) döndür
- İsim geçiyorsa ilgili alanlarda kullan
- Belirsiz alanlar için şablona uygun romantik içerik üret
- "X yıllık" ifadesi varsa tarihi bugünden geriye hesapla
- ÖNEMLİ: label'daki ipucuna göre içeriğin uzunluğunu ayarla. "Başlık" = çok kısa, "Açıklama" = 1 cümle, "Mesaj/Mektup" = 2-3 cümle. Her alan için default değer uzunluğuna yakın tut.
- Emoji kullanma, sade ve doğal Türkçe yaz

JSON formatında SADECE bu key'leri içeren obje döndür: ${requiredKeys}
Başka hiçbir metin veya açıklama ekleme, sadece JSON.`;

    const userMessage = `${prompt.slice(0, 500)}

ÖNEMLİ: JSON'da şu ${hooks.length} key'in TAMAMI olmalı: ${requiredKeys}`;

    // Call Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    let aiText = "";
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });
        const block = response.content[0];
        if (block.type === "text") {
          aiText = block.text;
          break;
        }
        throw new Error("AI yanıt üretemedi");
      } catch (error: any) {
        const status = error?.status;
        if ((status === 429 || status === 529) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.min(2000 * Math.pow(2, attempt), 15000)));
          continue;
        }
        throw error;
      }
    }

    if (!aiText) {
      return NextResponse.json({ error: "AI yanıt üretemedi" }, { status: 500 });
    }

    // Parse JSON from AI response
    let aiValues: Record<string, string>;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      aiValues = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("AI JSON parse error. Raw response:", aiText.slice(0, 1000));
      return NextResponse.json({ error: "AI yanıtı parse edilemedi" }, { status: 500 });
    }

    // Build final values: ensure ALL hook keys are present
    const validKeys = new Set(hooks.map((h) => h.key));
    const filteredValues: Record<string, string> = {};

    for (const hook of hooks) {
      const aiVal = aiValues[hook.key];
      if (typeof aiVal === "string" && aiVal.trim().length > 0) {
        filteredValues[hook.key] = aiVal.slice(0, 2000);
      } else {
        // Fallback: use default value if AI missed this key
        filteredValues[hook.key] = hook.defaultValue;
      }
    }

    // Log coverage for debugging
    const aiFilledCount = Object.keys(aiValues).filter(k => validKeys.has(k)).length;
    console.log(`AI generate: ${aiFilledCount}/${hooks.length} fields filled by AI, ${hooks.length - aiFilledCount} used defaults`);

    return NextResponse.json({ values: filteredValues });
  } catch (error: any) {
    console.error("AI generate error:", error);
    const message = error.message || "AI oluşturma hatası";
    const status = message.includes("zaman aşımı") ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
