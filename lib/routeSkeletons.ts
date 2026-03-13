import { cookies, headers } from "next/headers";

export async function shouldRenderRouteSkeleton() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const hasAuthCookies = cookieStore.getAll().some((cookie) => cookie.name.startsWith("sb-"));
  if (hasAuthCookies) return true;

  const accept = headerStore.get("accept") || "";
  const isRscNavigation =
    headerStore.get("rsc") === "1" ||
    headerStore.has("next-router-state-tree") ||
    headerStore.has("next-url") ||
    headerStore.has("x-nextjs-data") ||
    accept.includes("text/x-component");

  if (isRscNavigation) return true;

  const fetchDest = headerStore.get("sec-fetch-dest");
  const fetchMode = headerStore.get("sec-fetch-mode");
  const isDirectDocumentRequest =
    fetchDest === "document" ||
    fetchMode === "navigate";

  return !isDirectDocumentRequest;
}
