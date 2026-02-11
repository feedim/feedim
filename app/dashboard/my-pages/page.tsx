"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Heart, ArrowLeft } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProjectCard from "@/components/ProjectCard";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 10;

export default function MyPagesPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [unpublishConfirm, setUnpublishConfirm] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (page > 0) {
      loadMore();
    }
  }, [page]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    loadProjects();
  };

  const loadProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("projects")
        .select("*, templates(*)")
        .eq("user_id", user.id)
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);

      if (error) throw error;

      setProjects(data || []);
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data, error} = await supabase
        .from("projects")
        .select("*, templates(*)")
        .eq("user_id", user.id)
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .range(start, end);

      if (error) throw error;

      setProjects([...projects, ...(data || [])]);
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setPage(p => p + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore]);

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Kimlik doğrulaması gerekli");
        return;
      }

      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      const templateId = project.template_id;

      // 1. Delete uploaded R2 images from hook_values
      const hookValues = project.hook_values as Record<string, string> | null;
      if (hookValues) {
        const r2Urls = Object.values(hookValues).filter(
          (v) => typeof v === 'string' && (v.includes('.r2.dev/') || v.includes('/api/r2/'))
        );
        for (const url of r2Urls) {
          fetch('/api/upload/image', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          }).catch(() => {});
        }
      }

      // 2. Delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", user.id);

      if (error) throw error;

      // 3. Clear any cached preview/editor data
      try {
        sessionStorage.removeItem('forilove_preview');
      } catch {}

      setProjects(projects.filter(p => p.id !== projectId));
      setUnpublishConfirm(null);
      toast.success("Sayfa silindi.");
    } catch (error: any) {
      toast.error("İşlem hatası: " + error.message);
    }
  };

  // Apply hook_values to template HTML for preview
  const R2_DOMAIN = 'pub-180c00d0fd394407a8fe289a038f2de2.r2.dev';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const toProxy = (v: string) => v.includes(R2_DOMAIN) ? v.replace(`https://${R2_DOMAIN}/`, `${origin}/api/r2/`) : v;

  const getRenderedHtml = (project: any) => {
    let html = project.templates?.html_content;
    if (!html) return undefined;
    const hookValues = project.hook_values as Record<string, string> | null;
    if (!hookValues) return html;

    if (html.includes('HOOK_')) {
      Object.entries(hookValues).forEach(([key, value]) => {
        if (key.startsWith('__')) return;
        html = html.replace(new RegExp(`HOOK_${key}`, 'g'), toProxy(String(value)) || '');
      });
    } else {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        Object.entries(hookValues).forEach(([key, value]) => {
          if (key.startsWith('__')) return;
          const el = doc.querySelector(`[data-editable="${key}"]`);
          if (!el) return;
          const type = el.getAttribute('data-type') || 'text';
          const strVal = toProxy(String(value));
          if (type === 'image') {
            el.setAttribute('src', strVal);
          } else if (type === 'background-image') {
            const style = el.getAttribute('style') || '';
            el.setAttribute('style', `${style}; background-image: url('${strVal}');`);
          } else {
            el.textContent = strVal;
          }
        });
        html = doc.documentElement.outerHTML;
      } catch {}
    }

    // Remove hidden data-area sections
    try {
      const hiddenAreas = Object.entries(hookValues)
        .filter(([key, value]) => key.startsWith('__area_') && value === 'hidden')
        .map(([key]) => key.replace('__area_', ''));
      if (hiddenAreas.length > 0) {
        const areaParser = new DOMParser();
        const areaDoc = areaParser.parseFromString(html, 'text/html');
        hiddenAreas.forEach(areaName => {
          const el = areaDoc.querySelector(`[data-area="${areaName}"]`);
          if (el) el.remove();
        });
        html = areaDoc.documentElement.outerHTML;
      }
    } catch {}

    return html;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Sayfalarım</h1>
          <div className="w-16"></div>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 pb-24 md:pb-16 max-w-2xl">

        {projects && projects.length > 0 ? (
          <div>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                title={project.title}
                subtitle={project.templates?.name}
                viewCount={project.view_count || 0}
                htmlContent={getRenderedHtml(project)}
                editHref={`/dashboard/editor/${project.template_id}`}
                viewHref={`/p/${project.slug}`}
                shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${project.slug}`}
                unpublishConfirm={unpublishConfirm}
                onUnpublish={handleDeleteProject}
                onUnpublishConfirm={setUnpublishConfirm}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Henüz sayfa yok"
            description="Şablonlara göz atın ve özel bir sayfa oluşturun."
            action={
              <Link href="/dashboard">
                <button className="btn-primary">
                  Şablonlara Göz At
                </button>
              </Link>
            }
          />
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <Heart className="h-8 w-8 text-pink-500 fill-pink-500 animate-pulse" />
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
