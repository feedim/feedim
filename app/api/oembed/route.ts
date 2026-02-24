import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const format = req.nextUrl.searchParams.get("format") || "json";

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  if (format !== "json") {
    return NextResponse.json({ error: "Only JSON format supported" }, { status: 501 });
  }

  // Extract slug from URL pattern: /{slug} or /post/{slug} (legacy)
  const match = url.match(/\/post\/([^/?#]+)/) || url.match(/feedim\.com\/([^/?#]+)/);
  if (!match) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 404 });
  }

  const slug = decodeURIComponent(match[1]);
  const admin = createAdminClient();

  const { data: post, error } = await admin
    .from("posts")
    .select(`
      id, title, slug, excerpt, video_url, video_thumbnail, featured_image, content_type, video_duration,
      profiles!posts_author_id_fkey(username, full_name, name, surname)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const authorName = author?.full_name || [author?.name, author?.surname].filter(Boolean).join(" ") || author?.username || "Feedim";
  const isVideo = post.content_type === "video" && post.video_url;
  const isMoment = post.content_type === "moment" && post.video_url;
  const thumbnail = post.video_thumbnail || post.featured_image;

  if (isMoment) {
    const embedUrl = `${baseUrl}/embed/${encodeURIComponent(post.slug)}`;
    const response = {
      type: "video",
      version: "1.0",
      title: post.title,
      author_name: authorName,
      author_url: author?.username ? `${baseUrl}/u/${author.username}` : baseUrl,
      provider_name: "Feedim",
      provider_url: baseUrl,
      html: `<iframe src="${embedUrl}" style="width:100%;max-width:400px;min-height:600px;aspect-ratio:9/16;border:none;border-radius:12px;" allowfullscreen></iframe>`,
      width: 400,
      height: 711,
      ...(thumbnail ? {
        thumbnail_url: thumbnail,
        thumbnail_width: 720,
        thumbnail_height: 1280,
      } : {}),
    };

    return NextResponse.json(response, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  if (isVideo) {
    const embedUrl = `${baseUrl}/embed/${encodeURIComponent(post.slug)}`;
    const response = {
      type: "video",
      version: "1.0",
      title: post.title,
      author_name: authorName,
      author_url: author?.username ? `${baseUrl}/u/${author.username}` : baseUrl,
      provider_name: "Feedim",
      provider_url: baseUrl,
      html: `<div style="position:relative;width:100%;padding-top:56.25%;overflow:hidden;"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`,
      width: 560,
      height: 315,
      ...(thumbnail ? {
        thumbnail_url: thumbnail,
        thumbnail_width: 1280,
        thumbnail_height: 720,
      } : {}),
    };

    return NextResponse.json(response, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  // Note embed
  const isNote = post.content_type === "note";
  if (isNote) {
    const embedUrl = `${baseUrl}/embed/${encodeURIComponent(post.slug)}`;
    const noteResponse = {
      type: "rich",
      version: "1.0",
      title: post.excerpt || post.title,
      author_name: authorName,
      author_url: author?.username ? `${baseUrl}/u/${author.username}` : baseUrl,
      provider_name: "Feedim",
      provider_url: baseUrl,
      html: `<iframe src="${embedUrl}" style="width:100%;border:none;overflow:hidden;" height="200" allowfullscreen></iframe>`,
      width: 420,
      height: 200,
    };

    return NextResponse.json(noteResponse, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  // Regular post — rich embed
  const embedUrl = `${baseUrl}/embed/${encodeURIComponent(post.slug)}`;
  const response = {
    type: "rich",
    version: "1.0",
    title: post.title,
    author_name: authorName,
    author_url: author?.username ? `${baseUrl}/u/${author.username}` : baseUrl,
    provider_name: "Feedim",
    provider_url: baseUrl,
    html: `<iframe src="${embedUrl}" style="width:100%;border:none;overflow:hidden;" height="180" allowfullscreen></iframe>`,
    width: 560,
    height: 180,
    ...(thumbnail ? {
      thumbnail_url: thumbnail,
      thumbnail_width: 1200,
      thumbnail_height: 630,
    } : {}),
  };

  return NextResponse.json(response, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
