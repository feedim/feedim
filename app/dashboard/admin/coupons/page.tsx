"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ticket, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

const ITEMS_PER_PAGE = 10;

export default function AdminCouponsPage() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: 15, maxUses: 100, expiryHours: 720, isFree: false });
  const [couponCreating, setCouponCreating] = useState(false);
  const [visibleCoupons, setVisibleCoupons] = useState(ITEMS_PER_PAGE);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!couponForm.code.trim()) {
      toast.error("Kupon kodu girin");
      return;
    }
    setCouponCreating(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponForm.code,
          discountPercent: couponForm.isFree ? 100 : couponForm.discountPercent,
          maxUses: couponForm.maxUses,
          expiryHours: couponForm.expiryHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Kupon oluşturulamadı');
        return;
      }
      toast.success(`Kupon oluşturuldu: ${data.coupon.code}`);
      setCoupons([data.coupon, ...coupons]);
      setCouponForm({ code: '', discountPercent: 15, maxUses: 100, expiryHours: 720, isFree: false });
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setCouponCreating(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId }),
      });
      if (!res.ok) {
        toast.error('Kupon silinemedi');
        return;
      }
      setCoupons(coupons.filter(c => c.id !== couponId));
      toast.success('Kupon silindi');
    } catch {
      toast.error('Bir hata olustu');
    }
  };

  const generalCoupons = coupons.filter(c => c.coupon_type === 'general');

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Kupon Yönetimi</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-60" />
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Kupon Yönetimi</h3>
            </div>

            {/* Create Coupon Form */}
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Kupon Kodu (max 9)</label>
                  <input
                    type="text"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    placeholder="YENI2026"
                    maxLength={9}
                    className="input-modern w-full text-sm font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">İndirim %</label>
                  <input
                    type="number"
                    value={couponForm.isFree ? 100 : couponForm.discountPercent}
                    onChange={(e) => setCouponForm({ ...couponForm, discountPercent: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
                    min={1}
                    max={100}
                    disabled={couponForm.isFree}
                    className="input-modern w-full text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={couponForm.isFree}
                  onChange={(e) => setCouponForm({ ...couponForm, isFree: e.target.checked })}
                  className="cursor-pointer"
                />
                <span className="text-sm text-zinc-400">Bedava (ucretsiz satin alma)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Max Kullanim</label>
                  <input
                    type="number"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="input-modern w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sure (saat)</label>
                  <input
                    type="number"
                    value={couponForm.expiryHours}
                    onChange={(e) => setCouponForm({ ...couponForm, expiryHours: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="input-modern w-full text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateCoupon}
                disabled={couponCreating || couponForm.code.trim().length < 3}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {couponCreating ? "Olusturuluyor..." : "Kupon Olustur"}
              </button>
            </div>

            {/* Coupons List */}
            {generalCoupons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Mevcut Kuponlar</p>
                {generalCoupons.slice(0, visibleCoupons).map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-yellow-500 font-mono">{coupon.code}</span>
                        <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded-full">
                          {coupon.discount_percent === 100 ? 'BEDAVA' : `%${coupon.discount_percent}`}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {coupon.current_uses}/{coupon.max_uses || '∞'} kullanim
                        {coupon.expires_at && ` · ${new Date(coupon.expires_at) > new Date() ? `${Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}s kaldi` : 'suresi dolmus'}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-zinc-500 hover:text-red-400 transition shrink-0" title="Sil">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {visibleCoupons < generalCoupons.length && (
                  <button
                    onClick={() => setVisibleCoupons(prev => prev + ITEMS_PER_PAGE)}
                    className="w-full py-2 text-sm text-pink-500 hover:text-pink-400 font-medium transition"
                  >
                    Daha Fazla Göster ({generalCoupons.length - visibleCoupons} kalan)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
