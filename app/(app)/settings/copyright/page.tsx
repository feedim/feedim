"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CopyrightApplicationForm from "@/components/CopyrightApplicationForm";
import { createClient } from "@/lib/supabase/client";

export default function CopyrightSettingsPage() {
  useSearchParams();
  const [loading, setLoading] = useState(true);
  const [copyrightEligible, setCopyrightEligible] = useState(false);
  const [copyrightEligibleSince, setCopyrightEligibleSince] = useState<string | null>(null);
  const [copyrightStrikes, setCopyrightStrikes] = useState(0);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("copyright_eligible, copyright_eligible_since, copyright_strike_count")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setCopyrightEligible(profile.copyright_eligible || false);
          setCopyrightEligibleSince(profile.copyright_eligible_since || null);
          setCopyrightStrikes(profile.copyright_strike_count || 0);
        }

        const appRes = await fetch("/api/copyright-applications");
        const appData = await appRes.json();
        if (appData.application) {
          setApplicationStatus(appData.application.status);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppLayout headerTitle="Telif Hakkı" hideRightSidebar>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : copyrightEligible ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-accent-main font-bold">
              <Check className="h-4 w-4" />
              <span>Telif hakkı koruması etkin{copyrightEligibleSince ? ` (${new Date(copyrightEligibleSince).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })})` : ""}</span>
            </div>
            <p className="text-xs text-text-muted">
              İçeriklerinizi yazarken telif hakkı koruması seçeneğini açarak içeriklerinizi koruma altına alabilirsiniz.
            </p>

            <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
              <p className="text-xs font-medium text-text-primary">İhlal Hakları</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-2 rounded-full ${i < copyrightStrikes ? "bg-error" : "bg-border-primary"}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-text-muted">{copyrightStrikes}/10</span>
              </div>
              <ul className="space-y-1.5 text-[0.72rem] text-text-muted">
                <li>Her telif hakkı ihlali veya kopya içerik tespitinde 1 ihlal hakkı eklenir.</li>
                <li>10 ihlal hakkına ulaşıldığında hesabınız moderasyona alınır ve inceleme sonrasında kapatılabilir.</li>
                <li>Destek için <a href="/help/contact" className="text-accent-main hover:underline">iletişime geçebilirsiniz</a>.</li>
              </ul>
            </div>
          </div>
        ) : applicationStatus === "pending" ? (
          <div className="space-y-3">
            <div className="bg-accent-main/10 rounded-xl p-4">
              <p className="text-sm font-medium text-accent-main">Başvurunuz inceleniyor</p>
              <p className="text-xs text-text-muted mt-1">Moderatörlerimiz başvurunuzu en kısa sürede değerlendirecek.</p>
            </div>
          </div>
        ) : applicationStatus === "approved" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-success">
              <Check className="h-4 w-4" />
              <span>Başvurunuz onaylandı</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-[15px] p-4">
              <p className="text-sm text-text-primary">
                Telif hakkı koruması düzgün özgün içerik üretiminde sistem tarafından otomatik olarak etkinleşir.
              </p>
              <p className="text-xs text-text-muted mt-2">
                Aşağıdaki koşulları sağlayan hesaplarda telif hakkı koruması otomatik olarak aktif hale gelir:
              </p>
              <ul className="space-y-1.5 text-xs text-text-muted mt-3">
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>E-posta adresinizi doğrulayın</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>En az 7 gündür içerik üreticisi olun</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>En az 3 gönderi yayınlayın</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Spam yapmayın, topluluk kurallarına uyun</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Telif ihlali yapmayın, kopya içerik paylaşmayın</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Özgün ve düzgün içerikler üretin</li>
              </ul>
              <p className="text-xs text-text-muted mt-3">
                Koşullar sağlandıktan sonra sistem bir sonraki değerlendirmede telif hakkı korumanızı otomatik olarak aktif eder.
                Bir kez etkinleştikten sonra aktif kalır.
              </p>
            </div>

            <div className="bg-bg-secondary rounded-[15px] p-4">
              <p className="text-sm font-medium mb-2">Hızlı başvuru: Kimler başvurabilir?</p>
              <p className="text-xs text-text-muted mb-2">Beklemek istemiyorsanız aşağıdaki formu doldurarak doğrudan erişim talep edebilirsiniz.</p>
              <ul className="space-y-1.5 text-xs text-text-muted">
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Özgün içerik üreten içerik üreticileri</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Yayınevleri ve medya kuruluşları</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Bağımsız içerik üreticileri ve sanatçılar</li>
                <li className="flex items-start gap-2"><span className="text-accent-main mt-0.5">&#8226;</span>Telif haklarına sahip kurumsal hesaplar</li>
              </ul>
            </div>

            {applicationStatus === "rejected" && (
              <div className="bg-error/10 rounded-xl p-3">
                <p className="text-xs text-error">Önceki başvurunuz reddedildi. Tekrar başvurabilirsiniz.</p>
              </div>
            )}

            <CopyrightApplicationForm onSubmit={() => setApplicationStatus("pending")} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
