"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Coins, LogOut, Heart, Settings, Clock, Calendar, Wallet, Trash2, Edit2, Bookmark, ShoppingBag, Sparkles, HelpCircle, FileText, Shield, MessageCircle, ScrollText, BarChart3, Globe, Lock, Eye, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [adminProjects, setAdminProjects] = useState<any[]>([]);
  const [adminProjectsTotal, setAdminProjectsTotal] = useState(0);
  const [adminProjectsPage, setAdminProjectsPage] = useState(0);
  const [adminProjectsTotalPages, setAdminProjectsTotalPages] = useState(0);
  const [adminProjectsLoading, setAdminProjectsLoading] = useState(false);
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
          const res = await fetch('/api/admin/stats');
          if (res.ok) {
            setAdminStats(await res.json());
          }
        } catch { /* silent */ }
        loadAdminProjects(0);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Profile load error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAdminProjects = async (pg: number) => {
    setAdminProjectsLoading(true);
    try {
      const res = await fetch(`/api/admin/projects?page=${pg}`);
      if (res.ok) {
        const data = await res.json();
        setAdminProjects(data.projects || []);
        setAdminProjectsTotal(data.total || 0);
        setAdminProjectsPage(data.page || 0);
        setAdminProjectsTotalPages(data.totalPages || 0);
      }
    } catch { /* silent */ }
    finally { setAdminProjectsLoading(false); }
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
                <p className="text-2xl font-bold text-[#39FF14]">{adminStats.todayRevenueTRY.toLocaleString('tr-TR')} <span className="text-sm text-gray-400">TRY</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Toplam Satış</p>
                <p className="text-2xl font-bold text-[#39FF14]">{adminStats.totalRevenueTRY.toLocaleString('tr-TR')} <span className="text-sm text-gray-400">TRY</span></p>
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

        {/* Admin Published Projects */}
        {profile?.role === 'admin' && (
          <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">Yayınlanan Sayfalar</h3>
                <span className="text-xs text-gray-500">({adminProjectsTotal})</span>
              </div>
            </div>

            {adminProjectsLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse bg-white/5 rounded-xl h-16" />
                ))}
              </div>
            ) : adminProjects.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Henüz yayınlanan sayfa yok.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {adminProjects.map((p: any) => (
                    <div key={p.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {p.is_public ? (
                            <Globe className="h-3.5 w-3.5 text-green-400 shrink-0" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">{p.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="truncate">@{p.creator_name}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Eye className="h-3 w-3" />
                            {(p.view_count || 0).toLocaleString('tr-TR')}
                          </span>
                          <span className="shrink-0">{new Date(p.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.is_public ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-500'}`}>
                          {p.is_public ? 'Public' : 'Gizli'}
                        </span>
                        <Link
                          href={`/p/${p.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg hover:bg-white/10 transition"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {adminProjectsTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <button
                      onClick={() => loadAdminProjects(adminProjectsPage - 1)}
                      disabled={adminProjectsPage === 0}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Önceki
                    </button>
                    <span className="text-xs text-gray-500">
                      {adminProjectsPage + 1} / {adminProjectsTotalPages}
                    </span>
                    <button
                      onClick={() => loadAdminProjects(adminProjectsPage + 1)}
                      disabled={adminProjectsPage >= adminProjectsTotalPages - 1}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Sonraki
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
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
