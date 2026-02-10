"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ArrowLeft, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import TemplateCard from "@/components/TemplateCard";

export default function PurchasedTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadPurchasedTemplates();
  }, []);

  const loadPurchasedTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load user purchases with template details
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("purchases")
        .select(`
          template_id,
          templates (id, name, slug, coin_price, description, html_content)
        `)
        .eq("user_id", user.id)
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false });

      if (purchasesError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Purchases error:", purchasesError);
        }
        toast.error("Satın alınan şablonlar yüklenemedi");
      }

      // Load user's projects to check status of each template
      const { data: projectsData } = await supabase
        .from("projects")
        .select("template_id, is_published, slug")
        .eq("user_id", user.id);

      // Create a map of template_id to project data
      const projectsMap = new Map(
        projectsData?.map(p => [p.template_id, { is_published: p.is_published, slug: p.slug }]) || []
      );

      // Keep all purchased templates and add project status info
      const templatesArray = purchasesData
        ?.map(item => ({
          ...item.templates,
          projectStatus: projectsMap.get(item.template_id)?.is_published ? 'published' : null,
          projectSlug: projectsMap.get(item.template_id)?.slug || null,
        }))
        .filter(template => template) || [];

      setTemplates(templatesArray);

      // Load saved templates
      const { data: savedData } = await supabase
        .from("saved_templates")
        .select("template_id")
        .eq("user_id", user.id);

      setSavedTemplates(savedData?.map(item => item.template_id) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: any) => {
    // If published, go to public page, otherwise to editor
    if (template.projectStatus === 'published' && template.projectSlug) {
      window.open(`/p/${template.projectSlug}`, '_blank');
    } else {
      router.push(`/dashboard/editor/${template.id}`);
    }
  };

  const handleToggleSave = async (templateId: string) => {
    const isSaved = savedTemplates.includes(templateId);

    // Optimistic update
    if (isSaved) {
      setSavedTemplates(savedTemplates.filter(id => id !== templateId));
    } else {
      setSavedTemplates([...savedTemplates, templateId]);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from("saved_templates")
          .delete()
          .eq("user_id", user.id)
          .eq("template_id", templateId);

        if (error) {
          // Rollback on error
          setSavedTemplates(prev => [...prev, templateId]);
          throw error;
        }

        toast.success("Kaydedilenlerden çıkarıldı");
      } else {
        // Save
        const { error } = await supabase
          .from("saved_templates")
          .insert({
            user_id: user.id,
            template_id: templateId,
          });

        if (error) {
          // Rollback on error
          setSavedTemplates(prev => prev.filter(id => id !== templateId));
          throw error;
        }

        toast.success("Kaydedilenlere eklendi");
      }
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız");
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
          <h1 className="text-lg font-semibold">Satın Alınanlar</h1>
          <div className="w-16"></div>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-8 pb-24 md:pb-16">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
            <ShoppingBag className="h-14 w-14 sm:h-20 sm:w-20 text-white mb-3 sm:mb-4" strokeWidth={1} />
            <h2 className="text-lg sm:text-2xl font-bold mb-2">Henüz şablon yok</h2>
            <p className="text-gray-400 mb-5 sm:mb-6 text-sm sm:text-base px-4">Şablonları satın almak için FL Coin kullanın</p>
            <Link href="/dashboard">
              <button className="btn-primary px-6 py-3">
                Şablonları Keşfet
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template) => {
              const isSaved = savedTemplates.includes(template.id);

              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSaved={isSaved}
                  isPurchased={true}
                  showPrice={false}
                  showSaveButton={true}
                  onSaveToggle={handleToggleSave}
                  onClick={() => handleTemplateClick(template)}
                />
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
