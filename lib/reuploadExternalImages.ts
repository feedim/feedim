// Client-side — called at publish time to re-upload external images to our CDN
const CDN_HOST = "cdn.feedim.com";

export async function reuploadExternalImages(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img[src]"));

  const promises = imgs.map(async (img) => {
    const src = img.getAttribute("src") || "";
    // Skip CDN images and non-http sources
    if (!src.startsWith("http") || new URL(src).host === CDN_HOST) return;

    try {
      const res = await fetch(src);
      if (!res.ok) return;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/") || blob.size > 5 * 1024 * 1024) return;

      const formData = new FormData();
      formData.append("file", blob, `external-${Date.now()}.${blob.type.split("/")[1] || "jpg"}`);

      const uploadRes = await fetch("/api/upload/image", { method: "POST", body: formData });
      const data = await uploadRes.json();
      if (data.url) img.setAttribute("src", data.url);
    } catch {
      // External image upload failed — keep original URL
    }
  });

  await Promise.all(promises);
  return doc.body.innerHTML;
}
