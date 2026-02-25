import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // TR, EN, AZ için ayrı ayrı çalıştır
    const languages = ["tr", "en", "az"];
    const results: Record<string, number[]> = {};

    for (const lang of languages) {
      // Bu dildeki kullanıcıları bul
      const { data: users } = await admin
        .from("profiles")
        .select("user_id")
        .eq("language", lang)
        .limit(3000);

      const userIds = (users || []).map((u) => u.user_id);
      if (userIds.length === 0) continue;

      // Son 30 günde beğendikleri postları bul
      const { data: likes } = await admin
        .from("likes")
        .select("post_id")
        .in("user_id", userIds.slice(0, 500))
        .gte("created_at", thirtyDaysAgo)
        .limit(5000);

      const postIds = [...new Set((likes || []).map((l) => l.post_id))];
      if (postIds.length === 0) continue;

      // Bu postların etiketlerini çek
      const { data: postTags } = await admin
        .from("post_tags")
        .select("tag_id")
        .in("post_id", postIds.slice(0, 2000));

      // Tag frekanslarını say
      const tagCounts = new Map<number, number>();
      for (const pt of postTags || []) {
        tagCounts.set(pt.tag_id, (tagCounts.get(pt.tag_id) || 0) + 1);
      }

      // En popüler 100 tag ID
      const topTagIds = [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(([id]) => id);

      if (topTagIds.length === 0) continue;

      // Tag isimlerini çek
      const { data: tags } = await admin
        .from("tags")
        .select("id, name")
        .in("id", topTagIds);

      const tagMap = new Map((tags || []).map((t) => [t.id, t.name]));
      const topTagNames = topTagIds
        .map((id) => tagMap.get(id))
        .filter(Boolean) as string[];

      // AI'ya gönder — saçmaları ayıklasın, en iyi 10'u seçsin
      const aiResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: `Aşağıda bir sosyal medya platformunda ${lang.toUpperCase()} dilindeki kullanıcıların en çok beğendiği gönderilerdeki etiketler var (popülerlik sırasına göre). Bu etiketlerden kullanıcılara "İlgi Alanları" olarak önerilebilecek en mantıklı, anlamlı ve kaliteli 10 tanesini seç.

Şunları ÇIKAR:
- Spam etiketler (kesfet, fyp, viral, trending vb.)
- Platform adları (tiktok, instagram, youtube, netflix vb.)
- Çok genel/anlamsız kelimeler (edit, video, post, foto, komik, güzel vb.)
- Takip/beğeni spam (like4like, follow4follow vb.)
- Kişi adları veya anlamsız özel isimler
- Tek harfli veya anlamsız kısaltmalar

SADECE gerçek ilgi alanı/kategori niteliğinde olanları seç (sanat, tarih, edebiyat, müzik, spor, teknoloji, bilim gibi).

Etiketler: ${topTagNames.join(", ")}

Sadece seçtiğin 10 etiketin adını virgülle ayırarak yaz, başka hiçbir şey yazma.`,
          },
        ],
      });

      const text = aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";
      const selectedNames = text.split(",").map((s) => s.trim().toLowerCase().replace(/^#/, ""));

      // Seçilen tag'lerin ID'lerini bul
      const selectedIds: number[] = [];
      for (const [id, name] of tagMap) {
        if (selectedNames.includes(name.toLowerCase())) {
          selectedIds.push(id);
        }
      }

      results[lang] = selectedIds;
    }

    // DB'ye kaydet — önce eskileri sil, yenileri ekle
    await admin.from("suggested_tags").delete().neq("id", 0);

    const rows: { tag_id: number; language: string; position: number }[] = [];
    for (const [lang, tagIds] of Object.entries(results)) {
      tagIds.forEach((tagId, i) => {
        rows.push({ tag_id: tagId, language: lang, position: i });
      });
    }

    if (rows.length > 0) {
      await admin.from("suggested_tags").insert(rows);
    }

    return NextResponse.json({
      success: true,
      counts: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length])),
    });
  } catch (err) {
    console.error("suggested-tags cron error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
