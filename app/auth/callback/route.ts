import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Track cookies from Supabase operations
  let latestCookies: Array<{ name: string; value: string; options: any }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          latestCookies = [...cookiesToSet];
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check if MFA is enabled for this user
  let mfaEnabled = false;
  const user = data.session?.user;

  if (user) {
    try {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("mfa_enabled")
        .eq("user_id", user.id)
        .single();

      mfaEnabled = profile?.mfa_enabled === true;
    } catch {
      // If check fails, proceed without MFA
    }
  }

  if (mfaEnabled && user?.email) {
    // Sign out to clear the session
    await supabase.auth.signOut();

    // Redirect to verify-mfa (client will send OTP)
    const mfaResponse = new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
        <script>
          sessionStorage.setItem('mfa_email', ${JSON.stringify(user.email)});
          window.location.replace('/verify-mfa');
        </script>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );

    // Apply signout cookies
    latestCookies.forEach(({ name, value, options }) => {
      mfaResponse.cookies.set(name, value, options);
    });

    return mfaResponse;
  }

  // Normal flow - redirect to dashboard
  const normalResponse = new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <script>window.location.replace("/dashboard")</script>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );

  // Apply session cookies
  latestCookies.forEach(({ name, value, options }) => {
    normalResponse.cookies.set(name, value, options);
  });

  return normalResponse;
}
