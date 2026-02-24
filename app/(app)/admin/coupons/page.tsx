"use client";

import { useEffect, useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Ticket, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import MobileBottomNav from "@/components/MobileBottomNav";
import LoadingShell from "@/components/LoadingShell";

const ITEMS_PER_PAGE = 10;

export default function AdminCouponsPage() {
  useSearchParams();
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
        router.push("/");
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
      feedimAlert("error", "Kupon kodu girin");
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
        feedimAlert("error",data.error || 'Kupon oluşturulamadı, lütfen daha sonra tekrar deneyin');
        return;
      }
      feedimAlert("success",`Kupon oluşturuldu: ${data.coupon.code}`);
      setCoupons([data.coupon, ...coupons]);
      setCouponForm({ code: '', discountPercent: 15, maxUses: 100, expiryHours: 720, isFree: false });
    } catch {
      feedimAlert("error",'Bir hata oluştu, lütfen daha sonra tekrar deneyin');
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
        feedimAlert("error",'Kupon silinemedi, lütfen daha sonra tekrar deneyin');
        return;
      }
      setCoupons(coupons.filter(c => c.id !== couponId));
      feedimAlert("success",'Kupon silindi');
    } catch {
      feedimAlert("error",'Bir hata oluştu, lütfen daha sonra tekrar deneyin');
    }
  };

  const generalCoupons = coupons.filter(c => c.coupon_type === 'general');

  return (
    <div className="min-h-screen text-text-primary">
      <header className="sticky top-0 z-50 bg-bg-primary sticky-ambient min-h-[73px]">
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
          <LoadingShell>
            <div className="space-y-4">
              <div className="skeleton rounded-2xl h-60" />
            </div>
          </LoadingShell>
        ) : (
          <div className="rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-accent-main" />
              <h3 className="font-semibold">Kupon Yönetimi</h3>
            </div>

            {/* Create Coupon Form */}
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Kupon Kodu (max 9)</label>
                  <input
                    type="text"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toLocaleUpperCase('tr-TR').replace(/[^A-ZİŞĞÜÖÇ0-9]/g, '') })}
                    placeholder="YENI2026"
                    maxLength={9}
                    className="input-modern w-full text-sm font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">İndirim %</label>
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
                <span className="text-sm text-text-muted">Bedava (ücretsiz satın alma)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Max Kullanım</label>
                  <input
                    type="number"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    max={999999}
                    className="input-modern w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Süre (saat)</label>
                  <input
                    type="number"
                    value={couponForm.expiryHours}
                    onChange={(e) => setCouponForm({ ...couponForm, expiryHours: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    max={87600}
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
                {couponCreating ? "Oluşturuluyor..." : "Kupon Oluştur"}
              </button>
            </div>

            {/* Coupons List */}
            {generalCoupons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Mevcut Kuponlar</p>
                {generalCoupons.slice(0, visibleCoupons).map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-inverse/5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-warning font-mono">{coupon.code}</span>
                        <span className="text-xs bg-accent-main/20 text-accent-main px-2 py-0.5 rounded-full">
                          {coupon.discount_percent === 100 ? 'BEDAVA' : `%${coupon.discount_percent}`}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {coupon.current_uses}/{coupon.max_uses || '∞'} kullanım
                        {coupon.expires_at && ` ${new Date(coupon.expires_at) > new Date() ? `${Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}s kaldı` : 'süresi dolmuş'}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-text-muted hover:text-error transition shrink-0" title="Sil">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {visibleCoupons < generalCoupons.length && (
                  <button
                    onClick={() => setVisibleCoupons(prev => prev + ITEMS_PER_PAGE)}
                    className="w-full py-2 text-sm text-accent-main hover:text-accent-main font-medium transition"
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
