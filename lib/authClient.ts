/**
 * Sign out: server-side route clears httpOnly cookies, then client cleanup.
 */
export async function signOutCleanup() {
  // 1. Call server-side signout — clears httpOnly cookies + Supabase session
  try {
    await fetch("/auth/signout", { method: "POST", credentials: "same-origin" });
  } catch {}

  // 2. Clear non-httpOnly cookies from client
  const cookiesToClear = ["fdm-locale"];
  cookiesToClear.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/;`;
  });

  // 3. Clear app cache
  try {
    const { invalidateCache } = await import("@/lib/fetchWithCache");
    invalidateCache("");
  } catch {}

  // 4. Clear session-related storage
  try {
    localStorage.removeItem("fdm-blocked-words");
    localStorage.removeItem("fdm-deleted-posts");
    sessionStorage.clear();
  } catch {}

  // 5. Notify other tabs
  try {
    const bc = new BroadcastChannel("fdm-auth");
    bc.postMessage({ type: "SIGNED_OUT" });
    bc.close();
  } catch {}
}

/**
 * Login sonrası diğer sekmelere bildir.
 */
export function broadcastSignIn() {
  try {
    const bc = new BroadcastChannel("fdm-auth");
    bc.postMessage({ type: "SIGNED_IN" });
    bc.close();
  } catch {}
}

/**
 * Hesap durumu değişikliğini bildir (freeze/ban/moderation).
 */
export function broadcastStatusChange(status: string) {
  try {
    const bc = new BroadcastChannel("fdm-auth");
    bc.postMessage({ type: "STATUS_CHANGED", status });
    bc.close();
  } catch {}
}
