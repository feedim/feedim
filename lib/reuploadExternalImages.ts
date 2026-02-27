// Client-side — called at publish time to re-upload external images to our CDN
const OWN_HOSTS = ["cdn.feedim.com", "imgspcdn.feedim.com"];

export async function reuploadExternalImages(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgs = Array.from(doc.querySelectorAll("img[src]"));

  const promises = imgs.map(async (img) => {
    const src = img.getAttribute("src") || "";
    if (!src.startsWith("http")) return;
    try {
      const host = new URL(src).host;
      if (OWN_HOSTS.some(h => host.includes(h)) || host.includes("supabase.co")) return;
    } catch { return; }

    try {
      // Server-side proxy — CORS sorunsuz
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: src }),
      });
      const data = await res.json();
      if (data.url) img.setAttribute("src", data.url);
    } catch {
      // External image upload failed — keep original URL
    }
  });

  await Promise.all(promises);
  return doc.body.innerHTML;
}
