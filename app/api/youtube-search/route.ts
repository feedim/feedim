import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2 || q.length > 200) {
    return NextResponse.json({ items: [] });
  }

  try {
    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00",
              hl: "tr",
              gl: "TR",
            },
          },
          query: q,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ items: [] });
    }

    const data = await res.json();

    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];

    const items: { id: string; title: string; artist: string; thumbnail: string }[] = [];

    for (const section of sections) {
      const sectionItems = section?.itemSectionRenderer?.contents || [];
      for (const item of sectionItems) {
        const vid = item?.videoRenderer;
        if (!vid?.videoId) continue;

        const title =
          vid.title?.runs?.map((r: { text: string }) => r.text).join("") || "";
        const artist =
          vid.ownerText?.runs?.[0]?.text || "";
        const thumbnail =
          vid.thumbnail?.thumbnails?.[0]?.url ||
          `https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg`;

        items.push({
          id: vid.videoId,
          title,
          artist,
          thumbnail,
        });

        if (items.length >= 20) break;
      }
      if (items.length >= 20) break;
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
