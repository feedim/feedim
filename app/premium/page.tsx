"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, ChevronRight, Mail } from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import { FeedimIcon } from "@/components/FeedimLogo";
import { createClient } from "@/lib/supabase/client";

const VerifiedHero = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Premium">
    <path
      d="M10.4521 1.31159C11.2522 0.334228 12.7469 0.334225 13.5471 1.31159L14.5389 2.52304L16.0036 1.96981C17.1853 1.52349 18.4796 2.2708 18.6839 3.51732L18.9372 5.06239L20.4823 5.31562C21.7288 5.51992 22.4761 6.81431 22.0298 7.99598L21.4765 9.46066L22.688 10.4525C23.6653 11.2527 23.6653 12.7473 22.688 13.5475L21.4765 14.5394L22.0298 16.004C22.4761 17.1857 21.7288 18.4801 20.4823 18.6844L18.9372 18.9376L18.684 20.4827C18.4796 21.7292 17.1853 22.4765 16.0036 22.0302L14.5389 21.477L13.5471 22.6884C12.7469 23.6658 11.2522 23.6658 10.4521 22.6884L9.46022 21.477L7.99553 22.0302C6.81386 22.4765 5.51948 21.7292 5.31518 20.4827L5.06194 18.9376L3.51687 18.6844C2.27035 18.4801 1.52305 17.1857 1.96937 16.004L2.5226 14.5394L1.31115 13.5475C0.333786 12.7473 0.333782 11.2527 1.31115 10.4525L2.5226 9.46066L1.96937 7.99598C1.52304 6.81431 2.27036 5.51992 3.51688 5.31562L5.06194 5.06239L5.31518 3.51732C5.51948 2.2708 6.81387 1.52349 7.99553 1.96981L9.46022 2.52304L10.4521 1.31159Z"
      fill="currentColor"
    />
    <path
      d="M11.2071 16.2071L18.2071 9.20712L16.7929 7.79291L10.5 14.0858L7.20711 10.7929L5.79289 12.2071L9.79289 16.2071C9.98043 16.3947 10.2348 16.5 10.5 16.5C10.7652 16.5 11.0196 16.3947 11.2071 16.2071Z"
      fill="white"
    />
  </svg>
);

const planHero: Record<string, { title: string; subtitle: string }> = {
  basic: { title: "Feedim Basic", subtitle: "Reklamsız deneyim ve artırılmış limitlerle farkını göster." },
  pro: { title: "Feedim Pro", subtitle: "Keşfette one cık, analitik paneli ve daha fazlası." },
  max: { title: "Feedim Max", subtitle: "Tum ozellikler, tam kontrol, sınırsız deneyim." },
  business: { title: "Feedim Business", subtitle: "Markalar ve isletmeler icin tam donanımlı profesyonel paket." },
};

interface Feature {
  t: string;
  d: string;
  basic: boolean;
  pro: boolean;
  max: boolean;
  business: boolean;
}

