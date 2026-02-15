"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, User, Wallet, Send, Globe, HelpCircle, Shield, Link2, Copy, Check, Info, UserPlus, Users, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [sponsorAnalytics, setSponsorAnalytics] = useState<any>(null);
  const [sponsorBalance, setSponsorBalance] = useState<any>(null);
  const [sponsorUsers, setSponsorUsers] = useState<any[]>([]);
  const [sponsorPeriod, setSponsorPeriod] = useState<"today" | "yesterday" | "last7d" | "last14d" | "thisMonth">("last7d");
  const [promoCode, setPromoCode] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [refLinkCopied, setRefLinkCopied] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);
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

      if (profile?.role !== "affiliate") {
        router.push("/dashboard/profile");
        return;
      }

      const [res, refRes, payoutRes] = await Promise.all([
        fetch("/api/affiliate/promos"),
        fetch("/api/affiliate/referral"),
        fetch("/api/affiliate/payouts"),
      ]);

      if (res.ok) {
        const data = await res.json();
        setSponsorAnalytics(data.analytics || null);
        setSponsorBalance(data.balance || null);
        setSponsorUsers(data.recentUsers || []);
        if (data.promos && data.promos.length > 0) {
          setPromoCode(data.promos[0].code || "");
        }
      }

      if (refRes.ok) {
        const refData = await refRes.json();
        setReferralData(refData);
      }

      if (payoutRes.ok) {
        const payoutData = await payoutRes.json();
        setPayouts(payoutData.payouts || []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

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

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-60" />
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-40" />
          </div>
        ) : (
          <>
            {/* Analytics */}
            {sponsorAnalytics && (
              <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-pink-500" />
                    <h3 className="font-semibold">Satış Ortağı</h3>
                  </div>
                  <span className="text-xs bg-pink-500/20 text-pink-400 px-2.5 py-1 rounded-full font-medium">%{sponsorAnalytics.commissionRate} komisyon</span>
                </div>

                {/* Bakiye Kartları */}
                {sponsorBalance && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/20 rounded-xl p-3">
                      <div>
                        <p className="text-[10px] text-pink-300">Çekilebilir Bakiye</p>
                        <p className="text-2xl font-bold text-pink-500">{sponsorBalance.available.toLocaleString('tr-TR')} <span className="text-xs text-zinc-400">TRY</span></p>
                      </div>
                      <button
                        onClick={() => router.push('/dashboard/affiliate/payment')}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Çek
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-left">
                        <p className="text-[10px] text-zinc-400 mb-0.5">Toplam Kazanç</p>
                        <p className="text-sm font-bold text-pink-500">{sponsorBalance.totalEarnings.toLocaleString('tr-TR')}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-left">
                        <p className="text-[10px] text-zinc-400 mb-0.5">Ödenen</p>
                        <p className="text-sm font-bold text-pink-400">{sponsorBalance.totalPaidOut.toLocaleString('tr-TR')}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-left">
                        <p className="text-[10px] text-zinc-400 mb-0.5">Bekleyen</p>
                        <p className="text-sm font-bold text-pink-300">{sponsorBalance.totalPending.toLocaleString('tr-TR')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dönem Seçici */}
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                  {([
                    { key: "today" as const, label: "Bugün" },
                    { key: "yesterday" as const, label: "Dün" },
                    { key: "last7d" as const, label: "7 Gün" },
                    { key: "last14d" as const, label: "14 Gün" },
                    { key: "thisMonth" as const, label: "Bu Ay" },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSponsorPeriod(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                        sponsorPeriod === key ? "bg-pink-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Dönem Verileri */}
                {sponsorAnalytics.periods && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Kayıt</p>
                      <p className="text-xl font-bold">{sponsorAnalytics.periods[sponsorPeriod]?.signups || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Satış</p>
                      <p className="text-xl font-bold">{sponsorAnalytics.periods[sponsorPeriod]?.purchases || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Kazanç</p>
                      <p className="text-xl font-bold text-pink-500">{(sponsorAnalytics.periods[sponsorPeriod]?.earnings || 0).toLocaleString('tr-TR')} <span className="text-[10px] text-zinc-500">TRY</span></p>
                    </div>
                  </div>
                )}

                {/* Toplam Özet */}
                <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>Toplam: {sponsorAnalytics.totalSignups} kayıt · {sponsorAnalytics.totalPurchases} satış · Ödenen: {sponsorBalance?.totalPaidOut?.toLocaleString('tr-TR') || 0} TRY</span>
                </div>
              </div>
            )}

            {/* Son Kullanıcılar */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">Sizden gelen son 10 kullanıcı</h3>
              </div>
              <p className="text-[10px] text-zinc-500 mb-3">Ödemelerin karşılaştırılması adına şeffaflık için eklenmiştir.</p>
              {sponsorUsers.length > 0 ? (
                <div className="space-y-3">
                  {sponsorUsers.map((u: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-zinc-300 shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-xs text-zinc-500">{new Date(u.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${u.hasPurchased ? 'bg-pink-500/20 text-pink-400' : 'bg-white/10 text-zinc-400'}`}>
                        {u.hasPurchased ? 'Satın Aldı' : 'Kayıt'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Henüz linkinizden kayıt olan kullanıcı yok.</p>
              )}
            </div>

            {/* URL Generator */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">İndirimli Link Oluştur</h3>
              </div>
              {promoCode ? (
                <>
                  <p className="text-xs text-zinc-500 mb-3">Herhangi bir Forilove URL'sini yapıştırın, promo kodunuz otomatik eklenir.</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => { setUrlInput(e.target.value); setGeneratedUrl(""); setUrlCopied(false); }}
                      placeholder="https://forilove.com/editor/..."
                      className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition"
                    />
                    <button
                      onClick={() => {
                        const trimmed = urlInput.trim();
                        if (!trimmed) return;
                        try {
                          let url: URL;
                          if (trimmed.startsWith('http')) {
                            url = new URL(trimmed);
                          } else if (trimmed.startsWith('forilove.com') || trimmed.startsWith('www.forilove.com')) {
                            url = new URL('https://' + trimmed);
                          } else {
                            url = new URL('https://forilove.com' + (trimmed.startsWith('/') ? '' : '/') + trimmed);
                          }
                          if (!url.hostname.includes('forilove.com') && !url.hostname.includes('localhost')) {
                            setGeneratedUrl(""); return;
                          }
                          url.searchParams.set('promo', promoCode);
                          setGeneratedUrl(url.toString());
                          setUrlCopied(false);
                        } catch {
                          setGeneratedUrl("");
                        }
                      }}
                      className="btn-primary px-4 py-2.5 text-xs font-bold shrink-0"
                    >
                      Üret
                    </button>
                  </div>
                  {generatedUrl && (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-sm text-pink-500 flex-1 break-all font-mono">{generatedUrl}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedUrl);
                          setUrlCopied(true);
                          setTimeout(() => setUrlCopied(false), 2000);
                        }}
                        className="shrink-0 p-2 rounded-lg hover:bg-white/10 transition"
                      >
                        {urlCopied ? <Check className="h-4 w-4 text-pink-500" /> : <Copy className="h-4 w-4 text-zinc-400" />}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-zinc-400 mb-3">Henüz bir promo kodunuz yok. Link oluşturmak için önce bir promo kodu oluşturun.</p>
                  <Link href="/dashboard/admin/promos" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold">
                    <Globe className="h-3.5 w-3.5" />
                    Promo Kodu Oluştur
                  </Link>
                </div>
              )}
            </div>

            {/* Affiliate Davet (Referral) */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">Affiliate Davet Et</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                Referans linkinizi paylaşarak diğer içerik üreticilerini davet edin. Davet ettiğiniz affiliate her ödeme aldığında, ödeme tutarının %5&apos;i kadar ek kazanç elde edersiniz.
              </p>

              {referralData?.referralLink ? (
                <>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
                    <p className="text-sm text-pink-500 flex-1 break-all font-mono">{referralData.referralLink}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.referralLink);
                        setRefLinkCopied(true);
                        setTimeout(() => setRefLinkCopied(false), 2000);
                      }}
                      className="shrink-0 p-2 rounded-lg hover:bg-white/10 transition"
                    >
                      {refLinkCopied ? <Check className="h-4 w-4 text-pink-500" /> : <Copy className="h-4 w-4 text-zinc-400" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 mb-4">Referans kodunuz: <span className="text-pink-500 font-mono">{referralData.referralCode}</span></p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Davet Edilen</p>
                      <p className="text-lg font-bold text-pink-500">{referralData.referredCount || 0}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Referans Kazancı</p>
                      <p className="text-lg font-bold text-pink-500">{(referralData.totalReferralEarnings || 0).toLocaleString('tr-TR')} <span className="text-[10px] text-zinc-500">TRY</span></p>
                    </div>
                  </div>

                  {/* Referred affiliates list */}
                  {referralData.referredAffiliates && referralData.referredAffiliates.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-pink-500" />
                        <p className="text-xs text-zinc-400 font-medium">Davet Ettikleriniz</p>
                      </div>
                      <div className="space-y-2">
                        {referralData.referredAffiliates.map((a: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-zinc-300">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{a.name}</p>
                                <p className="text-[10px] text-zinc-500">{new Date(a.joinedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-pink-400">{a.totalEarnings > 0 ? `+${a.totalEarnings.toLocaleString('tr-TR')} TRY` : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-zinc-400">Referans linki oluşturmak için önce bir promo kodu oluşturun. Promo kodunuz aynı zamanda referans kodunuz olarak kullanılır.</p>
                </div>
              )}
            </div>

            {/* İşlem Geçmişi */}
            <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">İşlem Geçmişi</h3>
              </div>
              {(() => {
                // Build combined transaction list
                const transactions: { type: string; amount: number; date: string; detail: string }[] = [];

                // Add payouts
                for (const p of payouts) {
                  if (p.status === 'approved') {
                    transactions.push({
                      type: 'payout',
                      amount: -Number(p.amount),
                      date: p.processed_at || p.requested_at,
                      detail: 'Ödeme çekimi',
                    });
                  }
                }

                // Add referral earnings
                if (referralData?.referredAffiliates) {
                  for (const a of referralData.referredAffiliates) {
                    if (a.totalEarnings > 0) {
                      transactions.push({
                        type: 'referral',
                        amount: a.totalEarnings,
                        date: a.joinedAt,
                        detail: `Referans kazancı (${a.name})`,
                      });
                    }
                  }
                }

                // Sort by date descending
                transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (transactions.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-sm text-zinc-500">Henüz işlem geçmişi yok.</p>
                      <p className="text-xs text-zinc-600 mt-1">Satış komisyonları ve referans kazançları burada görünecektir.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {transactions.slice(0, 15).map((tx, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            tx.type === 'payout' ? 'bg-red-500/10' : tx.type === 'referral' ? 'bg-purple-500/10' : 'bg-pink-500/10'
                          }`}>
                            {tx.type === 'payout' ? (
                              <Send className="h-3.5 w-3.5 text-red-400" />
                            ) : tx.type === 'referral' ? (
                              <UserPlus className="h-3.5 w-3.5 text-purple-400" />
                            ) : (
                              <Wallet className="h-3.5 w-3.5 text-pink-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{tx.detail}</p>
                            <p className="text-[10px] text-zinc-500">{new Date(tx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? 'text-pink-500' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('tr-TR')} TRY
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Promo Kullanım Notu */}
            <div className="rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
                <div>
                  {promoCode ? (
                    <>
                      <h4 className="text-sm font-semibold text-pink-500 mb-2">Promo Kodunuz: {promoCode}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                        Herhangi bir Forilove URL&apos;sinin sonuna <span className="text-pink-500 font-mono">?promo={promoCode}</span> ekleyerek indirimli link paylaşabilirsiniz. Bu linkten giren kullanıcılar kayıt olana kadar takip edilir.
                      </p>
                      <div className="space-y-1.5 text-xs text-zinc-500 font-mono">
                        <p>forilove.com<span className="text-pink-500">?promo={promoCode}</span></p>
                        <p>forilove.com/templates<span className="text-pink-500">?promo={promoCode}</span></p>
                        <p>forilove.com/editor/...<span className="text-pink-500">?promo={promoCode}</span></p>
                        <p>forilove.com/register<span className="text-pink-500">?promo={promoCode}</span></p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-pink-500 mb-2">Nasıl Çalışır?</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                        Promo kodunuzu oluşturduktan sonra herhangi bir Forilove URL&apos;sinin sonuna <span className="text-pink-500 font-mono">?promo=KODUNUZ</span> ekleyerek indirimli link paylaşabilirsiniz. Bu linkten giren kullanıcılar kayıt olana kadar takip edilir.
                      </p>
                      <div className="space-y-1.5 text-xs text-zinc-500 font-mono">
                        <p>forilove.com<span className="text-pink-500">?promo=KODUNUZ</span></p>
                        <p>forilove.com/templates<span className="text-pink-500">?promo=KODUNUZ</span></p>
                        <p>forilove.com/register<span className="text-pink-500">?promo=KODUNUZ</span></p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Hızlı Linkler */}
            <div className="space-y-3">
              <Link href="/dashboard/affiliate/payment" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-pink-500" />
                    <div>
                      <h3 className="font-semibold">Ödeme Bilgileri</h3>
                      <p className="text-xs text-zinc-500">IBAN ve hesap bilgilerinizi giriniz</p>
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-zinc-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/dashboard/admin/promos" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-pink-500" />
                    <div>
                      <h3 className="font-semibold">Affiliate Link</h3>
                      <p className="text-xs text-zinc-500">İndirim linkinizi yönetin</p>
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-zinc-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/dashboard/security" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-pink-500" />
                    <div>
                      <h3 className="font-semibold">Güvenlik</h3>
                      <p className="text-xs text-zinc-500">2FA ve e-posta doğrulama</p>
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-zinc-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
              <Link href="/affiliate" className="block bg-zinc-900 rounded-2xl p-5 hover:bg-zinc-800 transition group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-pink-500" />
                    <div>
                      <h3 className="font-semibold">Satış Ortağı</h3>
                      <p className="text-xs text-zinc-500">Aklınızda bir soru mu var?</p>
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-zinc-400 rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
