"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { CoinWallet } from "@/components/CoinWallet";
import LoadingScreen from "@/components/LoadingScreen";
import MobileBottomNav from "@/components/MobileBottomNav";
import TemplateCard from "@/components/TemplateCard";
import { EmptyState } from "@/components/ErrorState";

const ITEMS_PER_PAGE = 6;

export default function DashboardPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<string[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (page > 0) {
      loadMoreTemplates();
    }
  }, [page]);

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

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      setCoinBalance(profile?.coin_balance || 0);

      // Load user purchases first
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

      const purchasedTemplateIds = purchasesData?.map(p => p.template_id) || [];

      // Load templates excluding purchased ones (first page)
      let templatesQuery = supabase
        .from("templates")
        .select("id, name, slug, coin_price, description, html_content")
        .eq("is_active", true);

      // Only add the filter if there are purchased templates
      if (purchasedTemplateIds.length > 0) {
        templatesQuery = templatesQuery.not("id", "in", `(${purchasedTemplateIds.join(',')})`);
      }

      const { data: templatesData, error: templatesError } = await templatesQuery
        .order("coin_price", { ascending: true })
        .range(0, ITEMS_PER_PAGE - 1);

      if (templatesError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Templates error:", templatesError);
        }
        toast.error(`Template hatası: ${templatesError.message}`);
      }

      const hasMoreItems = (templatesData?.length || 0) === ITEMS_PER_PAGE;
      setHasMore(hasMoreItems);

      setTemplates(templatesData || []);

      // Load saved templates
      const { data: savedData, error: savedError } = await supabase
        .from("saved_templates")
        .select("template_id")
        .eq("user_id", user.id);

      if (savedError) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Saved templates error:", savedError);
        }
      }

      const purchasedIds = purchasesData?.map(p => p.template_id) || [];
      setPurchases(purchasedIds);
      setSavedTemplates(savedData?.map(s => s.template_id) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTemplates = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use cached purchased IDs from initial load (no duplicate query)
      const purchasedTemplateIds = purchases;

      const start = page * ITEMS_PER_PAGE;

      let templatesQuery = supabase
        .from("templates")
        .select("id, name, slug, coin_price, description, html_content")
        .eq("is_active", true);

      // Only add the filter if there are purchased templates
      if (purchasedTemplateIds.length > 0) {
        templatesQuery = templatesQuery.not("id", "in", `(${purchasedTemplateIds.join(',')})`);
      }

      const { data: templatesData, error } = await templatesQuery
        .order("coin_price", { ascending: true })
        .range(start, start + ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const hasMoreItems = (templatesData?.length || 0) === ITEMS_PER_PAGE;

      setTemplates([...templates, ...(templatesData || [])]);
      setHasMore(hasMoreItems);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleSave = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isSaved = savedTemplates.includes(templateId);

      // Optimistic update - update UI immediately
      if (isSaved) {
        setSavedTemplates(savedTemplates.filter(id => id !== templateId));
      } else {
        setSavedTemplates([...savedTemplates, templateId]);
      }

      // Then update database
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

  const handleTemplateClick = (templateId: string) => {
    router.push(`/dashboard/editor/${templateId}`);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl">
        <nav className="container mx-auto px-3 sm:px-6 py-5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Forilove Ana Sayfa">
            <Heart className="h-7 w-7 text-pink-500 fill-pink-500" aria-hidden="true" />
            <span className="text-2xl font-bold">Forilove</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/explore" className="hidden md:block">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition font-semibold">
                Keşfet
              </button>
            </Link>
            <Link href="/dashboard/purchased" className="hidden md:block">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition font-semibold">
                Satın Alınanlar
              </button>
            </Link>
            <Link href="/dashboard/my-pages" className="hidden md:block">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition font-semibold">
                Sayfalarım
              </button>
            </Link>
            <Link href="/dashboard/saved" className="hidden md:block">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition font-semibold">
                Kaydedilenler
              </button>
            </Link>
            <Link href="/dashboard/profile" className="hidden md:block">
              <button className="text-gray-400 hover:text-white px-4 py-2 transition font-semibold">
                Profil
              </button>
            </Link>
            <CoinWallet />
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-12 pb-8">
        <div className="container mx-auto px-3 sm:px-6">
          <h1 className="text-4xl font-bold mb-4">Şablonları Keşfet</h1>
          <p className="text-base text-gray-400">
            Sevgilinize özel bir sayfa oluşturmak için bir şablon seçin ve düzenleyin
          </p>
        </div>
      </section>

      {/* Templates */}
      <main className="container mx-auto px-3 sm:px-6 pb-20 md:pb-8 md:pt-0">
        {templates.length === 0 ? (
          <EmptyState
            title="Henüz şablon yok"
            message="Şu anda görüntülenebilecek şablon bulunmuyor"
            action={{
              label: "Sayfayı Yenile",
              onClick: () => window.location.reload()
            }}
          />
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {templates && templates.length > 0 ? templates.map((template) => {
                const isPurchased = purchases.includes(template.id);
                const isSaved = savedTemplates.includes(template.id);

                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSaved={isSaved}
                    isPurchased={isPurchased}
                    showPrice={true}
                    showSaveButton={true}
                    onSaveToggle={handleToggleSave}
                    onClick={() => handleTemplateClick(template.id)}
                  />
                );
              }) : (
                <EmptyState
                  icon={Heart}
                  title="Henüz Template Yok"
                  message="Şu anda gösterilecek template bulunmuyor."
                />
              )}
            </div>

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center py-8" aria-label="Daha fazla şablon yükleniyor">
                <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" aria-hidden="true" />
              </div>
            )}
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
