import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();

  const cookieInfo = allCookies.map((c) => ({
    name: c.name,
    valueLength: c.value.length,
    valuePreview: c.value.substring(0, 80),
  }));

  const supabaseCookies = cookieInfo.filter((c) => c.name.startsWith("sb-"));

  // Try to parse session like proxy does
  const cookiePrefix = "sb-ethgmysmhwbcirznyrup-auth-token";
  let tokenStr = "";
  const baseCookie = request.cookies.get(cookiePrefix);
  if (baseCookie) {
    tokenStr = baseCookie.value;
  } else {
    for (let i = 0; i < 10; i++) {
      const chunk = request.cookies.get(`${cookiePrefix}.${i}`);
      if (!chunk) break;
      tokenStr += chunk.value;
    }
  }

  let parseResult: any = { raw: tokenStr.substring(0, 200) };
  if (tokenStr) {
    try {
      const session = JSON.parse(tokenStr);
      parseResult = {
        parsed: true,
        hasAccessToken: !!session.access_token,
        hasRefreshToken: !!session.refresh_token,
        tokenPreview: session.access_token?.substring(0, 30),
      };
    } catch (e: any) {
      parseResult = {
        parsed: false,
        error: e.message,
        rawPreview: tokenStr.substring(0, 200),
      };
    }
  }

  return NextResponse.json({
    totalCookies: allCookies.length,
    supabaseCookieCount: supabaseCookies.length,
    supabaseCookies,
    allCookieNames: allCookies.map((c) => c.name),
    tokenReassembly: parseResult,
  });
}