const allFeatures: Feature[] = [
  { t: "Onaylı Rozet", d: "Profilinde mavi tik rozeti ile guvenilirligini goster", basic: false, pro: true, max: true, business: true },
  { t: "Reklamsız Deneyim", d: "Icerik akısında reklam gormeden kesintisiz deneyim", basic: true, pro: true, max: true, business: true },
  { t: "Daha Fazla Takip", d: "Gunluk 20 yerine 40 kisi takip et (Pro: 100, Max: 200)", basic: true, pro: true, max: true, business: true },
  { t: "Daha Fazla Begeni", d: "Gunluk 50 yerine 100 begeni hakkı (Pro: 300, Max: 1000)", basic: true, pro: true, max: true, business: true },
  { t: "Daha Fazla Yorum", d: "Gunluk 30 yerine 60 yorum hakkı (Pro: 200, Max: 500)", basic: true, pro: true, max: true, business: true },
  { t: "Daha Fazla Kaydetme", d: "Gunluk 30 yerine 60 kaydetme hakkı (Pro: 200, Max: 500)", basic: true, pro: true, max: true, business: true },
  { t: "Daha Fazla Paylasım", d: "Gunluk 20 yerine 40 paylasım hakkı (Pro: 100, Max: 300)", basic: true, pro: true, max: true, business: true },
  { t: "Para Kazanma", d: "Premium okuyucular gonderini okudugunda Jeton kazan, nakde cevir", basic: false, pro: true, max: true, business: true },
  { t: "Kesfette One Cıkma", d: "Gonderilerin kesfet akısında ve ana sayfada daha ust sırada gosterilir", basic: false, pro: true, max: true, business: true },
  { t: "Aramalarda One Cıkma", d: "Onaylı hesabın arama sonuclarında diger kullanıcılardan once listelenir", basic: false, pro: true, max: true, business: true },
  { t: "Yorumlarda One Cıkma", d: "Yorumların onaylı rozet ile vurgulanır ve ust sıralarda gosterilir", basic: false, pro: true, max: true, business: true },
  { t: "Onerilerde One Cıkma", d: "Kullanıcı onerilerinde ve takip et listelerinde daha fazla gosterilirsin", basic: false, pro: true, max: true, business: true },
  { t: "Analitik Paneli", d: "Goruntuleme, etkilesim, okuma suresi ve takipci buyumeni detaylı takip et", basic: false, pro: true, max: true, business: true },
  { t: "Dim Mod", d: "Mavi tonlu ozel koyu tema ile goz yormayan okuma deneyimi", basic: false, pro: true, max: true, business: true },
  { t: "Iki Faktorlu Dogrulama", d: "Hesabını ek guvenlik katmanıyla koru, her giriste e-posta dogrulaması", basic: false, pro: true, max: true, business: true },
  { t: "Isletme Hesabı", d: "Profesyonel hesap turleri arasından isletme hesabına gecis yapabilme", basic: false, pro: false, max: false, business: true },
  { t: "Profil Ziyaretcileri", d: "Profilini kimlerin ziyaret ettigini gor, kitleni yakından tanı", basic: false, pro: false, max: true, business: true },
  { t: "Uzun Yorum", d: "250 karakter yerine 500 karaktere kadar uzun yorumlar yazabilirsin", basic: false, pro: false, max: true, business: true },
  { t: "Uzun Gonderi", d: "5.000 kelime yerine 15.000 kelimeye kadar uzun icerikler paylasabilirsin", basic: false, pro: false, max: true, business: true },
  { t: "Oncelikli Destek", d: "Sorunlarında oncelikli destek ekibiyle daha hızlı cozum al", basic: false, pro: false, max: true, business: true },
  { t: "Hızlı Inceleme", d: "Gonderilerin moderasyon surecinde oncelikli incelenir ve hızla yayına alınır", basic: false, pro: false, max: true, business: true },
];

const plans = [
  {
    id: "basic",
    name: "Basic",
    monthly: 39.99,
    yearly: 399,
    popular: false,
    tier: "basic" as const,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 79.99,
    yearly: 799,
    popular: true,
    tier: "pro" as const,
  },
  {
    id: "max",
    name: "Max",
    monthly: 129,
    yearly: 1290,
    popular: false,
    tier: "max" as const,
  },
  {
    id: "business",
    name: "Business",
    monthly: 249,
    yearly: 2490,
    popular: false,
    tier: "business" as const,
  },
];

