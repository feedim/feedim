import { NextResponse } from "next/server";

/**
 * Production-safe error response.
 * Never exposes raw error messages (DB schema, foreign key, etc.) to the client.
 * Logs the real error server-side only in development.
 */
export function safeError(error: unknown, status = 500) {
  if (process.env.NODE_ENV === "development") {
    console.error("[API]", error);
  }
  return NextResponse.json({ error: "Server error" }, { status });
}
