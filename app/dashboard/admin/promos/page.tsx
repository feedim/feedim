"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Plus, X, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

const ITEMS_PER_PAGE = 10;

export default function AdminPromosPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [promos, setPromos] = useState<any[]>([]);
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: 15, maxSignups: 500, expiryHours: 720, isFree: false });
  const [promoCreating, setPromoCreating] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);
  const [visiblePromos, setVisiblePromos] = useState(ITEMS_PER_PAGE);
  const [mfaEnabled, setMfaEnabled] = useState(false);
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

      if (profile?.role !== "admin" && profile?.role !== "affiliate") {
        router.push("/dashboard");
        return;
      }

      setRole(profile.role);

      // Check MFA for affiliates
      if (profile.role === "affiliate") {
        const mfaRes = await fetch("/api/auth/mfa");
        if (mfaRes.ok) {
          const mfaData = await mfaRes.json();
          setMfaEnabled(mfaData.enabled);
        }
      } else {
        setMfaEnabled(true); // admin doesn't require MFA
      }

      if (profile.role === "admin") {
        const res = await fetch("/api/admin/coupons?type=promo");
        if (res.ok) {
          const data = await res.json();
          setPromos(data.promos || []);
        }
      } else {
        const res = await fetch("/api/affiliate/promos");
        if (res.ok) {
          const data = await res.json();
          setPromos(data.promos || []);
        }
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!promoForm.code.trim()) {
      toast.error("Promo kodu girin");
      return;
    }
    setPromoCreating(true);
    try {
      const isSponsor = role === 'affiliate';
      const apiUrl = isSponsor ? '/api/affiliate/promos' : '/api/admin/coupons';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isSponsor ? {} : { type: 'promo' }),
          code: promoForm.code,
          discountPercent: promoForm.isFree ? 100 : promoForm.discountPercent,
          maxSignups: promoForm.maxSignups,
          expiryHours: promoForm.expiryHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Promo oluşturulamadı');
        return;
      }
      toast.success(`Promo linki oluşturuldu: ${data.promo.code}`);
      setPromos([data.promo, ...promos]);
      setPromoForm({ code: '', discountPercent: 15, maxSignups: 500, expiryHours: 720, isFree: false });
    } catch {
      toast.error('Bir hata olustu');
    } finally {
      setPromoCreating(false);
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    try {
      const isSponsor = role === 'affiliate';
      const apiUrl = isSponsor ? '/api/affiliate/promos' : '/api/admin/coupons';
      const res = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Promo silinemedi');
        return;
      }
      setPromos(promos.filter(p => p.id !== promoId));
      toast.success('Promo silindi');
    } catch {
      toast.error('Bir hata olustu');
    }
  };

  const copyPromoLink = async (code: string) => {
    const url = `${window.location.origin}/?promo=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPromo(code);
      setTimeout(() => setCopiedPromo(null), 2000);
    } catch {
      setCopiedPromo(code);
      setTimeout(() => setCopiedPromo(null), 2000);
    }
  };

  const isAffiliate = role === 'affiliate';

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">{isAffiliate ? 'Affiliate Link' : 'İndirim Linkleri'}</h1>
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
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">{isAffiliate ? 'Affiliate Link' : 'İndirim Linkleri'}</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">{isAffiliate ? 'Takipçilerinize paylaşacağınız indirim linkiniz. Max %20 indirim.' : 'Kayıt linklerinden gelen kullanıcılar otomatik kupon alır.'}</p>

            {/* 2FA Gate for Affiliates */}
            {isAffiliate && !mfaEnabled && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-yellow-400" />
                  <p className="text-sm font-semibold text-yellow-400">2FA Zorunlu</p>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  İndirim linki oluşturmak için iki faktörlü doğrulamayı etkinleştirmeniz gerekmektedir.
                </p>
                <Link href="/dashboard/security" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  2FA Etkinleştir
                </Link>
              </div>
            )}

            {/* Create Promo Form - sponsors limited to 1 */}
            {(!isAffiliate || (promos.length === 0 && mfaEnabled)) && (
              <div className="space-y-3 mb-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Promo Kodu</label>
                    <input
                      type="text"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                      placeholder="ENES20"
                      maxLength={10}
                      className="input-modern w-full text-sm font-mono tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">İndirim % {isAffiliate ? '(min 5, max 20)' : ''}</label>
                    <input
                      type="number"
                      value={promoForm.isFree ? 100 : promoForm.discountPercent}
                      onChange={(e) => setPromoForm({ ...promoForm, discountPercent: Math.min(isAffiliate ? 20 : 100, Math.max(isAffiliate ? 5 : 1, parseInt(e.target.value) || 5)) })}
                      min={isAffiliate ? 5 : 1}
                      max={isAffiliate ? 20 : 100}
                      disabled={promoForm.isFree}
                      className="input-modern w-full text-sm disabled:opacity-50"
                    />
                  </div>
                </div>
                {!isAffiliate && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={promoForm.isFree}
                      onChange={(e) => setPromoForm({ ...promoForm, isFree: e.target.checked })}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-zinc-400">Bedava (ucretsiz satin alma)</span>
                  </label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Max Kayit</label>
                    <input
                      type="number"
                      value={promoForm.maxSignups}
                      onChange={(e) => setPromoForm({ ...promoForm, maxSignups: Math.max(1, parseInt(e.target.value) || 1) })}
                      min={1}
                      className="input-modern w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Sure (saat)</label>
                    <input
                      type="number"
                      value={promoForm.expiryHours}
                      onChange={(e) => setPromoForm({ ...promoForm, expiryHours: Math.max(1, parseInt(e.target.value) || 1) })}
                      min={1}
                      className="input-modern w-full text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-pink-400">İlk ödemeye kadar kod ve oran değiştirilebilir, sonrasında değiştirilemez.</p>
                <button
                  onClick={handleCreatePromo}
                  disabled={promoCreating || promoForm.code.trim().length < 3}
                  className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {promoCreating ? "Olusturuluyor..." : "Promo Linki Olustur"}
                </button>
              </div>
            )}

            {/* Promo Links List */}
            {promos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Aktif Promolar</p>
                {promos.slice(0, visiblePromos).map((promo) => (
                  <div key={promo.id} className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-yellow-500 font-mono">{promo.code}</span>
                          <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded-full">
                            {promo.discount_percent === 100 ? 'BEDAVA' : `%${promo.discount_percent}`}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          {promo.current_signups}/{promo.max_signups || '∞'} kayit
                          {promo.expires_at && ` · ${new Date(promo.expires_at) > new Date() ? `${Math.ceil((new Date(promo.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}s kaldi` : 'suresi dolmus'}`}
                          {!isAffiliate && promo.creator_email && ` · ${promo.creator_email}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyPromoLink(promo.code)}
                          className="px-3 py-1.5 text-xs bg-white/10 text-zinc-300 hover:text-white rounded-lg transition"
                        >
                          {copiedPromo === promo.code ? 'Kopyalandi!' : 'Linki Kopyala'}
                        </button>
                        <button onClick={() => handleDeletePromo(promo.id)} className="p-2 text-zinc-500 hover:text-red-400 transition" title="Sil">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {visiblePromos < promos.length && (
                  <button
                    onClick={() => setVisiblePromos(prev => prev + ITEMS_PER_PAGE)}
                    className="w-full py-2 text-sm text-pink-500 hover:text-pink-400 font-medium transition"
                  >
                    Daha Fazla Göster ({promos.length - visiblePromos} kalan)
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
