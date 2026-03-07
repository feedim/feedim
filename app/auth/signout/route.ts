import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();

  // Sign out current session only
  await supabase.auth.signOut({ scope: "local" });

  const response = NextResponse.json({ success: true });

  // Clear all httpOnly app cookies
  response.cookies.set("fdm-status", "", { maxAge: 0, path: "/" });
  response.cookies.set("fdm-onboarding", "", { maxAge: 0, path: "/" });
  response.cookies.set("fdm-role", "", { maxAge: 0, path: "/" });

  // Explicitly clear Supabase auth cookies (sb-* pattern)
  // The cookie names follow the pattern: sb-<project-ref>-auth-token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/\/\/([^.]+)\./)?.[1] || "";
  if (projectRef) {
    const baseName = `sb-${projectRef}-auth-token`;
    // Supabase SSR may split across multiple cookies (.0, .1, etc.)
    response.cookies.set(baseName, "", { maxAge: 0, path: "/" });
    for (let i = 0; i < 5; i++) {
      response.cookies.set(`${baseName}.${i}`, "", { maxAge: 0, path: "/" });
    }
  }

  return response;
}
