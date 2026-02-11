import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface HookInput {
  key: string;
  type: string;
  label: string;
  defaultValue: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, hooks } = body as { prompt: string; hooks: HookInput[] };

    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.length > 500) {
      return NextResponse.json(
        { error: "Prompt geçersiz veya çok uzun (max 500 karakter)" },
        { status: 400 }
      );
    }
    if (!Array.isArray(hooks) || hooks.length === 0 || hooks.length > 50) {
      return NextResponse.json(
        { error: "Hook listesi geçersiz (1-50 arası)" },
        { status: 400 }
      );
    }

    // Separate hooks into text-type and image-type
    const textHooks: HookInput[] = [];
    const imageHooks: HookInput[] = [];

    for (const hook of hooks) {
      if (hook.type === "image" || hook.type === "background-image") {
        imageHooks.push(hook);
      } else {
        textHooks.push(hook);
      }
    }

    // Build hook descriptions for GPT
    const hookDescriptions = hooks.map((h) => {
      let instruction = "";
      switch (h.type) {
        case "text":
          instruction = "Kısa metin yaz (max 100 karakter)";
          break;
        case "textarea":
          instruction = "Duygusal, romantik paragraf yaz (max 500 karakter)";
          break;
        case "color":
          instruction = "HEX renk kodu ver (romantik tonlar: pembe, kırmızı, mor, altın)";
          break;
        case "date":
          instruction = "GG.AA.YYYY formatında bir tarih ver";
          break;
        case "url":
        case "video":
          instruction = "Boş string döndür";
          break;
        case "image":
        case "background-image":
          instruction =
            "İngilizce Unsplash arama kelimesi ver (2-4 kelime, romantik/ilişki temalı)";
          break;
        default:
          instruction = "Kısa metin yaz (max 100 karakter)";
      }
      return `- "${h.key}" (${h.type}, label: "${h.label}"): ${instruction}`;
    });

    // Call OpenAI GPT-4o
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Sen romantik bir sayfa tasarımcısısın. Kullanıcının verdiği bilgilere göre bir aşk/sevgi sayfasının tüm alanlarını doldur.

Kurallar:
- Türkçe, duygusal ve romantik içerik üret
- text: kısa metin, max 100 karakter
- textarea: duygusal paragraf, max 500 karakter
- color: HEX renk kodu (#FF6B9D gibi), romantik tonlarda
- date: GG.AA.YYYY formatında
- url ve video: boş string ""
- image ve background-image: İngilizce Unsplash arama kelimesi (2-4 kelime)

Sadece aşağıdaki key'ler için değer üret. JSON olarak döndür: { "key1": "değer1", "key2": "değer2", ... }

Alanlar:
${hookDescriptions.join("\n")}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const aiText = completion.choices[0]?.message?.content;
    if (!aiText) {
      return NextResponse.json(
        { error: "AI yanıt üretemedi" },
        { status: 500 }
      );
    }

    let aiValues: Record<string, string>;
    try {
      aiValues = JSON.parse(aiText);
    } catch {
      return NextResponse.json(
        { error: "AI yanıtı parse edilemedi" },
        { status: 500 }
      );
    }

    // Fetch Unsplash images for image hooks in parallel
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey && imageHooks.length > 0) {
      const imageResults = await Promise.all(
        imageHooks.map(async (hook) => {
          const searchQuery = aiValues[hook.key];
          if (!searchQuery || typeof searchQuery !== "string") {
            return { key: hook.key, url: hook.defaultValue };
          }

          try {
            const res = await fetch(
              `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
              {
                headers: {
                  Authorization: `Client-ID ${unsplashKey}`,
                },
              }
            );

            if (!res.ok) {
              return { key: hook.key, url: hook.defaultValue };
            }

            const data = await res.json();
            const photoUrl = data.results?.[0]?.urls?.regular;
            return {
              key: hook.key,
              url: photoUrl || hook.defaultValue,
            };
          } catch {
            return { key: hook.key, url: hook.defaultValue };
          }
        })
      );

      // Replace search keywords with actual Unsplash URLs
      for (const result of imageResults) {
        aiValues[result.key] = result.url;
      }
    }

    // Filter: only return keys that exist in the original hooks list
    const validKeys = new Set(hooks.map((h) => h.key));
    const filteredValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(aiValues)) {
      if (validKeys.has(key) && typeof value === "string") {
        filteredValues[key] = value;
      }
    }

    return NextResponse.json({ values: filteredValues });
  } catch (error: any) {
    console.error("AI generate error:", error);
    return NextResponse.json(
      { error: error.message || "AI oluşturma hatası" },
      { status: 500 }
    );
  }
}
