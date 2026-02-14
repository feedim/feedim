import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_DOMAINS = [
  "instagram.com", "www.instagram.com",
  "tiktok.com", "www.tiktok.com",
  "youtube.com", "www.youtube.com", "youtu.be",
  "twitter.com", "www.twitter.com", "x.com", "www.x.com",
  "facebook.com", "www.facebook.com",
  "twitch.tv", "www.twitch.tv",
  "linkedin.com", "www.linkedin.com",
  "pinterest.com", "www.pinterest.com",
  "threads.net", "www.threads.net",
  "kick.com", "www.kick.com",
];

function isValidSocialUrl(url: string): boolean {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(fullUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(d => hostname === d);
  } catch {
    return false;
  }
}

function sanitizeText(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// GET: Check existing application
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: application } = await admin
      .from("affiliate_applications")
      .select("id, status, social_media, followers, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ application: application || null });
  } catch (error) {
    console.error("Affiliate apply GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST: Submit application
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role, name, surname")
      .eq("user_id", user.id)
      .single();

    if (profile?.role === "affiliate" || profile?.role === "admin") {
      return NextResponse.json({ error: "Zaten affiliate veya admin hesabınız var" }, { status: 400 });
    }

    // Check pending or recently rejected application (rate limit: 1 per hour)
    const { data: recentApp } = await admin
      .from("affiliate_applications")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentApp?.status === "pending") {
      return NextResponse.json({ error: "Zaten bekleyen bir başvurunuz var" }, { status: 400 });
    }
    if (recentApp) {
      const cooldown = Date.now() - new Date(recentApp.created_at).getTime();
      if (cooldown < 60 * 60 * 1000) {
        return NextResponse.json({ error: "Bir saat içinde tekrar başvuramazsınız" }, { status: 429 });
      }
    }

    const body = await request.json();
    const { socialMedia, followers, description } = body;

    // Validate social media URL
    if (!socialMedia || typeof socialMedia !== "string" || !socialMedia.trim()) {
      return NextResponse.json({ error: "Sosyal medya hesabı zorunludur" }, { status: 400 });
    }
    const cleanSocialMedia = sanitizeText(socialMedia.trim()).slice(0, 200);
    if (!isValidSocialUrl(cleanSocialMedia)) {
      return NextResponse.json({ error: "Geçerli bir sosyal medya linki girin (Instagram, TikTok, YouTube, X vb.)" }, { status: 400 });
    }

    // Validate followers - only digits, max safe integer
    if (!followers || typeof followers !== "string" || !followers.trim()) {
      return NextResponse.json({ error: "Takipçi sayısı zorunludur" }, { status: 400 });
    }
    const cleanFollowers = followers.trim().replace(/\D/g, "");
    if (!cleanFollowers || cleanFollowers.length === 0 || cleanFollowers.length > 12) {
      return NextResponse.json({ error: "Geçerli bir takipçi sayısı girin" }, { status: 400 });
    }
    const followersNum = parseInt(cleanFollowers, 10);
    if (!Number.isFinite(followersNum) || followersNum <= 0) {
      return NextResponse.json({ error: "Geçerli bir takipçi sayısı girin" }, { status: 400 });
    }

    // Sanitize description
    const cleanDescription = sanitizeText((description || "").slice(0, 300));

    const fullName = [profile?.name, profile?.surname].filter(Boolean).join(" ") || user.email?.split("@")[0] || "";

    const { error } = await admin
      .from("affiliate_applications")
      .insert({
        user_id: user.id,
        email: user.email,
        full_name: sanitizeText(fullName).slice(0, 100),
        social_media: cleanSocialMedia,
        followers: cleanFollowers,
        description: cleanDescription,
        status: "pending",
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Affiliate apply error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
