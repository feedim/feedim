"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, CheckCircle, Clock, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

const ALLOWED_DOMAINS = [
  "instagram.com", "www.instagram.com",
  "tiktok.com", "www.tiktok.com",
  "youtube.com", "www.youtube.com", "youtu.be",
  "twitter.com", "www.twitter.com", "x.com", "www.x.com",
  "facebook.com", "www.facebook.com",
  "twitch.tv", "www.twitch.tv",
  "linkedin.com", "www.linkedin.com",
  "pinterest.com", "www.pinterest.com",
  "threads.net", "www.threads.net",
  "kick.com", "www.kick.com",
];

function isValidSocialUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return ALLOWED_DOMAINS.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export default function AffiliateApplyPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [form, setForm] = useState({ socialMedia: "", followers: "", description: "" });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/login");
          return;
        }
        setUser(authUser);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, name, surname, role")
          .eq("user_id", authUser.id)
          .single();

        if (profileData?.role === "affiliate" || profileData?.role === "admin") {
          router.push("/dashboard/profile");
          return;
        }

        setProfile(profileData);

        // Check existing application
        const res = await fetch("/api/affiliate/apply");
        if (res.ok) {
          const data = await res.json();
          if (data.application) {
            setExistingApplication(data.application);
          }
        }
      } catch {
        router.push("/dashboard/profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getDisplayName = () => {
    if (profile?.name && profile?.surname) return `${profile.name} ${profile.surname}`;
    if (profile?.name) return profile.name;
    return user?.email?.split("@")[0] || "Kullanıcı";
  };

  const handleSubmit = async () => {
    if (!form.socialMedia.trim()) {
      toast.error("Sosyal medya hesabı zorunludur");
      return;
    }
    if (!isValidSocialUrl(form.socialMedia.trim())) {
      toast.error("Geçerli bir sosyal medya linki girin (Instagram, TikTok, YouTube, X vb.)");
      return;
    }
    if (!form.followers.trim() || !/^\d+$/.test(form.followers.trim())) {
      toast.error("Takipçi sayısı sadece rakam olmalıdır");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/affiliate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialMedia: form.socialMedia.trim(),
          followers: form.followers.trim(),
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Başvuru gönderilemedi");
        return;
      }
      setExistingApplication({ status: "pending", created_at: new Date().toISOString(), social_media: form.socialMedia, followers: form.followers, description: form.description });
      toast.success("Başvurunuz alındı!");
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
          <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
            <div className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" /><span className="font-medium">Geri</span></div>
            <h1 className="text-lg font-semibold">Satış Ortağı</h1>
            <div className="w-16" />
          </nav>
        </header>
        <main className="container mx-auto px-3 sm:px-6 py-8 pb-24 md:pb-16">
          <div className="animate-pulse space-y-4 max-w-lg mx-auto">
            <div className="h-10 bg-zinc-800 rounded-xl" />
            <div className="h-10 bg-zinc-800 rounded-xl" />
            <div className="h-10 bg-zinc-800 rounded-xl" />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Satış Ortağı</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-lg">
        {existingApplication ? (
          <div className="bg-zinc-900 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              {existingApplication.status === "pending" && <Clock className="h-10 w-10 text-yellow-500" />}
              {existingApplication.status === "approved" && <CheckCircle className="h-10 w-10 text-green-500" />}
              {existingApplication.status === "rejected" && <XCircle className="h-10 w-10 text-red-500" />}
              <div>
                <h2 className="text-lg font-bold">
                  {existingApplication.status === "pending" && "Başvurunuz İnceleniyor"}
                  {existingApplication.status === "approved" && "Başvurunuz Onaylandı!"}
                  {existingApplication.status === "rejected" && "Başvurunuz Reddedildi"}
                </h2>
                <p className="text-xs text-gray-500">
                  {new Date(existingApplication.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-gray-400">Durum</span>
                <span className={`font-medium px-2.5 py-0.5 rounded-full text-xs ${
                  existingApplication.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                  existingApplication.status === "approved" ? "bg-green-500/20 text-green-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {existingApplication.status === "pending" ? "Bekliyor" : existingApplication.status === "approved" ? "Onaylandı" : "Reddedildi"}
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-gray-400">Sosyal Medya</span>
                <span className="text-white truncate max-w-[200px]">{existingApplication.social_media}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-gray-400">Takipçi</span>
                <span className="text-white">{Number(existingApplication.followers).toLocaleString("tr-TR")}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Aklınıza takılan sorular ve destek için <a href="mailto:affiliate@forilove.com" className="text-pink-500 hover:text-pink-400">affiliate@forilove.com</a>
            </p>

            <button onClick={() => router.push("/dashboard/profile")} className="btn-secondary w-full py-3 text-sm">
              Profile Dön
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Affiliate Programına Başvur</h2>
                <p className="text-sm text-gray-500">Takipçilerinize özel indirim linkleri oluşturun, her satıştan %15-%30 komisyon kazanın.</p>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ad Soyad</label>
                <input
                  type="text"
                  value={getDisplayName()}
                  readOnly
                  className="input-modern w-full text-sm opacity-60 cursor-not-allowed"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">E-posta</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="input-modern w-full text-sm opacity-60 cursor-not-allowed"
                  maxLength={255}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Sosyal Medya Linki <span className="text-pink-500">*</span></label>
                <input
                  type="url"
                  value={form.socialMedia}
                  onChange={(e) => setForm({ ...form, socialMedia: e.target.value })}
                  placeholder="https://instagram.com/kullaniciadi"
                  className="input-modern w-full text-sm"
                  maxLength={200}
                />
                <p className="text-[10px] text-gray-600 mt-0.5">Instagram, TikTok, YouTube, X, Facebook, Twitch, Threads, Kick, Pinterest, LinkedIn</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Takipçi Sayısı <span className="text-pink-500">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.followers}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, followers: val });
                  }}
                  placeholder="Örn: 10000"
                  className="input-modern w-full text-sm"
                  maxLength={15}
                />
                <p className="text-[10px] text-gray-600 mt-0.5">Takipçi sayısı zorunlu değildir ancak onay ihtimalinizi arttırır.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Neden Başvuruyorsunuz? <span className="text-gray-600">(opsiyonel)</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => {
                    const val = e.target.value.replace(/<[^>]*>/g, "").slice(0, 300);
                    setForm({ ...form, description: val });
                  }}
                  placeholder="Kısaca kendinizden bahsedin..."
                  className="input-modern w-full text-sm resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-[10px] text-gray-600 text-right mt-0.5">{form.description.length}/300</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary w-full py-3 text-sm font-semibold"
              >
                {submitting ? "Gönderiliyor..." : "Gönder"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Aklınıza takılan sorular ve destek için <a href="mailto:affiliate@forilove.com" className="text-pink-500 hover:text-pink-400">affiliate@forilove.com</a>
              </p>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
