"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";

export default function AccountHealthPage() {
  useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const [profileRes, healthRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("profile_score, copyright_strike_count, status, created_at")
            .eq("user_id", user.id)
            .single(),
          fetch("/api/account/health"),
        ]);

        if (profileRes.data) setProfile(profileRes.data);

        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealth(healthData);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const rawScore = Math.min(100, Math.max(0, profile?.profile_score || 0));
  const trustScore = Math.round(rawScore * 10) / 10;

  const categories = [
    { label: "Telifli İçerik", count: health?.copyright_strikes ?? (profile?.copyright_strike_count || 0), max: 10, description: "Telif hakkı korumalı içeriklerin izinsiz kullanımı" },
    { label: "Kopya İçerik", count: health?.copy_content_strikes ?? 0, max: 10, description: "Başka kullanıcıların içeriklerinin kopyalanması" },
    { label: "Cinsel İçerik", count: health?.nsfw_strikes ?? 0, max: 10, description: "Topluluk kurallarına aykırı cinsel içerik paylaşımı" },
    { label: "Spam", count: health?.spam_strikes ?? 0, max: 10, description: "Tekrarlayan, yanıltıcı veya istenmeyen içerik paylaşımı" },
  ];

  const totalStrikes = categories.reduce((sum, c) => sum + c.count, 0);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-accent-main";
    return "text-error";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return "bg-success";
    if (score >= 40) return "bg-accent-main";
    return "bg-error";
  };

  return (
    <AppLayout headerTitle="Hesap Sağlığı" hideRightSidebar>
      <div className="px-4 py-4 space-y-5">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Güven Puanı */}
            <div className="bg-bg-secondary rounded-xl p-5">
              <div className="flex flex-col items-center text-center space-y-2">
                <span className="text-5xl font-bold text-text-primary">%{trustScore}</span>
                <p className="text-sm font-medium text-text-primary">Profil Güven Puanı</p>
                <p className="text-[0.72rem] text-text-muted">
                  {trustScore >= 70
                    ? "Hesabınız sağlıklı durumda. Topluluk kurallarına uygun davranmaya devam edin."
                    : trustScore >= 40
                      ? "Hesabınız orta düzeyde. Kuralları takip ederek puanınızı yükseltebilirsiniz."
                      : "Hesabınız risk altında. Topluluk kurallarına uymanız önemle tavsiye edilir."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border-primary">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /><span className="text-[0.65rem] text-text-muted">70-100 Sağlıklı</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-main" /><span className="text-[0.65rem] text-text-muted">40-69 Orta</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-error" /><span className="text-[0.65rem] text-text-muted">0-39 Riskli</span></div>
              </div>
            </div>

            {/* İhlal Hakları */}
            <div className="bg-bg-secondary rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">İhlal Hakları</p>
                {totalStrikes > 0 && (
                  <span className="text-xs text-error font-medium">Toplam {totalStrikes} ihlal</span>
                )}
              </div>

              {categories.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-text-primary">{item.label}</p>
                    <span className={`text-xs ${item.count > 0 ? "text-error font-medium" : "text-text-muted"}`}>{item.count}/{item.max}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: item.max }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1.5 rounded-full ${i < item.count ? "bg-error" : "bg-border-primary"}`}
                      />
                    ))}
                  </div>
                  <p className="text-[0.65rem] text-text-muted">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Kurallar */}
            <div className="bg-bg-secondary rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-text-primary">Nasıl çalışır?</p>
              <ul className="space-y-1.5 text-[0.72rem] text-text-muted">
                <li>Her ihlal tespitinde ilgili kategoriye 1 ihlal hakkı eklenir.</li>
                <li>10 ihlal hakkına ulaşıldığında hesabınız moderasyona alınır ve inceleme sonrasında kapatılabilir.</li>
                <li>Topluluk kurallarına uygun davranarak ihlal almaktan kaçınabilirsiniz.</li>
              </ul>
            </div>

            {/* Linkler */}
            <div className="space-y-2">
              <Link href="/settings/copyright" className="block text-xs text-accent-main hover:underline">
                Telif hakkı koruması hakkında daha fazla bilgi &rarr;
              </Link>
              <Link href="/help/community-guidelines" className="block text-xs text-accent-main hover:underline">
                Topluluk kuralları &rarr;
              </Link>
              <Link href="/help/contact" className="block text-xs text-accent-main hover:underline">
                Destek için iletişime geçin &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
