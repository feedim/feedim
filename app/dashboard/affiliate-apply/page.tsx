"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function AffiliateApplyPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const handleSubmit = () => {
    if (!form.socialMedia.trim() || !form.followers.trim()) {
      toast.error("Sosyal medya hesabı ve takipçi sayısı zorunludur");
      return;
    }
    const name = getDisplayName();
    const email = user?.email || "";
    const subject = encodeURIComponent(`Affiliate Başvurusu - ${name}`);
    const body = encodeURIComponent(
      `Ad Soyad: ${name}\nE-posta: ${email}\nSosyal Medya: ${form.socialMedia}\nTakipçi Sayısı: ${form.followers}${form.description ? `\nAçıklama: ${form.description}` : ""}`
    );
    window.location.href = `mailto:affiliate@forilove.com?subject=${subject}&body=${body}`;
    toast.success("Mail uygulamanız açılacak, başvurunuzu gönderin!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
          <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
            <div className="flex items-center gap-2"><ArrowLeft className="h-5 w-5" /><span className="font-medium">Geri</span></div>
            <h1 className="text-lg font-semibold">Satış Ortağı Başvurusu</h1>
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
          <h1 className="text-lg font-semibold">Satış Ortağı Başvurusu</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-lg">
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
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">E-posta</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="input-modern w-full text-sm opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Sosyal Medya Hesabı <span className="text-pink-500">*</span></label>
            <input
              type="url"
              value={form.socialMedia}
              onChange={(e) => setForm({ ...form, socialMedia: e.target.value })}
              placeholder="https://instagram.com/kullaniciadi"
              className="input-modern w-full text-sm"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Takipçi Sayısı <span className="text-pink-500">*</span></label>
            <input
              type="text"
              value={form.followers}
              onChange={(e) => setForm({ ...form, followers: e.target.value })}
              placeholder="Örn: 10.000"
              className="input-modern w-full text-sm"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Neden Başvuruyorsunuz? <span className="text-gray-600">(opsiyonel)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 300) })}
              placeholder="Kısaca kendinizden bahsedin..."
              className="input-modern w-full text-sm resize-none"
              rows={3}
              maxLength={300}
            />
            <p className="text-[10px] text-gray-600 text-right mt-0.5">{form.description.length}/300</p>
          </div>

          <button
            onClick={handleSubmit}
            className="btn-primary w-full py-3 text-sm font-semibold"
          >
            Gönder
          </button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
