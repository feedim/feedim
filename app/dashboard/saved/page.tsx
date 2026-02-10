"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ArrowLeft, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import TemplateCard from "@/components/TemplateCard";

export default function SavedTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadSavedTemplates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load user's coin balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      setCoinBalance(profile?.coin_balance || 0);

      // Load saved templates with template details
      const { data: savedData, error: savedError } = await supabase
        .from("saved_templates")
        .select(`
          template_id,
          templates (id, name, slug, coin_price, description, html_content)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (savedError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Saved templates error:", savedError);
        }
        toast.error("Kaydedilen şablonlar yüklenemedi");
      }

      // Load user purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("purchases")
        .select("template_id")
        .eq("user_id", user.id)
        .eq("payment_status", "completed");

      if (purchasesError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Purchases error:", purchasesError);
        }
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

      const templatesArray = savedData?.map(item => ({
        ...item.templates,
        projectStatus: projectsMap.get(item.template_id)?.is_published ? 'published' : null,
        projectSlug: projectsMap.get(item.template_id)?.slug || null,
      })).filter(Boolean) || [];

      setTemplates(templatesArray);
      setPurchases(purchasesData?.map(p => p.template_id) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = useCallback(async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("saved_templates")
        .delete()
        .eq("user_id", user.id)
        .eq("template_id", templateId);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success("Kaydedilenlerden çıkarıldı");
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız");
    }
  }, [supabase, templates]);

  const handleTemplateClick = useCallback((template: any) => {
    const isPurchased = purchases.includes(template.id);

    // If published, go to public page
    if (template.projectStatus === 'published' && template.projectSlug) {
      window.open(`/p/${template.projectSlug}`, '_blank');
      return;
    }

    // If purchased (but not published), go to editor
    if (isPurchased) {
      router.push(`/dashboard/editor/${template.id}`);
      return;
    }

    // If not purchased, start purchase flow
    handlePurchase(template);
  }, [purchases, router]);

  const handlePurchase = async (template: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const coinPrice = template.coin_price || 0;

      // Check if user has enough coins
      if (coinBalance < coinPrice) {
        toast.error(`Yetersiz bakiye! ${coinPrice} FL Coin gerekli.`);
        router.push('/dashboard/coins');
        return;
      }

      // Use atomic purchase transaction RPC
      const { data: result, error } = await supabase.rpc('purchase_template', {
        p_user_id: user.id,
        p_template_id: template.id,
        p_coin_price: coinPrice
      });

      if (error || !result.success) {
        toast.error(result?.error || 'Satın alma başarısız');
        return;
      }

      toast.success(`${template.name} satın alındı! (-${coinPrice} FL Coin)`);
      setCoinBalance(result.new_balance);
      setPurchases([...purchases, template.id]);
      router.push(`/dashboard/editor/${template.id}`);
    } catch (error: any) {
      toast.error(error.message || "Satın alma başarısız");
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
          <h1 className="text-lg font-semibold">Kaydedilenler</h1>
          <div className="w-16"></div>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-8 pb-24 md:pb-16">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
            <Bookmark className="h-14 w-14 sm:h-20 sm:w-20 text-white mb-3 sm:mb-4" strokeWidth={1.2} />
            <h2 className="text-lg sm:text-2xl font-bold mb-2">Henüz şablon yok</h2>
            <p className="text-gray-400 mb-5 sm:mb-6 text-sm px-4">Beğendiğiniz şablonları kaydedin.</p>
            <Link href="/dashboard">
              <button className="btn-primary">
                Şablonları Keşfet
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template) => {
              const isPurchased = purchases.includes(template.id);

              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSaved={true}
                  isPurchased={isPurchased}
                  showPrice={!isPurchased}
                  showSaveButton={true}
                  onSaveToggle={handleUnsave}
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
