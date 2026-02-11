import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();

    const { data: template, error } = await supabase
      .from("templates")
      .select("html_content")
      .eq("id", resolvedParams.id)
      .single();

    if (error || !template?.html_content) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                font-family: system-ui, -apple-system, sans-serif;
              }
              .container {
                text-align: center;
                color: white;
              }
              .heart {
                font-size: 64px;
                animation: pulse 2s ease-in-out infinite;
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="heart">❤️</div>
              <p>Önizleme hazırlanıyor...</p>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    }

    return new NextResponse(template.html_content, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=120, s-maxage=600",
      },
    });
  } catch {
    return new NextResponse("Preview error", { status: 500 });
  }
}
