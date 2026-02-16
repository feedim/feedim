"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ChevronDown, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { CoinWallet } from "@/components/CoinWallet";
import MobileBottomNav from "@/components/MobileBottomNav";
import { TemplateGridSkeleton } from "@/components/Skeletons";
import TemplateCard from "@/components/TemplateCard";
import { EmptyState } from "@/components/ErrorState";
import WelcomeCouponModal from "@/components/WelcomeCouponModal";

const ITEMS_PER_PAGE = 6;

function DashboardNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [moreOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="w-full px-3 sm:px-6 lg:px-10 py-5 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0" aria-label="Forilove Ana Sayfa">
        <Heart className="h-7 w-7 text-pink-500 fill-pink-500" aria-hidden="true" />
        <span className="text-2xl font-bold">Forilove</span>
      </Link>
      <div className="flex items-center gap-1 lg:gap-3">
        <Link href="/dashboard/explore" className="hidden md:block text-zinc-400 hover:text-white px-3 py-2 transition font-semibold text-sm whitespace-nowrap">
          Keşfet
        </Link>
        <Link href="/dashboard/my-pages" className="hidden md:block text-zinc-400 hover:text-white px-3 py-2 transition font-semibold text-sm whitespace-nowrap">
          Sayfalarım
        </Link>
        <Link href="/dashboard/purchased" className="hidden md:block text-zinc-400 hover:text-white px-3 py-2 transition font-semibold text-sm whitespace-nowrap">
          Satın Alınanlar
        </Link>
        <Link href="/dashboard/profile" className="hidden md:block text-zinc-400 hover:text-white px-3 py-2 transition font-semibold text-sm whitespace-nowrap">
          Profil
        </Link>
        {/* Diğer dropdown */}
        <div ref={moreRef} className="relative hidden md:block">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex items-center gap-1 text-zinc-400 hover:text-white px-3 py-2 transition font-semibold text-sm whitespace-nowrap"
          >
            Diğer
            <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
              <Link href="/dashboard/saved" className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition" onClick={() => setMoreOpen(false)}>
                Kaydedilenler
              </Link>
              <Link href="/dashboard/transactions" className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition" onClick={() => setMoreOpen(false)}>
                İşlem Geçmişi
              </Link>
              <div className="border-t border-white/10">
                <button
                  onClick={() => { setMoreOpen(false); handleSignOut(); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
        <CoinWallet />
      </div>
    </nav>
  );
}

export default function DashboardPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<string[]>([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [welcomeCoupon, setWelcomeCoupon] = useState<{ code: string; discountPercent: number; expiresAt: string | null } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
    processOAuthReferral();
    // Process promo signup first, then check for coupon to display
    processPromoSignup().then(() => checkWelcomeCoupon());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (page > 0) {
      loadMoreTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const processOAuthReferral = async () => {
    try {
      const pendingRef = sessionStorage.getItem('forilove_pending_referral');
      if (!pendingRef) return;
      sessionStorage.removeItem('forilove_pending_referral');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: referralData } = await supabase.rpc('process_referral_signup', {
        p_new_user_id: user.id,
        p_referral_code: pendingRef,
      });

      if (referralData?.success) {
        toast.success("Referans bağlantısı kaydedildi!");
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Operation failed:', e); }
  };

  const processPromoSignup = async () => {
    try {
      const pendingPromo = localStorage.getItem('forilove_pending_promo');
      if (!pendingPromo) return;
      localStorage.removeItem('forilove_pending_promo');
      localStorage.removeItem('forilove_promo_info');
      window.dispatchEvent(new Event('promo-cleared'));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Promo sadece yeni kullanıcılara uygulanır (hesap < 1 saat)
      const accountAge = Date.now() - new Date(user.created_at).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (accountAge > ONE_HOUR) return;

      const { data } = await supabase.rpc('process_promo_signup', {
        p_promo_code: pendingPromo,
        p_user_id: user.id,
      });

      if (data?.success) {
        sessionStorage.setItem('forilove_show_welcome_coupon', 'true');
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Promo signup failed:', e); }
  };

  const checkWelcomeCoupon = async () => {
    try {
      const flag = sessionStorage.getItem('forilove_show_welcome_coupon');
      if (!flag) return;
      sessionStorage.removeItem('forilove_show_welcome_coupon');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc('get_welcome_coupon', { p_user_id: user.id });
      if (data?.found) {
        setWelcomeCoupon({
          code: data.code,
          discountPercent: data.discount_percent,
          expiresAt: data.expires_at,
        });
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Welcome coupon check failed:', e); }
  };

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
        .select('coin_balance, name, surname')
        .eq('user_id', user.id)
        .single();

      setCoinBalance(profile?.coin_balance || 0);

      // Sync OAuth display name to profile if missing
      if (profile && !profile.name && !profile.surname) {
        const meta = user.user_metadata;
        const fullName = meta?.full_name || meta?.name || '';
        if (fullName) {
          const parts = fullName.trim().split(/\s+/);
          const firstName = parts[0] || '';
          const lastName = parts.slice(1).join(' ') || '';
          if (firstName) {
            Promise.resolve(supabase.from('profiles').update({ name: firstName, surname: lastName }).eq('user_id', user.id)).catch(() => {});
          }
        }
      }

      // Load purchases and saved templates in parallel
      const [purchasesResult, savedResult] = await Promise.all([
        supabase.from("purchases").select("template_id").eq("user_id", user.id).eq("payment_status", "completed"),
        supabase.from("saved_templates").select("template_id").eq("user_id", user.id),
      ]);

      if (purchasesResult.error && process.env.NODE_ENV === 'development') {
        console.warn('Failed to load purchases:', purchasesResult.error.message);
      }
      if (savedResult.error && process.env.NODE_ENV === 'development') {
        console.warn('Failed to load saved templates:', savedResult.error.message);
      }

      const purchasedTemplateIds = purchasesResult.data?.map(p => p.template_id) || [];
      setPurchases(purchasedTemplateIds);
      setSavedTemplates(savedResult.data?.map(s => s.template_id) || []);

      // Load templates excluding purchased ones
      let templatesQuery = supabase
        .from("templates")
        .select("id, name, slug, coin_price, discount_price, discount_label, discount_expires_at, description, html_content, purchase_count")
        .eq("is_active", true);

      if (purchasedTemplateIds.length > 0) {
        templatesQuery = templatesQuery.not("id", "in", `(${purchasedTemplateIds.join(',')})`);
      }

      const { data: templatesData, error: templatesError } = await templatesQuery
        .order("coin_price", { ascending: true })
        .range(0, ITEMS_PER_PAGE - 1);

      if (templatesError) {
        toast.error(`Şablon hatası: ${templatesError.message}`);
      }

      setHasMore((templatesData?.length || 0) === ITEMS_PER_PAGE);
      setTemplates(templatesData || []);
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
        .select("id, name, slug, coin_price, discount_price, discount_label, discount_expires_at, description, html_content, purchase_count")
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

        toast.success("Kaydedilenlerden çıkarıldı.");
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

        toast.success("Kaydedilenlere eklendi!");
      }
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız");
    }
  };

  const handleTemplateClick = (templateId: string) => {
    router.push(`/dashboard/editor/${templateId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white max-w-none w-screen relative left-1/2 -translate-x-1/2">
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl">
          <nav className="w-full px-3 sm:px-6 lg:px-10 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-7 w-7 text-pink-500 fill-pink-500" />
              <span className="text-2xl font-bold">Forilove</span>
            </div>
          </nav>
        </header>
        <section className="pt-12 pb-8">
          <div className="w-full px-3 sm:px-6 lg:px-10">
            <div className="animate-pulse bg-white/[0.06] h-10 w-64 rounded-lg mb-4" />
            <div className="animate-pulse bg-white/[0.06] h-5 w-96 max-w-full rounded-lg" />
          </div>
        </section>
        <main className="w-full px-3 sm:px-6 lg:px-10 pb-20 md:pb-8">
          <TemplateGridSkeleton />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white max-w-none w-screen relative left-1/2 -translate-x-1/2">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl">
        <DashboardNav />
      </header>

      {/* Hero */}
      <section className="pt-12 pb-8">
        <div className="w-full px-3 sm:px-6 lg:px-10">
          <h1 className="text-4xl font-bold mb-4">Şablonları Keşfet</h1>
          <p className="text-base text-zinc-400">
            Sevdiğinize özel bir sayfa oluşturmak için bir şablon seçin ve düzenleyin.
          </p>
        </div>
      </section>

      {/* Templates */}
      <main className="w-full px-3 sm:px-6 lg:px-10 pb-20 md:pb-8 md:pt-0">
        {templates.length === 0 ? (
          <EmptyState
            title="Henüz şablon yok"
            message="Şu anda görüntülenebilecek şablon yok."
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
                  title="Henüz Şablon Yok"
                  message="Şu anda gösterilecek şablon bulunmuyor."
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

      {/* Welcome Coupon Modal */}
      {welcomeCoupon && (
        <WelcomeCouponModal
          code={welcomeCoupon.code}
          discountPercent={welcomeCoupon.discountPercent}
          expiresAt={welcomeCoupon.expiresAt}
          onClose={() => setWelcomeCoupon(null)}
        />
      )}
    </div>
  );
}
