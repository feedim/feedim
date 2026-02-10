import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Track cookies being set
  const setCookies: { name: string; valueLen: number; preview: string; options: any }[] = [];

  // Create a placeholder response — HTML will be replaced after exchange
  const response = new NextResponse("placeholder", {
    headers: { "Content-Type": "text/html" },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookies.push({
              name,
              valueLen: value.length,
              preview: value.substring(0, 60),
              options,
            });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
        <h2>Callback Error</h2>
        <pre>${JSON.stringify({ error: error.message, code: error.status }, null, 2)}</pre>
        <a href="/login">Login</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Build debug HTML showing cookie info + auto redirect
  const debugInfo = {
    user: data.session?.user?.email,
    sessionExists: !!data.session,
    cookiesSet: setCookies.length,
    cookies: setCookies.map((c) => ({ name: c.name, valueLen: c.valueLen, preview: c.preview, options: c.options })),
    responseHeaders: Object.fromEntries(response.headers.entries()),
  };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:monospace;padding:20px;background:#111;color:#eee">
    <h2>Auth Callback Debug</h2>
    <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
    <p>Redirecting to /dashboard in 10 seconds...</p>
    <p><a href="/dashboard" style="color:#f0f">Go to Dashboard now</a> | <a href="/api/debug-auth" style="color:#0ff">Check cookies on server</a></p>
    <script>setTimeout(function(){ window.location.replace("/dashboard"); }, 10000);</script>
  </body></html>`;

  // Replace the placeholder body with debug HTML
  return new NextResponse(html, {
    headers: response.headers,
  });
}
