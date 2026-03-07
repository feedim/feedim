import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import { safeError } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const tErrors = await getTranslations("apiErrors");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 400 });
    }

    const { provider } = body;
    if (!provider) return NextResponse.json({ error: tErrors("providerRequired") }, { status: 400 });

    const identities = user.identities || [];
    const target = identities.find(i => i.provider === provider);
    if (!target) return NextResponse.json({ error: tErrors("identityNotFoundForProvider") }, { status: 404 });

    const emailIdentity = identities.find(i => i.provider === "email");
    if (!emailIdentity) {
      return NextResponse.json({ error: tErrors("cannotUnlinkNoPassword") }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("unlink_identity", {
      p_user_id: user.id,
      p_provider: provider,
    });

    if (error) {
      return NextResponse.json({ error: tErrors("unlinkFailed") }, { status: 500 });
    }

    // Flag so auto-linking on next Google login is blocked
    if (provider === "google") {
      await admin.from("profiles").update({ google_linked: false }).eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return safeError(err);
  }
}
