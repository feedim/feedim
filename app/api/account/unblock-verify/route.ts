import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.status !== "blocked") {
    return NextResponse.json({ error: "Hesabınız kapatılmış değil" }, { status: 400 });
  }

  const { action, password, token } = await req.json();

  // Step 1: Şifre doğrulama
  if (action === "verify_password") {
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Geçerli bir şifre girin" }, { status: 400 });
    }

    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error } = await verifyClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (error) {
      return NextResponse.json({ error: "Şifre yanlış" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // Step 2: E-posta kodu doğrulama (signInWithOtp client'ta yapılır, verifyOtp burada)
  if (action === "verify_code") {
    if (!token || typeof token !== "string" || !/^\d{6,8}$/.test(token)) {
      return NextResponse.json({ error: "Geçersiz doğrulama kodu" }, { status: 400 });
    }

    const { error } = await supabase.auth.verifyOtp({
      email: user.email!,
      token,
      type: "email",
    });

    if (error) {
      return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş" }, { status: 400 });
    }

    // Her iki doğrulama başarılı — hesabı aç
    await admin.from("profiles").update({
      status: "active",
      spam_score: 0,
      moderation_reason: null,
    }).eq("user_id", user.id);

    return NextResponse.json({ success: true, message: "Hesabınız başarıyla açıldı" });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
