import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HTMLTemplateRender } from "./HTMLTemplateRender";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://forilove.com';

  const { data: project } = await supabase
    .from("projects")
    .select("title, slug, description, is_published")
    .eq("slug", slug)
    .single();

  if (!project || !project.is_published) {
    return { title: "Sayfa Bulunamadı - Forilove" };
  }

  const pageUrl = `${baseUrl}/p/${project.slug}`;
  const title = `${project.title} - Forilove`;
  const description = project.description || `${project.title} - Forilove ile oluşturuldu.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      siteName: "Forilove",
      locale: "tr_TR",
      images: [`${baseUrl}/icon.png`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${baseUrl}/icon.png`],
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Load project
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug, description, hook_values, is_published, music_url, view_count, templates(html_content, name)")
    .eq("slug", slug)
    .single();

  if (!project || !project.is_published) {
    notFound();
  }

  // Increment view count (fire-and-forget — don't block page render)
  supabase.rpc('increment_view_count', {
    p_project_id: project.id
  });

  return <HTMLTemplateRender project={project} musicUrl={project.music_url} />;
}
