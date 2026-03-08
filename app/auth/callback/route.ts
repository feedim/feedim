import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSafeRedirectUrl } from "@/lib/utils";

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

  // Check onboarding status + auto-unfreeze on login + auto-create profile for OAuth
  let needsOnboarding = false;
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, status, google_linked, moderation_reason")
      .eq("user_id", data.user.id)
      .single();

    // Block Google auto-re-linking: if user previously unlinked Google, remove re-created identity and reject login
    const isGoogleLogin = data.user.app_metadata?.provider === "google" || data.user.identities?.some(i => i.provider === "google");
    if (profile && profile.google_linked === false && isGoogleLogin) {
      // Remove the auto-linked Google identity again
      const adminSb = createAdminClient();
      try { await adminSb.rpc("unlink_identity", { p_user_id: data.user.id, p_provider: "google" }); } catch {}
      // Invalidate the session created by exchangeCodeForSession
      await supabase.auth.signOut();
      // Don't give session — redirect to login with error
      return NextResponse.redirect(new URL("/login?error=google_unlinked", request.url));
    }

    // New OAuth user — no profile exists yet, create one
    if (!profile) {
      const meta = data.user.user_metadata || {};
      const email = data.user.email || "";

      // Email uniqueness check — block if another account uses this email
      if (email) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", email)
          .neq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();
        if (existingProfile) {
          // Delete the orphan auth user and redirect with error
          try { const adminSb = createAdminClient(); await adminSb.auth.admin.deleteUser(data.user.id); } catch {}
          return NextResponse.redirect(new URL("/login?error=email_in_use", request.url));
        }
      }
      const fullName = meta.full_name || meta.name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      // Generate unique username from email prefix
      const emailPrefix = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 16);
      const baseUsername = emailPrefix || "user";
      let username = baseUsername;
      let attempts = 0;
      let usernameResolved = false;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("username", username)
          .single();
        if (!existing) { usernameResolved = true; break; }
        username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
        attempts++;
      }
      // Fallback: use uuid fragment if all attempts exhausted
      if (!usernameResolved) {
        username = `user${data.user.id.replace(/-/g, "").slice(0, 10)}`;
      }

      await supabase.from("profiles").insert({
        user_id: data.user.id,
        email,
        username,
        name: firstName,
        surname: lastName,
        full_name: fullName,
        onboarding_completed: false,
        onboarding_step: 1,
        status: "active",
        email_verified: true,
      });

      needsOnboarding = true;
    } else {
      needsOnboarding = !profile.onboarding_completed;

      // Sync Google profile name on re-login (name may have changed)
      const meta = data.user.user_metadata || {};
      const providerName = meta.full_name || meta.name || "";
      if (providerName) {
        const parts = providerName.split(" ");
        await supabase
          .from("profiles")
          .update({
            full_name: providerName,
            name: parts[0] || "",
            surname: parts.slice(1).join(" ") || "",
          })
          .eq("user_id", data.user.id);
      }

      // Self-frozen accounts auto-activate on re-login (admin-frozen accounts stay frozen)
      if (profile.status === "frozen" && !profile.moderation_reason) {
        await supabase
          .from("profiles")
          .update({ status: "active", frozen_at: null })
          .eq("user_id", data.user.id);
      }
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
        <p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#666">${
          (() => {
            const locale = request.cookies.get('fdm-locale')?.value || 'tr';
            const messages: Record<string, string> = {
              tr: 'Giriş başarılı! Bu pencere kapanacak...',
              en: 'Login successful! This window will close...',
              az: 'Giriş uğurlu oldu! Bu pəncərə bağlanacaq...',
            };
            return messages[locale] || messages.tr;
          })()
        }</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );

    latestCookies.forEach(({ name, value, options }) => {
      popupResponse.cookies.set(name, value, options);
    });
    popupResponse.cookies.set('fdm-status', '', { maxAge: 0, path: '/' });
    popupResponse.cookies.set('fdm-login-ts', Date.now().toString(), {
      maxAge: 86400 * 365, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    });

    return popupResponse;
  }

  // Google linking flow from settings/connected
  const returnTo = requestUrl.searchParams.get("returnTo");
  if (returnTo === "/settings/connected" && data.user) {
    // Mark google_linked = true since user explicitly linked from settings
    const adminForLink = createAdminClient();
    await adminForLink.from("profiles").update({ google_linked: true }).eq("user_id", data.user.id);

    // Check if the Google email belongs to another user
    const googleIdentity = data.user.identities?.find(i => i.provider === "google");
    const googleEmail = googleIdentity?.identity_data?.email || data.user.email;
    if (googleEmail) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", googleEmail)
        .neq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();
      if (existingProfile) {
        const errResponse = NextResponse.redirect(new URL("/settings/connected?error=already_in_use", request.url));
        latestCookies.forEach(({ name, value, options }) => errResponse.cookies.set(name, value, options));
        return errResponse;
      }
    }
  }

  // Normal flow — redirect to onboarding if not completed
  const safeReturnTo = returnTo && isSafeRedirectUrl(returnTo) && (returnTo.startsWith('/editor/') || returnTo.startsWith('/settings/')) ? returnTo : null;
  const defaultDest = needsOnboarding ? "/onboarding" : (safeReturnTo ? `${safeReturnTo}?auth_return=true` : "/");

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

        try { new BroadcastChannel("fdm-auth").postMessage({ type: "SIGNED_IN" }); } catch(e) {}
        var saved = localStorage.getItem('fdm_auth_return');
        // Güvenlik: sadece aynı origin path'lere izin ver (open redirect engelleme)
        function isSafe(u) { return u && typeof u === 'string' && u.charAt(0) === '/' && u.charAt(1) !== '/' && u.indexOf('\\\\') === -1; }
        if (${needsOnboarding}) {
          localStorage.removeItem('fdm_auth_return');
          window.location.replace("/onboarding");
        } else if (saved && isSafe(saved)) {
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
  normalResponse.cookies.set('fdm-login-ts', Date.now().toString(), {
    maxAge: 86400 * 365, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
  });

  return normalResponse;
}
