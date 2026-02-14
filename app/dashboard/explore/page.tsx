"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, ArrowLeft, Wand2, X, ChevronUp, Search, Share2, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCount } from "@/lib/utils";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShareSheet } from "@/components/ShareIconButton";

interface PublicProject {
  id: string;
  title: string;
  slug: string;
  description: string;
  view_count: number;
  template_id: string;
  user_id: string;
  templates: any;
}

const ITEMS_PER_PAGE = 6;

export default function ExplorePage() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inspectingProject, setInspectingProject] = useState<PublicProject | null>(null);
  const [sharingProject, setSharingProject] = useState<PublicProject | null>(null);
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (page > 0) loadMore(); }, [page]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [projects]);

  useEffect(() => {
    if (activeIndex >= projects.length - 3 && hasMore && !loadingMore) {
      setPage((p) => p + 1);
    }
  }, [activeIndex, projects.length, hasMore, loadingMore]);

  const fetchCreatorNames = async (projects: PublicProject[]) => {
    const userIds = [...new Set(projects.map(p => p.user_id).filter(Boolean))];
    if (userIds.length === 0) return;
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (res.ok) {
        const map = await res.json();
        setCreatorNames(prev => ({ ...prev, ...map }));
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Operation failed:', e); }
  };

  const loadData = async () => {
    try {
      const { data } = await supabase
        .from("projects")
        .select("id, title, slug, description, view_count, template_id, user_id, templates(name)")
        .eq("is_published", true)
        .eq("is_public", true)
        .order("view_count", { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);
      setProjects(data || []);
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);

      if (data?.length) fetchCreatorNames(data);

      // Load saved projects for current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: savedData } = await supabase
          .from("saved_projects")
          .select("project_id")
          .eq("user_id", user.id);
        setSavedProjects(savedData?.map(s => s.project_id) || []);
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Operation failed:', e); } finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const start = page * ITEMS_PER_PAGE;
      const { data } = await supabase
        .from("projects")
        .select("id, title, slug, description, view_count, template_id, user_id, templates(name)")
        .eq("is_published", true)
        .eq("is_public", true)
        .order("view_count", { ascending: false })
        .range(start, start + ITEMS_PER_PAGE - 1);
      setProjects((prev) => [...prev, ...(data || [])]);
      setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
      if (data?.length) fetchCreatorNames(data);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Operation failed:', e); } finally { setLoadingMore(false); }
  };

  const getTemplateName = (project: PublicProject) => {
    const t = project.templates;
    return t?.name || t?.[0]?.name || "";
  };

  const handleToggleSave = async (projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isSaved = savedProjects.includes(projectId);

    // Optimistic update
    if (isSaved) {
      setSavedProjects(prev => prev.filter(id => id !== projectId));
    } else {
      setSavedProjects(prev => [...prev, projectId]);
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_projects")
          .delete()
          .eq("user_id", user.id)
          .eq("project_id", projectId);
        if (error) throw error;
        toast.success("Kaydedilenlerden çıkarıldı.");
      } else {
        const { error } = await supabase
          .from("saved_projects")
          .insert({ user_id: user.id, project_id: projectId });
        if (error) throw error;
        toast.success("Kaydedilenlere eklendi!");
      }
    } catch {
      // Rollback
      if (isSaved) {
        setSavedProjects(prev => [...prev, projectId]);
      } else {
        setSavedProjects(prev => prev.filter(id => id !== projectId));
      }
      toast.error("İşlem başarısız.");
    }
  };

  if (loading) {
    return (
      <div className="h-dvh bg-black flex flex-col">
        <header className="bg-transparent min-h-[73px]">
          <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
            <div className="flex items-center gap-2 text-white/80"><ArrowLeft className="h-5 w-5" /><span className="font-medium">Geri</span></div>
            <h1 className="text-lg font-semibold text-white/90">Keşfet</h1>
            <div className="w-16" />
          </nav>
        </header>
        <div className="flex-1 relative w-full sm:max-w-[480px] sm:mx-auto">
          <div className="animate-pulse bg-white/[0.04] absolute inset-0 rounded-none" />
          <div className="absolute bottom-20 left-4 right-20 space-y-2">
            <div className="animate-pulse bg-white/[0.08] h-3 w-24 rounded-lg" />
            <div className="animate-pulse bg-white/[0.08] h-6 w-48 rounded-lg" />
            <div className="animate-pulse bg-white/[0.08] h-4 w-32 rounded-lg" />
          </div>
          <div className="absolute right-3 bottom-32 flex flex-col gap-5">
            {[1,2,3,4].map(i => <div key={i} className="animate-pulse bg-white/[0.08] w-12 h-12 rounded-full" />)}
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="h-dvh bg-black flex flex-col items-center justify-center text-white px-6">
        <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3" />
        <h2 className="text-lg sm:text-xl font-bold mb-2">Henüz içerik yok</h2>
        <p className="text-zinc-400 text-sm text-center mb-6">Herkese açık paylaşılan sayfalar burada görünecek.</p>
        <Link href="/dashboard" className="btn-primary px-6 py-3">Ana Sayfa</Link>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-black text-white overflow-hidden relative">
      {/* Header — transparent, overlays reels */}
      <header className="absolute top-0 left-0 right-0 z-30">
        <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push('/dashboard'); } }} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold text-white/90">Keşfet</h1>
          <div className="w-16" />
        </nav>
      </header>

      {/* Reels wrapper — mobile: full, desktop: phone-sized column */}
      <div className="relative h-full w-full sm:max-w-[480px] sm:mx-auto">
        {/* Reels Container */}
        <div
          ref={containerRef}
          className="h-dvh overflow-y-auto snap-y snap-mandatory scrollbar-hide overscroll-contain"
          style={{ scrollbarWidth: "none" }}
        >
        {projects.map((project, index) => (
          <div
            key={project.id}
            data-index={index}
            className="h-dvh w-full snap-start snap-always relative flex-shrink-0 overflow-hidden"
          >
            {/* Background: iframe thumbnail — no scroll, no interaction */}
            <div className="absolute inset-0 bg-black overflow-hidden">
              <iframe
                src={`/api/projects/${project.id}/preview`}
                className="w-full h-full pointer-events-none"
                sandbox="allow-scripts"
                scrolling="no"
                loading={index < 2 ? "eager" : "lazy"}
                style={{ overflow: "hidden" }}
              />
            </div>

            {/* Top gradient */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

            {/* Right side actions */}
            <div className="absolute right-3 bottom-32 sm:bottom-20 z-20 flex flex-col items-center gap-5 py-3 px-1.5">
              {/* Inspect */}
              <button onClick={() => setInspectingProject(project)} className="flex flex-col items-center gap-1" aria-label="Sayfayı incele">
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center active:scale-95 transition border border-white/10">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>İncele</span>
              </button>

              {/* Use template */}
              {project.template_id && (
                <Link href={`/dashboard/editor/${project.template_id}`} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-pink-500/80 backdrop-blur-md flex items-center justify-center active:scale-95 transition border border-pink-500/30">
                    <Wand2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>Kullan</span>
                </Link>
              )}

              {/* Save */}
              <button onClick={() => handleToggleSave(project.id)} className="flex flex-col items-center gap-1" aria-label={savedProjects.includes(project.id) ? "Kaydedilenlerden çıkar" : "Kaydet"}>
                <div className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition border ${savedProjects.includes(project.id) ? 'bg-pink-500/80 border-pink-500/30' : 'bg-black/50 border-white/10'}`}>
                  <Bookmark className={`h-5 w-5 ${savedProjects.includes(project.id) ? 'text-white fill-white' : 'text-white'}`} />
                </div>
                <span className="text-[10px] font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>Kaydet</span>
              </button>

              {/* Share */}
              <button onClick={() => setSharingProject(project)} className="flex flex-col items-center gap-1" aria-label="Paylaş">
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center active:scale-95 transition border border-white/10">
                  <Share2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)' }}>Paylaş</span>
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-20 sm:bottom-6 left-0 right-20 z-20 px-4">
              <p className="text-xs font-semibold text-white/50 mb-1 truncate">@{creatorNames[project.user_id] || "Anonim"}</p>
              <h3 className="text-xl font-bold mb-1 drop-shadow-lg truncate">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-white/60 mb-1 truncate">{project.description}</p>
              )}
              <div className="flex items-center gap-3">
                {getTemplateName(project) && (
                  <span className="text-xs text-white/40 truncate max-w-[160px]">Şablon: {getTemplateName(project)}</span>
                )}
                <span className="flex items-center gap-1 text-xs text-white/30 shrink-0">
                  <Eye className="h-3 w-3" />
                  {formatCount(project.view_count || 0)}
                </span>
              </div>
            </div>

            {/* Swipe hint */}
            {index === 0 && (
              <div className="absolute bottom-28 sm:bottom-14 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
                <ChevronUp className="h-5 w-5 text-white/30" />
              </div>
            )}
          </div>
        ))}

        {loadingMore && (
          <div className="h-dvh w-full snap-start flex items-center justify-center bg-black">
            <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
          </div>
        )}
      </div>
      </div>{/* end reels wrapper */}

      {/* Inspect Modal */}
      {inspectingProject && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div className="absolute top-0 left-0 right-0 z-[10000] flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setInspectingProject(null)}
              className="flex items-center gap-2 text-white/80 hover:text-white transition"
              aria-label="Geri"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Geri</span>
            </button>
            <div className="flex items-center gap-1.5">
              {inspectingProject.template_id && (
                <Link href={`/dashboard/editor/${inspectingProject.template_id}`} className="btn-primary px-2.5 py-1 text-[11px]">
                  Kullan
                </Link>
              )}
              <Link href={`/p/${inspectingProject.slug}`} target="_blank" className="btn-secondary px-2.5 py-1 text-[11px]">
                Görüntüle
              </Link>
            </div>
          </div>
          <iframe
            src={`/p/${inspectingProject.slug}?embed=1`}
            className="w-full h-full"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}

      {/* Share Sheet */}
      <ShareSheet
        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${sharingProject?.slug || ''}`}
        title={sharingProject?.title || ''}
        isOpen={!!sharingProject}
        onClose={() => setSharingProject(null)}
      />

      <MobileBottomNav />
    </div>
  );
}