const faqs = [
  {
    q: "Premium uyeligi iptal edebilir miyim?",
    a: "Evet, istediginiz zaman iptal edebilirsiniz. Mevcut donem sonuna kadar premium ozelliklerden yararlanmaya devam edersiniz. Kısmi iade yapılmaz.",
  },
  {
    q: "Planlar arası gecis yapabilir miyim?",
    a: "Evet, istediginiz zaman daha ust veya alt bir plana gecis yapabilirsiniz. Fark otomatik hesaplanır ve bir sonraki fatura doneminize yansır.",
  },
  {
    q: "Jeton kazanma nasıl calısır?",
    a: "Pro veya Max uye olduktan sonra icerik uretmeye baslayın. Premium okuyucular gonderinizi okudugunda otomatik olarak Jeton kazanırsınız. Okuyucunun en az 30 saniye harcaması ve icerigin en az %40'ını okuması gerekir.",
  },
  {
    q: "Kazancımı nasıl cekerim?",
    a: "Minimum 100 Jeton biriktirdiginizde banka hesabınıza cekim talebi olusturabilirsiniz. 1 Jeton = 0,10 TL degerindedir.",
  },
  {
    q: "Onaylı rozet (mavi tik) nedir?",
    a: "Onaylı rozet, Premium uyeliginiz aktif oldugu surece profilinizde gorunen mavi tik rozetidir. Diger kullanıcılara guvenilir bir hesap oldugunuzu gosterir. Premium sona erdiginde rozet kaldırılır.",
  },
  {
    q: "Gunluk limitler nasıl calısır?",
    a: "Her kullanıcının takip, begeni, yorum, kaydetme ve paylasım icin gunluk limitleri vardır. Premium planınız yukseldikce bu limitler artar. Limitler her gun gece yarısı sıfırlanır.",
  },
  {
    q: "Uzun gonderi ozelligi nedir?",
    a: "Standart hesaplarda gonderi en fazla 5.000 kelime olabilir. Max aboneligiyle bu limit 15.000 kelimeye cıkar, daha kapsamlı ve detaylı icerikler paylasabilirsiniz.",
  },
  {
    q: "Profil ziyaretcileri ozelligi nedir?",
    a: "Max aboneler profillerini kimlerin ziyaret ettigini gorebilir. Son 30 gunluk ziyaretciler listelenir. Bu ozellik sadece Max planına ozeldir.",
  },
  {
    q: "Dim mod nedir?",
    a: "Dim mod, mavi tonlu ozel bir koyu temadır. Goz yormayan, rahat bir okuma deneyimi sunar. Pro ve Max abonelere ozeldir.",
  },
  {
    q: "Premium suresi dolunca ne olur?",
    a: "Premium sureniz dolugunda bildirim alırsınız. Uyelik yenilenmezse rozet, reklamsız deneyim ve diger Premium ayrıcalıklar sona erer. Hesabınız, gonderileriniz ve Jeton bakiyeniz korunur.",
  },
  {
    q: "Yıllık plan avantajı nedir?",
    a: "Yıllık planlarda aylık plana gore 2 aya kadar tasarruf edersiniz. Odeme tek seferde alınır ve 12 ay boyunca tum premium ozelliklerden yararlanırsınız.",
  },
  {
    q: "Odeme yontemleri nelerdir?",
    a: "Kredi kartı ve banka kartı ile odeme yapabilirsiniz. Odemeler guvenli altyapı uzerinden islenır. Otomatik yenileme aktiftir, istediginiz zaman iptal edebilirsiniz.",
  },
  {
    q: "Analitik panelinde neler gorebilirim?",
    a: "Pro ve Max aboneler goruntuleme sayısı, etkilesim oranı, ortalama okuma suresi, takipci buyumesi ve gonderi performansı gibi detaylı istatistikleri takip edebilir.",
  },
  {
    q: "İki faktörlü doğrulama nedir?",
    a: "İki faktörlü doğrulama, hesabınıza giriş yaparken şifrenize ek olarak e-posta ile gönderilen bir doğrulama kodu gerektirir. Pro ve Max abonelere özel bu özellik, hesabınızı yetkisiz erişimlere karşı korur.",
  },
  {
    q: "Isletme hesabı nedir?",
    a: "Isletme hesabı, markalar ve ticari kuruluslar icin tasarlanmıs profesyonel hesap turudur. Iletisim bilgileri, kategori ve isletme istatistikleri gibi ek ozellikler sunar. Business abonelere ozeldir. Icerik uretici hesabı tum kullanıcılara acıktır.",
  },
];

