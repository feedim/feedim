import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkImageBuffer } from "@/lib/moderation";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // NSFW check on avatar image — block AND flag both rejected for profile photos
  const nsfwMime = file.type === "image/jpeg" || file.type === "image/jpg" ? "image/jpeg"
    : file.type === "image/png" ? "image/png"
    : file.type === "image/webp" ? "image/jpeg" // webp → treat as jpeg for decode
    : null;

  if (nsfwMime) {
    try {
      const nsfwResult = await checkImageBuffer(imageBuffer, nsfwMime);
      console.log("[AVATAR NSFW]", nsfwResult.action, JSON.stringify(nsfwResult.scores));
      if (nsfwResult.action !== "allow") {
        return NextResponse.json(
          { error: "Uygunsuz görsel tespit edildi. Bu görseli profil fotoğrafı olarak kullanamazsınız." },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error("[AVATAR NSFW] Check failed:", err);
    }
  }

  const key = `images/${fileName}`;
  const url = await uploadToR2(key, imageBuffer, file.type);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
