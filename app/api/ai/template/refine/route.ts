// ════════════════════════════════════════════════════════════
// ♥ Forilove — Template Refinement API
// ♥ Takes existing HTML + user prompt → AI refines the CSS
// ════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
// ♥ Sanitize CSS: strip !important, structural properties, and dangerous content
function sanitizeCustomCss(css: string): string {
  const structural = /\b(display|grid-template-columns|max-width|margin|padding|width|height|position|float|align-items|justify-content|gap|overflow|text-align)\s*:/gi;
  return css
    .replace(/!important/gi, '')
    .split('\n')
    .filter(line => !structural.test(line))
    .join('\n')
    .trim();
}

// ♥ Rate Limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("user_id", user.id).single();
    if (!profile || (profile.role !== "creator" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    }
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Çok fazla istek. 1 dakika bekleyin." }, { status: 429 });
    }

    const body = await req.json();
    const html = typeof body.html === "string" ? body.html : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";

    if (!html || !prompt) {
      return NextResponse.json({ error: "HTML ve prompt gerekli" }, { status: 400 });
    }

    // Extract current <style> content
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    const currentCSS = styleMatch ? styleMatch[1].slice(0, 4000) : "";

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      temperature: 0.7,
      system: `You are a CSS refinement expert for a love/memory page. The user wants to modify their existing template. Write ONLY new CSS overrides to ADD. Return ONLY raw CSS (no JSON, no markdown, no backticks).

Write in THE SAME LANGUAGE as the user's prompt.

RULES:
- Write ONLY visual CSS: color, background, border, border-radius, box-shadow, text-shadow, filter, opacity, font-size, font-weight, font-style, letter-spacing, line-height, text-transform, animation, transition, transform
- NEVER write structural CSS: display, grid-template-columns, max-width, margin, padding, width, height, position, float, align-items, justify-content, gap, overflow, text-align
- NEVER write !important
- NEVER set background on .fl-hero or .fl-hero-bg
- Hero text (.fl-hero-title, .fl-hero-subtitle, .fl-hero-date) must ALWAYS be white/light
- Use existing CSS classes: .fl-hero-overlay .fl-hero-deco .fl-gallery-img .fl-quote .fl-quote-deco .fl-quote-text .fl-letter .fl-letter-deco .fl-letter-text .fl-timeline-dot .fl-timeline-title .fl-countdown-date .fl-footer .fl-footer-message .fl-divider .fl-label body
- Keep it concise, max 1500 chars`,
      messages: [{
        role: "user",
        content: `Current CSS (last 2000 chars):\n${currentCSS.slice(-2000)}\n\nUser request: ${prompt}`,
      }],
    });

    const rawCSS = response.content.find(b => b.type === "text")?.text || "";
    // Clean markdown fences if any
    let cleanCSS = rawCSS.trim();
    const fenceMatch = cleanCSS.match(/```(?:css)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleanCSS = fenceMatch[1].trim();

    const safeCss = sanitizeCustomCss(cleanCSS);
    if (!safeCss || safeCss.length < 10) {
      return NextResponse.json({ error: "AI düzenleme üretemedi" }, { status: 500 });
    }

    // Inject refinement CSS before </style>
    const refinementBlock = `\n/* ♥ Forilove — Refinement */\n${safeCss}`;
    const updatedHtml = html.replace("</style>", `${refinementBlock}\n</style>`);

    return NextResponse.json({ html: updatedHtml });

  } catch (error: any) {
    if (process.env.NODE_ENV === "development") console.error("Refine error:", error);
    if (error?.status === 429) {
      return NextResponse.json({ error: "AI meşgul. Birkaç saniye bekleyin." }, { status: 429 });
    }
    return NextResponse.json({ error: error.message || "Düzenleme hatası" }, { status: 500 });
  }
}