export default function PremiumPage() {
  const router = useRouter();
  const [userCurrentPlan, setUserCurrentPlan] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        supabase.from("profiles").select("premium_plan").eq("user_id", session.user.id).single().then(({ data }) => {
          setUserCurrentPlan(data?.premium_plan || null);
        });
      }
    });
  }, []);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const currentPlan = plans.find(p => p.id === selectedPlan)!;
  const isYearly = billing === "yearly";
  const currentPrice = isYearly ? currentPlan.yearly : currentPlan.monthly;
  const currentPeriod = isYearly ? "yıl" : "ay";

  const handleSubscribe = () => {
    sessionStorage.setItem("fdm_premium", JSON.stringify({
      plan_id: currentPlan.id,
      plan_name: currentPlan.name,
      price: currentPrice,
      period: currentPeriod,
      billing,
    }));
    router.push("/dashboard/subscription-payment");
  };

  const getFeaturesForPlan = (tier: "basic" | "pro" | "max" | "business") => {
    return allFeatures.filter(f => f[tier]);
  };

  return (
    <div className="min-h-screen text-text-primary">
      {/* Header */}
      <header>
        <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" aria-label="Feedim Ana Sayfa" className="flex items-center gap-3">
            <FeedimIcon className="h-14 w-14" />
            <span className="w-px h-7 bg-border-primary" />
            <span className="text-lg font-semibold">Premium</span>
          </Link>
          <button
            onClick={() => { if (window.history.length > 2) router.back(); else router.push("/"); }}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Geri</span>
          </button>
        </nav>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-8 pb-12 max-w-full sm:max-w-[92%]">
        {/* Hero — changes based on selected plan */}
        <div className="text-center mb-9">
          <VerifiedHero className="h-16 w-16 mx-auto mb-4 text-accent-main" />
          <h2 className="text-[1.5rem] sm:text-[1.8rem] font-extrabold mb-1.5 transition-all">
            {planHero[selectedPlan]?.title || "Feedim Premium"}
          </h2>
          <p className="text-text-muted text-[0.9rem] sm:text-[0.95rem] leading-relaxed transition-all max-w-md mx-auto">
            {planHero[selectedPlan]?.subtitle || "Sana uygun planı sec, hemen basla."}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2.5 rounded-full text-[0.88rem] sm:text-sm font-semibold transition-all ${
              !isYearly ? "bg-accent-main text-white" : "bg-bg-secondary text-text-muted hover:text-text-primary"
            }`}
          >
            Aylık
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2.5 rounded-full text-[0.88rem] sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isYearly ? "bg-accent-main text-white" : "bg-bg-secondary text-text-muted hover:text-text-primary"
            }`}
          >
            Yıllık
            <span className={`text-[0.68rem] font-bold px-1.5 py-0.5 rounded-full ${
              isYearly ? "bg-white/20 text-white" : "bg-accent-main/10 text-accent-main"
            }`}>
              Tasarruf et
            </span>
          </button>
        </div>

        {/* Plan Cards — 3 columns */}
        <div className="premium-plans-grid mb-7">
          {plans.map(plan => {
            const isSelected = selectedPlan === plan.id;
            const features = getFeaturesForPlan(plan.tier);
            const price = isYearly ? plan.yearly : plan.monthly;
            const period = isYearly ? "yıl" : "ay";
            const monthlySaving = Math.round(plan.monthly * 12 - plan.yearly);
            const isExpanded = expandedCards.has(plan.id);
            const PREVIEW_COUNT = 7;
            const showAll = plan.tier === "basic";
            const visibleFeatures = showAll || isExpanded ? features : features.slice(0, PREVIEW_COUNT);
            const hasMore = !showAll && features.length > PREVIEW_COUNT;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`premium-plan-card ${isSelected ? "selected" : ""} ${plan.popular ? "popular" : ""}`}
              >
                {isLoggedIn && userCurrentPlan === plan.id ? (
                  <span className="premium-plan-badge">Mevcut Plan</span>
                ) : plan.popular ? (
                  <span className="premium-plan-badge">Populer</span>
                ) : null}

                <p className="text-[0.92rem] md:text-[0.88rem] font-medium text-text-muted mb-1.5">{plan.name}</p>
                <div className="flex items-baseline gap-0.5 mb-0.5">
                  <span className="text-[2rem] md:text-[1.75rem] font-extrabold tracking-tight leading-none">
                    {price.toLocaleString("tr-TR")}
                  </span>
                  <span className="text-[0.9rem] md:text-[0.82rem] font-medium text-text-muted">&#8378;</span>
                </div>
                <p className="text-[0.8rem] md:text-[0.75rem] text-text-muted mb-1">/{period}</p>
                {isYearly && (
                  <p className="text-[0.78rem] md:text-[0.72rem] font-semibold text-accent-main mb-2">{monthlySaving.toLocaleString("tr-TR")}&#8378; tasarruf</p>
                )}
                {!isYearly && <div className="mb-2" />}

                <div className="w-full h-px bg-border-primary mb-3" />

                <div className="w-full">
                  {visibleFeatures.map((f, i) => (
                    <div key={i}>
                      <div className="flex items-start gap-2.5 md:gap-2 text-left py-[11px] md:py-[8px]">
                        <Check className={`h-[15px] w-[15px] md:h-[14px] md:w-[14px] shrink-0 mt-[2px] md:mt-[2px] ${isSelected ? "text-accent-main" : "text-text-muted"}`} strokeWidth={3} />
                        <div className="min-w-0">
                          <p className={`font-semibold leading-snug ${isExpanded ? "text-[0.92rem] md:text-[0.82rem]" : "text-[0.88rem] md:text-[0.82rem]"}`}>
                            {f.t}
                            {f.t === "Onaylı Rozet" && plan.tier !== "basic" && (
                              <span className="inline-flex items-center ml-1 align-middle">
                                (<VerifiedHero className={`h-[12px] w-[12px] md:h-[12px] md:w-[12px] ${plan.tier === "max" || plan.tier === "business" ? "text-verified-max" : "text-accent-main"}`} />)
                              </span>
                            )}
                          </p>
                          <p className={`text-text-muted leading-snug mt-0.5 md:mt-0 ${isExpanded ? "text-[0.82rem] md:text-[0.72rem]" : "text-[0.78rem] md:text-[0.72rem]"}`}>{f.d}</p>
                        </div>
                      </div>
                      {i < visibleFeatures.length - 1 && (
                        <div className="h-px bg-border-primary/40" />
                      )}
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCards(prev => {
                        const next = new Set(prev);
                        if (next.has(plan.id)) next.delete(plan.id);
                        else next.add(plan.id);
                        return next;
                      });
                    }}
                    className="w-full mt-2 py-2.5 md:py-2 text-[0.88rem] md:text-[0.82rem] font-semibold text-accent-main hover:text-accent-main/80 transition-colors text-center"
                  >
                    {isExpanded ? "Daha az" : `Daha fazla (+${features.length - PREVIEW_COUNT})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Sticky CTA */}
        <div className="sticky bottom-0 z-40 bg-bg-primary bg-solid py-3 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-12 border-t border-border-primary/50">
          {isLoggedIn && userCurrentPlan === selectedPlan ? (
            <button disabled className="premium-cta-btn w-full !opacity-60 !cursor-not-allowed">
              Mevcut Plan
            </button>
          ) : (
            <button onClick={handleSubscribe} className="premium-cta-btn w-full">
              {currentPlan.name} ile Başla — {currentPrice.toLocaleString("tr-TR")}₺/{currentPeriod}
            </button>
          )}
          <p className="text-center text-[0.72rem] text-text-muted mt-1.5">
            İstediğin zaman iptal et. Taahhüt yok.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="mb-12">
          <h3 className="text-[1.1rem] sm:text-[1.1rem] font-bold mb-5">Planları Karsılastır</h3>
          <div className="rounded-2xl overflow-hidden border border-border-primary">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_repeat(4,36px)] sm:grid-cols-[1fr_50px_50px_50px_60px] items-center px-3 sm:px-4 py-3 bg-bg-secondary text-[0.62rem] sm:text-[0.72rem] font-semibold text-text-muted">
              <span className="text-[0.75rem] sm:text-[0.78rem]">Ozellik</span>
              <span className="text-center">Basic</span>
              <span className="text-center">Pro</span>
              <span className="text-center">Max</span>
              <span className="text-center">Biz</span>
            </div>
            {/* Table rows */}
            {allFeatures.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_repeat(4,36px)] sm:grid-cols-[1fr_50px_50px_50px_60px] items-center px-3 sm:px-4 py-3 sm:py-2.5 border-t border-border-primary">
                <span className="text-[0.8rem] sm:text-[0.82rem] font-medium pr-2">{f.t}</span>
                {(["basic", "pro", "max", "business"] as const).map(tier => (
                  <span key={tier} className="flex justify-center">
                    {f[tier]
                      ? <Check className="h-[14px] w-[14px] text-accent-main" strokeWidth={2.5} />
                      : <X className="h-[14px] w-[14px] text-text-muted/30" strokeWidth={2} />
                    }
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ — Help center style */}
        <div className="mb-12">
          <h3 className="text-[1.1rem] sm:text-[1.1rem] font-bold mb-4">Sık Sorulan Sorular</h3>
          <div className="space-y-2.5">
            {faqs.map((faq, i) => {
              const isOpen = expandedFaq === i;
              return (
                <div key={i} className="rounded-[13px] bg-bg-secondary overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="text-[0.92rem] sm:text-[0.95rem] font-semibold flex-1 min-w-0 pr-3">{faq.q}</span>
                    <ChevronRight className={`h-4 w-4 text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pt-1 pb-5 text-[0.88rem] sm:text-sm text-text-muted leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Help CTA */}
        <div className="rounded-2xl bg-accent-main/[0.06] p-6 sm:p-10 text-center">
          <VerifiedHero className="h-10 w-10 mx-auto mb-4 text-accent-main" />
          <h3 className="text-[1.1rem] sm:text-lg font-bold mb-2">Yardıma mı ihtiyacınız var?</h3>
          <p className="text-[0.88rem] sm:text-sm text-text-muted mb-6 max-w-sm mx-auto leading-relaxed">Premium hakkında sorularınız için ekibimize yazabilir veya yardım merkezimizi ziyaret edebilirsiniz.</p>
          <Link href="/help/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-main text-white font-semibold text-[0.88rem] sm:text-sm hover:opacity-90 transition">
            <Mail className="h-4 w-4" /> Bize Ulasın
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
