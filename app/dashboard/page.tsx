import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardClient from "@/components/DashboardClient";

export const metadata: Metadata = {
  title: "Feedim — Keşfet ve Paylaş",
  description:
    "İlham veren içerikler keşfet, videolar izle, düşüncelerini paylaş ve gündemi sen belirle.",
};

export const dynamic = "force-dynamic";

async function getMoments(limit = 4) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("posts")
      .select("id, title, slug, video_url, video_thumbnail, featured_image, video_duration, profiles(user_id, username, full_name, name, avatar_url, is_verified, premium_plan, role)")
      .eq("content_type", "moment")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const moments = await getMoments(4);
  return <DashboardClient initialMoments={moments} />;
}
