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
        .select("id, title, slug, description, view_count, template_id, user_id, updated_at, is_published, hook_values, music_url, templates(name)")
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
        .select("id, title, slug, description, view_count, template_id, user_id, updated_at, is_published, hook_values, music_url, templates(name)")
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
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                title={project.title}
                subtitle={project.templates?.name}
                viewCount={project.view_count || 0}
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
