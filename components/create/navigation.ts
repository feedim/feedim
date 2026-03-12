"use client";

import { emitNavigationStart } from "@/lib/navigationProgress";
import { getPostUrl } from "@/lib/utils";

type CreateContentType = "post" | "note" | "video" | "moment";

interface RedirectAfterCreateSaveArgs {
  router: { push: (href: string) => void };
  status: "draft" | "published";
  slug?: string | null;
  contentType: CreateContentType;
}

export function redirectAfterCreateSave({
  router,
  status,
  slug,
  contentType,
}: RedirectAfterCreateSaveArgs) {
  if (status === "published" && slug) {
    emitNavigationStart();
    router.push(getPostUrl(slug, contentType === "post" ? undefined : contentType));
    return;
  }

  sessionStorage.setItem("fdm-open-create-modal", "1");
  sessionStorage.setItem("fdm-create-view", "drafts");
  emitNavigationStart();
  router.push("/");
}
