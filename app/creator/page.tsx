"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Heart, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import ProjectCard from "@/components/ProjectCard";

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string;
  coin_price: number;
  is_public: boolean;
  view_count: number;
  created_at: string;
  html_content: string;
}

export default function CreatorDashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [unpublishConfirm, setUnpublishConfirm] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || (profile.role !== "creator" && profile.role !== "admin")) {
        toast.error("Bu sayfaya erisim yetkiniz yok");
        router.push("/dashboard");
        return;
      }

      loadData(user.id);
    } catch {
      toast.error("Yukleme hatasi");
      router.push("/dashboard");
    }
  };

  const loadData = async (userId: string) => {
    try {
      const { data: templatesData } = await supabase
        .from("templates")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);

      setTemplates(templatesData || []);
      setHasMore((templatesData?.length || 0) === ITEMS_PER_PAGE);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || (profile.role !== 'creator' && profile.role !== 'admin')) {
        toast.error("Bu islem icin yetkiniz yok");
        return;
      }

      const { error } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success("Sablon silindi");
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error: any) {
      toast.error("Silme hatasi: " + error.message);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: moreTemplates } = await supabase
        .from("templates")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .range(templates.length, templates.length + ITEMS_PER_PAGE - 1);

      if (moreTemplates && moreTemplates.length > 0) {
        setTemplates([...templates, ...moreTemplates]);
        setHasMore(moreTemplates.length === ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch { /* silent */ } finally {
      setLoadingMore(false);
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
          <h1 className="text-lg font-semibold">Creator Studio</h1>
          <Link href="/creator/new">
            <button className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Olustur
            </button>
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 pb-24 md:pb-16 max-w-2xl">
        {templates.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-white mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-bold mb-2">Henüz şablon yok</h2>
            <p className="text-gray-400 text-sm mb-6">İlk şablonunuzu oluşturun.</p>
          </div>
        ) : (
          <>
            <div>
              {templates.map((template) => (
                <ProjectCard
                  key={template.id}
                  id={template.id}
                  title={template.name}
                  subtitle={`${template.coin_price} FL Coin · ${new Date(template.created_at).toLocaleDateString('tr-TR')}`}
                  viewCount={template.view_count || 0}
                  htmlContent={template.html_content}
                  editHref={`/creator/edit/${template.id}`}
                  viewHref={`/dashboard/editor/${template.id}`}
                  shareUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/editor/${template.id}`}
                  unpublishConfirm={unpublishConfirm}
                  onUnpublish={handleDelete}
                  onUnpublishConfirm={setUnpublishConfirm}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-secondary px-8 py-3 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <Heart className="h-4 w-4 animate-pulse" />
                  ) : (
                    <span>Daha Fazla Goster</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
