import { NextResponse } from "next/server";
import { logServerError } from "@/lib/runtimeLogger";

/**
 * Production-safe error response.
 * Never exposes raw error messages (DB schema, foreign key, etc.) to the client.
 * Logs the real error server-side only in development.
 */
export function safeError(error: unknown, status = 500) {
  logServerError("[API]", error);
  return NextResponse.json({ error: "server_error" }, { status });
}
