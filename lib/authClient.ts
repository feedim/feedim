import { createClient } from "@/lib/supabase/client";

/**
 * Tüm istemci tarafı oturum verilerini temizle + Supabase sign out + diğer sekmelere bildir.
 */
export async function signOutCleanup() {
  // 1. Custom cookie'leri temizle
  const cookiesToClear = ["fdm-status", "fdm-onboarding", "fdm-role"];
  cookiesToClear.forEach((name) => {
    document.cookie = `${name}=; Max-Age=0; Path=/;`;
  });

  // 2. Uygulama cache'ini temizle
  try {
    const { invalidateCache } = await import("@/lib/fetchWithCache");
    invalidateCache("");
  } catch {}

  // 3. Oturumla ilgili localStorage/sessionStorage temizle
  try {
    localStorage.removeItem("fdm-blocked-words");
    localStorage.removeItem("fdm-deleted-posts");
    sessionStorage.clear();
  } catch {}

  // 4. Diğer sekmelere bildir (BroadcastChannel)
  try {
    const bc = new BroadcastChannel("fdm-auth");
    bc.postMessage({ type: "SIGNED_OUT" });
    bc.close();
  } catch {}

  // 5. Supabase auth sign out
  const supabase = createClient();
  await supabase.auth.signOut();
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
