"use client";

export async function fetchCreateDraftPost(slug: string) {
  const res = await fetch(`/api/posts/${slug}`);
  const data = await res.json();

  if (!res.ok || !data.post) {
    throw new Error(data.error || "draft-load-failed");
  }

  return data.post;
}
