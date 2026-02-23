import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Check onboarding status + auto-unfreeze on login
  let needsOnboarding = false;
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, status")
      .eq("user_id", data.user.id)
      .single();
    needsOnboarding = !profile?.onboarding_completed;

    // Frozen accounts auto-activate on re-login
    if (profile?.status === "frozen") {
      await supabase
        .from("profiles")
        .update({ status: "active", frozen_at: null, moderation_reason: null })
        .eq("user_id", data.user.id);
    }
  }

  // Popup mode — send postMessage to opener and close
  const isPopup = requestUrl.searchParams.get("popup") === "true";

  if (isPopup) {
    const popupResponse = new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'AUTH_CALLBACK_COMPLETE', needsOnboarding: ${needsOnboarding} }, window.location.origin);
          }
          window.close();
        </script>
        <p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#666">Giriş başarılı! Bu pencere kapanacak...</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );

    latestCookies.forEach(({ name, value, options }) => {
      popupResponse.cookies.set(name, value, options);
    });
    popupResponse.cookies.set('fdm-status', '', { maxAge: 0, path: '/' });

    return popupResponse;
  }

  // Normal flow — redirect to onboarding if not completed
  const returnTo = requestUrl.searchParams.get("returnTo");
  const safeReturnTo = returnTo?.startsWith('/editor/') ? returnTo : null;
  const defaultDest = needsOnboarding ? "/onboarding" : (safeReturnTo ? `${safeReturnTo}?auth_return=true` : "/dashboard");

  const normalResponse = new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <script>
        // Record session
        (function() {
          try {
            var raw = [navigator.userAgent, screen.width+"x"+screen.height, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join("|");
            var h = 0;
            for (var i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
            var dh = Math.abs(h).toString(36);
            if (!localStorage.getItem("fdm_device_hash")) localStorage.setItem("fdm_device_hash", dh);
            else dh = localStorage.getItem("fdm_device_hash");
            fetch("/api/account/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ device_hash: dh, user_agent: navigator.userAgent })
            }).catch(function(){});
          } catch(e) {}
        })();

        var saved = localStorage.getItem('fdm_auth_return');
        if (${needsOnboarding}) {
          localStorage.removeItem('fdm_auth_return');
          window.location.replace("/onboarding");
        } else if (saved) {
          localStorage.removeItem('fdm_auth_return');
          window.location.replace(saved);
        } else {
          window.location.replace(${JSON.stringify(defaultDest)});
        }
      </script>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );

  // Apply session cookies
  latestCookies.forEach(({ name, value, options }) => {
    normalResponse.cookies.set(name, value, options);
  });
  normalResponse.cookies.set('fdm-status', '', { maxAge: 0, path: '/' });

  return normalResponse;
}
