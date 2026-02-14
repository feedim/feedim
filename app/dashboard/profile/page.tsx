"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Coins, LogOut, Heart, Settings, Clock, Calendar, Wallet, Trash2, Edit2, Bookmark, ShoppingBag, Sparkles, HelpCircle, FileText, Shield, MessageCircle, ScrollText, BarChart3, Globe, Ticket, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ProfileSkeleton } from "@/components/Skeletons";
import ReferralSection from "@/components/ReferralSection";
import { translateError } from "@/lib/utils/translateError";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: 15, maxUses: 100, expiryHours: 720, isFree: false });
  const [couponCreating, setCouponCreating] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: 15, maxSignups: 500, expiryHours: 720, isFree: false });
  const [promoCreating, setPromoCreating] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);
  const [sponsorAnalytics, setSponsorAnalytics] = useState<any>(null);
  const [sponsorUsers, setSponsorUsers] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, name, surname, coin_balance, role")
        .eq("user_id", authUser.id)
        .single();

      setProfile(profileData);
      setFirstName(profileData?.name || "");
      setLastName(profileData?.surname || "");

      if (profileData?.role === 'admin') {
        try {
          const [statsRes, couponsRes, promosRes] = await Promise.all([
            fetch('/api/admin/stats'),
            fetch('/api/admin/coupons'),
            fetch('/api/admin/coupons?type=promo'),
          ]);
          if (statsRes.ok) {
            setAdminStats(await statsRes.json());
          }
          if (couponsRes.ok) {
            const couponsData = await couponsRes.json();
            setCoupons(couponsData.coupons || []);
          }
          if (promosRes.ok) {
            const promosData = await promosRes.json();
            setPromos(promosData.promos || []);
          }
        } catch { /* silent */ }
      } else if (profileData?.role === 'affiliate') {
        try {
          const res = await fetch('/api/affiliate/promos');
          if (res.ok) {
            const data = await res.json();
            setPromos(data.promos || []);
            setSponsorAnalytics(data.analytics || null);
            setSponsorUsers(data.recentUsers || []);
          }
        } catch { /* silent */ }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Profile load error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: firstName,
          surname: lastName,
          full_name: `${firstName} ${lastName}`,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profil güncellendi!");
      setEditMode(false);
      loadProfile();
    } catch (error: any) {
      toast.error("Güncelleme hatası: " + translateError(error.message));
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      toast.success("E-posta güncelleme linki gönderildi! Lütfen e-postanızı kontrol edin.");
      setEditEmail(false);
      setNewEmail("");
    } catch (error: any) {
      toast.error("E-posta güncelleme hatası: " + translateError(error.message));
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "DELETE") {
      toast.error("Lütfen 'DELETE' yazarak onaylayın");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Hesap silinemedi");
      }

      await supabase.auth.signOut();
      toast.success("Hesabınız ve tüm verileriniz kalıcı olarak silindi.");
      router.push("/");
    } catch (error: any) {
      toast.error("Silme hatası: " + translateError(error.message));
    } finally {
      setDeleting(false);
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

  const handleCreatePromo = async () => {
    if (!promoForm.code.trim()) {
      toast.error("Promo kodu girin");
      return;
    }
    setPromoCreating(true);
    try {
      const isSponsor = profile?.role === 'affiliate';
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
      const isSponsor = profile?.role === 'affiliate';
      const apiUrl = isSponsor ? '/api/affiliate/promos' : '/api/admin/coupons';
      const res = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId }),
      });
      if (!res.ok) {
        toast.error('Promo silinemedi');
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
          <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
            <div className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" /><span className="font-medium">Geri</span></div>
            <h1 className="text-lg font-semibold">Profil</h1>
            <div className="w-16" />
          </nav>
        </header>
        <main className="container mx-auto px-3 sm:px-6 py-8 pb-24 md:pb-16">
          <ProfileSkeleton />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Get user initials
  const getInitials = () => {
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    const name = user?.email?.split('@')[0] || 'U';
    return name.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) {
      return firstName;
    }
    return user?.email?.split('@')[0] || 'Kullanıcı';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push('/dashboard'); } }} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Profil</h1>
          <div className="w-16"></div>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {/* Profile Header - Minimal */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-gray-300/20 flex items-center justify-center text-2xl font-semibold text-gray-300">
              {getInitials()}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1 truncate max-w-[250px]">{getDisplayName()}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="p-3 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Profili düzenle"
          >
            <Edit2 className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Edit Profile Form */}
        {editMode && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-6 space-y-4">
            <h3 className="font-semibold mb-4">Profili Düzenle</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Ad</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-modern w-full"
                placeholder="Adınız"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Soyad</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-modern w-full"
                placeholder="Soyadınız"
                maxLength={50}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setEditMode(false);
                  setFirstName(profile?.name || "");
                  setLastName(profile?.surname || "");
                }}
                className="flex-1 btn-secondary py-3"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateProfile}
                className="flex-1 btn-primary py-3"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}

        {/* Coin Balance Card */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Bakiye</p>
              <p className="text-4xl font-black text-yellow-500">{profile?.coin_balance || 0} <span className="text-xl text-gray-400">FL</span></p>
            </div>
            <Link href="/dashboard/coins">
              <button className="btn-primary px-6 py-3" style={{ background: 'var(--color-yellow-500)', color: 'black' }}>
                <Wallet className="h-5 w-5 inline mr-2" />
                Yükle
              </button>
            </Link>
          </div>
        </div>

        {/* Admin Analytics */}
        {profile?.role === 'admin' && adminStats && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Admin Analytics</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Bugün Satış</p>
                <p className="text-2xl font-bold text-pink-500">{adminStats.todayRevenueTRY.toLocaleString('tr-TR')} <span className="text-sm text-gray-400">TRY</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Satış</p>
                <p className="text-2xl font-bold text-pink-500">{adminStats.totalRevenueTRY.toLocaleString('tr-TR')} <span className="text-sm text-gray-400">TRY</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Ödeme</p>
                <p className="text-2xl font-bold">{adminStats.totalPayments.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Coin</p>
                <p className="text-2xl font-bold text-yellow-500">{adminStats.totalCoins.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Yayınlanan Sayfa</p>
                <p className="text-2xl font-bold">{adminStats.publishedPages.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 col-span-2">
                <p className="text-xs text-gray-400 mb-1">Bugün Ödeme</p>
                <p className="text-2xl font-bold">{adminStats.todayPayments.toLocaleString('tr-TR')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Admin: Yayınlanan Sayfalar Link */}
        {profile?.role === 'admin' && (
          <div className="space-y-3 mb-6">
            <Link href="/dashboard/admin/projects" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-pink-500" />
                  <div>
                    <h3 className="font-semibold">Yayınlanan Sayfalar</h3>
                    <p className="text-xs text-gray-500">{adminStats?.publishedPages || 0} sayfa yayında</p>
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link href="/dashboard/admin/affiliate-payouts" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-pink-500" />
                  <div>
                    <h3 className="font-semibold">Affiliate Ödemeleri</h3>
                    <p className="text-xs text-gray-500">Ödeme taleplerini yönet</p>
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        )}

        {/* Admin: Son Üyeler */}
        {profile?.role === 'admin' && adminStats?.recentUsers?.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Son 10 Üye</h3>
            </div>
            <div className="space-y-3">
              {adminStats.recentUsers.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
                      {(u.name || u.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || [u.name, u.surname].filter(Boolean).join(' ') || 'İsimsiz'}</p>
                      <p className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-yellow-500 shrink-0">{u.coin_balance || 0} FL</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin: Kupon Yonetimi */}
        {profile?.role === 'admin' && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Kupon Yonetimi</h3>
            </div>

            {/* Create Coupon Form */}
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Kupon Kodu (max 9)</label>
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
                  <label className="block text-xs text-gray-400 mb-1">İndirim %</label>
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
                <span className="text-sm text-gray-400">Bedava (ucretsiz satin alma)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Kullanim</label>
                  <input
                    type="number"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="input-modern w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sure (saat)</label>
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
            {coupons.filter(c => c.coupon_type === 'general').length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Mevcut Kuponlar</p>
                {coupons.filter(c => c.coupon_type === 'general').map((coupon) => (
                  <div key={coupon.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-yellow-500 font-mono">{coupon.code}</span>
                        <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded-full">
                          {coupon.discount_percent === 100 ? 'BEDAVA' : `%${coupon.discount_percent}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {coupon.current_uses}/{coupon.max_uses || '∞'} kullanim
                        {coupon.expires_at && ` · ${new Date(coupon.expires_at) > new Date() ? `${Math.ceil((new Date(coupon.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}s kaldi` : 'suresi dolmus'}`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-2 text-gray-500 hover:text-red-400 transition shrink-0" title="Sil">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Affiliate Analytics */}
        {profile?.role === 'affiliate' && sponsorAnalytics && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Affiliate Program</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Kayıt</p>
                <p className="text-2xl font-bold">{sponsorAnalytics.totalSignups}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Satış</p>
                <p className="text-2xl font-bold">{sponsorAnalytics.totalPurchases}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Komisyon Oranı</p>
                <p className="text-2xl font-bold text-pink-500">%{sponsorAnalytics.commissionRate}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Kazanç</p>
                <p className="text-2xl font-bold text-pink-500">{sponsorAnalytics.totalEarnings.toLocaleString('tr-TR')} <span className="text-sm text-gray-400">TRY</span></p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">İndiriminiz ne kadar düşükse, komisyonunuz o kadar yüksek olur. (Min. %5 — Maks. %20)</p>
          </div>
        )}

        {/* Affiliate Son Kullanıcılar */}
        {profile?.role === 'affiliate' && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">Son Kayıt Olan Kullanıcılar</h3>
            </div>
            {sponsorUsers.length > 0 ? (
              <div className="space-y-3">
                {sponsorUsers.map((u: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-gray-300 shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-yellow-500 shrink-0">{u.coin_balance} FL</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Henüz linkinizden kayıt olan kullanıcı yok.</p>
            )}
          </div>
        )}

        {/* Affiliate Ödeme Bilgileri + Program Linki */}
        {profile?.role === 'affiliate' && (
          <div className="space-y-3 mb-6">
            <Link href="/dashboard/affiliate/payment" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-pink-500" />
                  <div>
                    <h3 className="font-semibold">Ödeme Bilgileri</h3>
                    <p className="text-xs text-gray-500">IBAN ve hesap bilgilerinizi giriniz</p>
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link href="/affiliate" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-pink-500" />
                  <div>
                    <h3 className="font-semibold">Affiliate Program</h3>
                    <p className="text-xs text-gray-500">Aklınızda bir soru mu var?</p>
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        )}

        {/* Promo Linkleri - Admin & Affiliate */}
        {(profile?.role === 'admin' || profile?.role === 'affiliate') && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">{profile?.role === 'affiliate' ? 'Affiliate Link' : 'İndirim Linkleri'}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">{profile?.role === 'affiliate' ? 'Takipçilerinize paylaşacağınız indirim linkiniz. Max %20 indirim.' : 'Kayıt linklerinden gelen kullanıcılar otomatik kupon alır.'}</p>

            {/* Create Promo Form - sponsors limited to 1 */}
            {(profile?.role === 'admin' || promos.length === 0) && <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Promo Kodu</label>
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
                  <label className="block text-xs text-gray-400 mb-1">İndirim % {profile?.role === 'affiliate' ? '(min 5, max 20)' : ''}</label>
                  <input
                    type="number"
                    value={promoForm.isFree ? 100 : promoForm.discountPercent}
                    onChange={(e) => setPromoForm({ ...promoForm, discountPercent: Math.min(profile?.role === 'affiliate' ? 20 : 100, Math.max(profile?.role === 'affiliate' ? 5 : 1, parseInt(e.target.value) || 5)) })}
                    min={profile?.role === 'affiliate' ? 5 : 1}
                    max={profile?.role === 'affiliate' ? 20 : 100}
                    disabled={promoForm.isFree}
                    className="input-modern w-full text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              {profile?.role === 'admin' && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={promoForm.isFree}
                    onChange={(e) => setPromoForm({ ...promoForm, isFree: e.target.checked })}
                    className="cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">Bedava (ucretsiz satin alma)</span>
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Max Kayit</label>
                  <input
                    type="number"
                    value={promoForm.maxSignups}
                    onChange={(e) => setPromoForm({ ...promoForm, maxSignups: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="input-modern w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sure (saat)</label>
                  <input
                    type="number"
                    value={promoForm.expiryHours}
                    onChange={(e) => setPromoForm({ ...promoForm, expiryHours: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="input-modern w-full text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleCreatePromo}
                disabled={promoCreating || promoForm.code.trim().length < 3}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {promoCreating ? "Olusturuluyor..." : "Promo Linki Olustur"}
              </button>
            </div>}

            {/* Promo Links List */}
            {promos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Aktif Promolar</p>
                {promos.map((promo) => (
                  <div key={promo.id} className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-yellow-500 font-mono">{promo.code}</span>
                          <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded-full">
                            {promo.discount_percent === 100 ? 'BEDAVA' : `%${promo.discount_percent}`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {promo.current_signups}/{promo.max_signups || '∞'} kayit
                          {promo.expires_at && ` · ${new Date(promo.expires_at) > new Date() ? `${Math.ceil((new Date(promo.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}s kaldi` : 'suresi dolmus'}`}
                          {profile?.role === 'admin' && promo.creator_email && ` · ${promo.creator_email}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyPromoLink(promo.code)}
                          className="px-3 py-1.5 text-xs bg-white/10 text-gray-300 hover:text-white rounded-lg transition"
                        >
                          {copiedPromo === promo.code ? 'Kopyalandi!' : 'Linki Kopyala'}
                        </button>
                        <button onClick={() => handleDeletePromo(promo.id)} className="p-2 text-gray-500 hover:text-red-400 transition" title="Sil">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Referral Section */}
        <ReferralSection userId={user.id} />

        {/* Settings Sections */}
        <div className="space-y-4 mt-6">
          {/* Account Section */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Hesap</h3>
            </div>
            <div className="divide-y divide-white/5">
              <Link href="/dashboard/transactions" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">İşlem Geçmişi</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>

              <Link href="/dashboard/purchased" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Satın Alınanlar</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>

              <Link href="/dashboard/my-pages" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Sayfalarım</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>

              <Link href="/dashboard/saved" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Bookmark className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Kaydedilenler</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>

              {/* Creator Studio - Only for creators/admins */}
              {(profile?.role === 'creator' || profile?.role === 'admin') && (
                <Link href="/creator" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors bg-gradient-to-r from-pink-500/5 to-purple-500/5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-pink-500" />
                    <span className="font-semibold text-pink-500">Creator Studio</span>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-pink-500 rotate-180" />
                </Link>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Bilgiler</h3>
            </div>
            <div className="divide-y divide-white/5">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-400">Üyelik Tarihi</span>
                </div>
                <span className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
              </div>

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-400">Son Giriş</span>
                </div>
                <span className="text-sm">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-400">E-posta</span>
                  </div>
                  <button
                    onClick={() => setEditEmail(!editEmail)}
                    className="text-sm text-white hover:text-gray-200 font-semibold transition-colors"
                  >
                    Değiştir
                  </button>
                </div>
                {!editEmail ? (
                  <span className="text-sm text-white pl-8">{user?.email || '-'}</span>
                ) : (
                  <div className="space-y-3 mt-3">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="input-modern w-full"
                      placeholder="Yeni e-posta adresiniz"
                      maxLength={255}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditEmail(false);
                          setNewEmail("");
                        }}
                        className="flex-1 btn-secondary py-2 text-sm"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleUpdateEmail}
                        className="flex-1 btn-primary py-2 text-sm"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Destek & Yasal */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Destek & Yasal</h3>
            </div>
            <div className="divide-y divide-white/5">
              <Link href="/help" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Yardım Merkezi</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>
              <Link href="/contact" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Bize Ulaşın</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>
              <Link href="/privacy" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Gizlilik Politikası</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>
              <Link href="/terms" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Kullanım Koşulları</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>
              <Link href="/distance-sales-contract" className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <ScrollText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Mesafeli Satış Sözleşmesi</span>
                </div>
                <ArrowLeft className="h-4 w-4 text-gray-400 rotate-180" />
              </Link>
            </div>
          </div>

          {/* Actions Section */}
          <div className="bg-zinc-900 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">İşlemler</h3>
            </div>
            <div className="px-5 py-4">
              <button
                onClick={handleSignOut}
                className="btn-secondary w-full"
              >
                <LogOut className="h-5 w-5" />
                Çıkış Yap
              </button>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="mt-6 text-center">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-500 hover:text-red-400 transition font-medium"
              >
                Hesabı kalıcı olarak sil
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-red-500 mb-3">
                    Hesabınız ve tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                  </p>
                  <p className="text-sm text-gray-400 mb-2">
                    Devam etmek için <span className="font-bold text-white">DELETE</span> yazın:
                  </p>
                  <input
                    type="text"
                    value={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.value)}
                    className="input-modern w-full mb-2"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 btn-danger"
                    disabled={confirmDeleteText !== "DELETE" || deleting}
                  >
                    {deleting ? "Siliniyor..." : "Evet, Sil"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmDeleteText("");
                    }}
                    className="flex-1 btn-secondary"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
