import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("fdm-status", "", { maxAge: 0, path: "/" });
  response.cookies.set("fdm-onboarding", "", { maxAge: 0, path: "/" });
  response.cookies.set("fdm-role", "", { maxAge: 0, path: "/" });
  return response;
}
