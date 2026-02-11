import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, createRateLimiter, parseAIJSON } from "@/lib/utils/ai";

interface HookInput {
  key: string;
  type: string;
  label: string;
  defaultValue: string;
}

const checkRateLimit = createRateLimiter(5);

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
      return NextResponse.json({ error: "Çok fazla istek. 1 dakika bekleyin." }, { status: 429 });
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
      return NextResponse.json({ error: "Prompt geçersiz veya çok uzun (max 500 karakter)" }, { status: 400 });
    }

    if (!Array.isArray(rawHooks) || rawHooks.length === 0 || rawHooks.length > 50) {
      return NextResponse.json({ error: "Hook listesi geçersiz (1-50 arası)" }, { status: 400 });
    }
    const hooks = sanitizeHooks(rawHooks);
    if (hooks.length === 0) {
      return NextResponse.json({ error: "Geçerli hook bulunamadı" }, { status: 400 });
    }

    // Today's date
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

    // Build numbered field list
    const fieldLines = hooks.map((h, i) => {
      let typeRule = '';
      if (h.type === 'text') typeRule = 'kısa metin yaz';
      else if (h.type === 'textarea') typeRule = 'uzun duygusal metin yaz (2-4 cümle)';
      else if (h.type === 'date') typeRule = `GG.AA.YYYY formatında tarih yaz (ör: ${todayStr})`;
      else if (h.type === 'color') typeRule = 'HEX renk kodu yaz (ör: #FF6B9D)';
      else if (h.type === 'url') typeRule = 'boş string yaz';
      return `${i + 1}. "${h.key}" (${h.label}) → ${typeRule}`;
    });

    const requiredKeys = hooks.map(h => `"${h.key}"`).join(', ');

    const systemPrompt = `Forilove anı sayfası içerik yazarısın. Kullanıcının anlattığı hikayeye göre sayfa içeriği üret.

Bugün: ${todayStr}

MUTLAKA UYULMASI GEREKEN KURALLAR:
1. Aşağıdaki ${hooks.length} alanın HER BİRİ için yeni değer üret. HİÇBİRİNİ ATLAMA.
2. Mevcut değerleri KULLANMA — her alan için HİKAYEYE UYGUN YENİ içerik yaz.
3. text alanları: Kısa, duygusal, çarpıcı başlıklar (max 100 karakter)
4. textarea alanları: Samimi, mektup tarzı uzun metinler (2-4 cümle)
5. date alanları: GG.AA.YYYY formatında. Kullanıcı tarih verdiyse kullan, yoksa hikayeye uygun bir tarih uydur.
6. color alanları: HEX renk kodu (romantik tonlar: #FF6B9D, #E91E63, #D32F2F, #FFD700)
7. url alanları: "" (boş string)
8. İsim geçiyorsa başlık ve metinlerde kullan.
9. "X yıllık" diyorsa başlangıç tarihini hesapla.
10. Sadece JSON döndür, başka hiçbir şey yazma.

DOLDURULMASI GEREKEN ${hooks.length} ALAN:
${fieldLines.join('\n')}`;

    const userMessage = `Hikaye: ${prompt.slice(0, 500)}

ÖNEMLİ: JSON'da şu ${hooks.length} key'in TAMAMI olmalı: ${requiredKeys}`;

    // Call Claude with assistant prefill to force JSON output
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let aiText = "";
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 4096,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { role: "user", content: userMessage },
            { role: "assistant", content: "{" },
          ],
        });
        const block = response.content[0];
        if (block.type === "text") {
          aiText = "{" + block.text;
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
    const aiValues = parseAIJSON(aiText) as Record<string, string> | null;
    if (!aiValues || typeof aiValues !== "object") {
      console.error("AI JSON parse error. Raw:", aiText.slice(0, 2000));
      return NextResponse.json({ error: "AI yanıtı parse edilemedi" }, { status: 500 });
    }

    // Build final values: ALL hook keys must be present
    const filteredValues: Record<string, string> = {};
    let filledByAI = 0;

    for (const hook of hooks) {
      const aiVal = aiValues[hook.key];
      if (typeof aiVal === "string" && aiVal.trim().length > 0) {
        filteredValues[hook.key] = aiVal.slice(0, 2000);
        filledByAI++;
      } else {
        // AI missed this key — use default as last resort
        filteredValues[hook.key] = hook.defaultValue;
      }
    }

    console.log(`AI generate: ${filledByAI}/${hooks.length} filled. Prompt: "${prompt.slice(0, 80)}"`);
    if (filledByAI < hooks.length / 2) {
      const missingKeys = hooks.filter(h => !aiValues[h.key] || typeof aiValues[h.key] !== 'string').map(h => h.key);
      console.warn(`AI generate: LOW COVERAGE. Missing: ${missingKeys.join(', ')}`);
    }

    return NextResponse.json({ values: filteredValues });
  } catch (error: any) {
    console.error("AI generate error:", error);
    if (error?.status === 429) {
      return NextResponse.json({ error: "AI meşgul. Birkaç saniye bekleyin." }, { status: 429 });
    }
    return NextResponse.json({ error: error.message || "AI oluşturma hatası" }, { status: 500 });
  }
}
