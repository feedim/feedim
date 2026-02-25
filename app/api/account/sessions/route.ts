import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";
import { safeError } from "@/lib/apiError";

function parseUA(ua: string | null): string {
  if (!ua) return "Bilinmeyen cihaz";
  let browser = "Tarayıcı";
  let os = "";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return os ? `${browser}, ${os}` : browser;
}

// GET: List user's sessions
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    const { data: sessions } = await admin
      .from("sessions")
      .select("id, device_hash, ip_address, user_agent, is_active, is_trusted, created_at, last_active_at")
      .eq("user_id", user.id)
      .order("last_active_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ sessions: sessions || [] });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST: Record current session
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { device_hash, user_agent } = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";

    const admin = createAdminClient();

    // Check if session with same device_hash exists
    if (device_hash) {
      const { data: existing } = await admin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("device_hash", device_hash)
        .eq("is_active", true)
        .single();

      if (existing) {
        // Update last_active_at
        await admin
          .from("sessions")
          .update({ last_active_at: new Date().toISOString(), ip_address: ip })
          .eq("id", existing.id);
        return NextResponse.json({ session_id: existing.id });
      }
    }

    // Count active sessions and check if this device_hash has ever been seen
    const [{ count: activeCount }, deviceSeen] = await Promise.all([
      admin
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true),
      device_hash
        ? admin
            .from("sessions")
            .select("id")
            .eq("user_id", user.id)
            .eq("device_hash", device_hash)
            .limit(1)
            .then(({ data }) => data && data.length > 0)
        : Promise.resolve(false),
    ]);

    const totalActive = activeCount || 0;
    // First ever session is always trusted; otherwise trust up to 5 active
    const isFirstSession = totalActive === 0;
    const isTrusted = isFirstSession || totalActive < 5;

    // Insert new session
    const { data: session } = await admin
      .from("sessions")
      .insert({
        user_id: user.id,
        device_hash: device_hash || null,
        ip_address: ip,
        user_agent: user_agent || null,
        is_active: true,
        is_trusted: isTrusted,
      })
      .select("id")
      .single();

    // Send device login notification only for truly new devices
    if (session?.id && !isFirstSession && !deviceSeen) {
      const device = parseUA(user_agent);
      createNotification({
        admin,
        user_id: user.id,
        actor_id: user.id,
        type: 'device_login',
        content: device,
      }).catch(() => {});
    }

    return NextResponse.json({ session_id: session?.id, total_sessions: totalActive + 1 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PUT: Update session trust status
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { session_id, is_trusted } = await req.json();
    if (!session_id || typeof is_trusted !== "boolean") {
      return NextResponse.json({ error: "session_id ve is_trusted gerekli" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("sessions")
      .update({ is_trusted })
      .eq("id", session_id)
      .eq("user_id", user.id);

    if (error) return safeError(error);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE: End a session or all sessions
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionId = req.nextUrl.searchParams.get("id");
    const all = req.nextUrl.searchParams.get("all") === "true";

    const admin = createAdminClient();

    if (all) {
      // End all sessions except current
      await admin
        .from("sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_active", true);
      return NextResponse.json({ success: true, message: "Tüm oturumlar sonlandırıldı" });
    }

    if (sessionId) {
      // End specific session
      const { error } = await admin
        .from("sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (error) return safeError(error);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Session ID gerekli" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
