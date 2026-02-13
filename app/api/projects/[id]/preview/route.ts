import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "data:"].includes(parsed.protocol)) return "";
    return url;
  } catch {
    // Allow relative URLs and data URIs
    if (url.startsWith("/") || url.startsWith("data:image/")) return url;
    return "";
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Load project with template
    const { data: project, error } = await supabase
      .from("projects")
      .select("hook_values, is_published, is_public, music_url, templates(html_content)")
      .eq("id", id)
      .single();

    if (error || !project?.is_published) {
      return new NextResponse("Not found", { status: 404 });
    }

    const template = (project.templates as any)?.[0] || project.templates;
    const htmlContent = template?.html_content;

    if (!htmlContent) {
      return new NextResponse("No content", { status: 404 });
    }

    const hookValues = (project.hook_values as Record<string, string>) || {};
    let html = htmlContent;

    // Apply hook values — same logic as editor updatePreview
    if (html.includes("HOOK_")) {
      Object.entries(hookValues).forEach(([key, value]) => {
        const regex = new RegExp(`HOOK_${key}`, "g");
        html = html.replace(regex, escapeHtml(value || ""));
      });
    } else {
      // data-editable format: server-side string replacement
      Object.entries(hookValues).forEach(([key, value]) => {
        if (!value) return;

        // Replace text content between tags with data-editable="key"
        // Handle image src
        html = html.replace(
          new RegExp(
            `(<[^>]*data-editable="${escapeHtml(key)}"[^>]*data-type="image"[^>]*?)src="[^"]*"`,
            "g"
          ),
          `$1src="${sanitizeUrl(value)}"`
        );

        // Handle background-image
        html = html.replace(
          new RegExp(
            `(<[^>]*data-editable="${escapeHtml(key)}"[^>]*data-type="background-image"[^>]*?)style="([^"]*)"`,
            "g"
          ),
          `$1style="$2; background-image: url('${sanitizeUrl(value)}');"`
        );

        // Handle color — only allow valid CSS color values
        html = html.replace(
          new RegExp(
            `(<[^>]*data-editable="${escapeHtml(key)}"[^>]*data-type="color"[^>]*?)style="([^"]*)"`,
            "g"
          ),
          (_match: string, before: string, style: string) => {
            const safeColor = /^[#a-zA-Z0-9(),.\s%]+$/.test(value) ? value : "";
            return `${before}style="${style}; background-color: ${safeColor};"`;
          }
        );

        // Handle url href
        html = html.replace(
          new RegExp(
            `(<[^>]*data-editable="${escapeHtml(key)}"[^>]*data-type="url"[^>]*?)href="[^"]*"`,
            "g"
          ),
          `$1href="${sanitizeUrl(value)}"`
        );

        // Handle text/textarea content (skip types handled above, also skip list)
        html = html.replace(
          new RegExp(
            `(<[^>]*data-editable="${escapeHtml(key)}"(?![^>]*data-type="(?:image|background-image|video|color|url|list)")[^>]*>)[^<]*(</[^>]*>)`,
            "g"
          ),
          `$1${escapeHtml(value)}$2`
        );
      });

      // Handle list types via simple string rebuild
      Object.entries(hookValues).forEach(([key, value]) => {
        if (!value) return;
        const listRegex = new RegExp(
          `(<[^>]*data-editable="${escapeHtml(key)}"[^>]*data-type="list"[^>]*>)[\\s\\S]*?(</[^>]*>)`,
          "g"
        );
        html = html.replace(listRegex, (match: string, openTag: string, closeTag: string) => {
          try {
            const items = JSON.parse(value);
            if (!Array.isArray(items)) return match;
            const itemClassMatch = openTag.match(/data-list-item-class="([^"]*)"/);
            const sepClassMatch = openTag.match(/data-list-sep-class="([^"]*)"/);
            const sepHtmlMatch = openTag.match(/data-list-sep-html="([^"]*)"/);
            const duplicateMatch = openTag.match(/data-list-duplicate="true"/);
            const itemClass = itemClassMatch ? itemClassMatch[1] : '';
            const sepClass = sepClassMatch ? sepClassMatch[1] : '';
            const sepHtml = sepHtmlMatch ? sepHtmlMatch[1] : '';
            const buildItems = (arr: string[]) => arr.map(text => {
              let s = `<span class="${escapeHtml(itemClass)}">${escapeHtml(text)}</span>`;
              if (sepClass) s += `<span class="${escapeHtml(sepClass)}">${sepHtml}</span>`;
              return s;
            }).join('');
            let inner = buildItems(items);
            if (duplicateMatch) inner += buildItems(items);
            return openTag + inner + closeTag;
          } catch { return match; }
        });
      });
    }

    // Inject overscroll prevention CSS into template HTML
    const overscrollCSS = `<style>html,body{overscroll-behavior:none!important;overscroll-behavior-y:none!important;}</style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${overscrollCSS}</head>`);
    } else {
      html = overscrollCSS + html;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    return new NextResponse("Preview error", { status: 500 });
  }
}
