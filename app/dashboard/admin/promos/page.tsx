"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Plus, X, Shield, Pencil, Check, Link2, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import { isBlockedPromoCode } from "@/lib/promo-blocklist";

const ITEMS_PER_PAGE = 10;
const MAX_AFFILIATE_PROMOS = 4;
const AFFILIATE_DISCOUNT_OPTIONS = [5, 10, 15, 20];

export default function AdminPromosPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [promos, setPromos] = useState<any[]>([]);
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: 15, maxSignups: 500, expiryHours: 720, isFree: false });
  const [promoCreating, setPromoCreating] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);
  const [visiblePromos, setVisiblePromos] = useState(ITEMS_PER_PAGE);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState("");
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
          if (data.promos && data.promos.length > 0) {
            setSelectedPromoCode(data.promos[0].code || "");
          }
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
          ...(isSponsor ? {} : { maxSignups: promoForm.maxSignups, expiryHours: promoForm.expiryHours }),
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

  const handleRename = async (promoId: string) => {
    const trimmed = renameValue.trim().toLocaleUpperCase('tr-TR').replace(/[^A-ZİŞĞÜÖÇ0-9]/g, '');
    if (trimmed.length < 3 || trimmed.length > 8) {
      toast.error("Promo kodu 3-8 karakter olmalı");
      return;
    }
    if (role === "affiliate" && isBlockedPromoCode(trimmed)) {
      toast.error("Bu kod adı kullanılamaz");
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch('/api/affiliate/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoId, newCode: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Kod değiştirilemedi');
        return;
      }
      setPromos(promos.map(p => p.id === promoId ? { ...p, code: trimmed } : p));
      toast.success(`Kod değiştirildi: ${data.oldCode} → ${data.newCode}`);
      setRenamingId(null);
      setRenameValue("");
    } catch {
      toast.error('Bir hata olustu');
    } finally {
      setRenaming(false);
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
  const canCreateMore = !isAffiliate || (promos.length < MAX_AFFILIATE_PROMOS && mfaEnabled);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">{isAffiliate ? 'Promosyon Kodları' : 'İndirim Linkleri'}</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-60" />
          </div>
        ) : (
          <>
          <div className="bg-zinc-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-pink-500" />
              <h3 className="font-semibold">{isAffiliate ? 'Promosyon Kodları' : 'İndirim Linkleri'}</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              {isAffiliate
                ? `Her indirim oranından 1 adet olmak üzere en fazla ${MAX_AFFILIATE_PROMOS} promo kodu oluşturabilirsiniz. (${promos.length}/${MAX_AFFILIATE_PROMOS})`
                : 'Kayıt linklerinden gelen kullanıcılar otomatik kupon alır.'}
            </p>

            {/* 2FA Gate for Affiliates */}
            {isAffiliate && !mfaEnabled && (
              <div className="bg-white/5 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-pink-500" />
                  <p className="text-sm font-semibold">2FA Zorunlu</p>
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

            {/* Create Promo Form */}
            {canCreateMore && (() => {
              const usedDiscounts = new Set(promos.map((p: any) => p.discount_percent));
              const availableDiscounts = isAffiliate
                ? AFFILIATE_DISCOUNT_OPTIONS.filter(d => !usedDiscounts.has(d))
                : AFFILIATE_DISCOUNT_OPTIONS;
              const hasAvailable = !isAffiliate || availableDiscounts.length > 0;

              // Auto-select first available discount if current is taken
              if (isAffiliate && !availableDiscounts.includes(promoForm.discountPercent) && availableDiscounts.length > 0) {
                setTimeout(() => setPromoForm(prev => ({ ...prev, discountPercent: availableDiscounts[0] })), 0);
              }

              return hasAvailable ? (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Promo Kodu (3-8 karakter)</label>
                    <input
                      type="text"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toLocaleUpperCase('tr-TR').replace(/[^A-ZİŞĞÜÖÇ0-9]/g, '').slice(0, 8) })}
                      placeholder="ENES20"
                      maxLength={8}
                      className="input-modern w-full text-sm font-mono tracking-wider"
                    />
                    {isAffiliate && promoForm.code.trim().length >= 3 && isBlockedPromoCode(promoForm.code.trim()) && (
                      <p className="text-[11px] text-red-400 mt-1">Bu kod adı kullanılamaz. Kendi markanıza özel bir kod oluşturun.</p>
                    )}
                  </div>
                  {isAffiliate ? (
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">İndirim Oranı</label>
                      <div className="grid grid-cols-4 gap-2">
                        {AFFILIATE_DISCOUNT_OPTIONS.map((d) => {
                          const taken = usedDiscounts.has(d);
                          const selected = promoForm.discountPercent === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              disabled={taken}
                              onClick={() => setPromoForm({ ...promoForm, discountPercent: d })}
                              className={`py-2.5 rounded-xl text-sm font-bold transition ${
                                taken
                                  ? 'bg-white/5 text-zinc-600 cursor-not-allowed line-through'
                                  : selected
                                    ? 'bg-pink-500 text-white'
                                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                              }`}
                            >
                              %{d}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">Komisyonunuz: %{35 - promoForm.discountPercent} · Her indirim oranından 1 adet oluşturulabilir.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">İndirim %</label>
                        <input
                          type="number"
                          value={promoForm.isFree ? 100 : promoForm.discountPercent}
                          onChange={(e) => setPromoForm({ ...promoForm, discountPercent: parseInt(e.target.value) || 1 })}
                          min={1}
                          max={100}
                          disabled={promoForm.isFree}
                          className="input-modern w-full text-sm disabled:opacity-50"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={promoForm.isFree}
                          onChange={(e) => setPromoForm({ ...promoForm, isFree: e.target.checked })}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-zinc-400">Bedava (ucretsiz satin alma)</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Max Kayit</label>
                          <input
                            type="number"
                            value={promoForm.maxSignups}
                            onChange={(e) => setPromoForm({ ...promoForm, maxSignups: Math.max(1, parseInt(e.target.value) || 1) })}
                            min={1}
                            max={999999}
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
                            max={87600}
                            className="input-modern w-full text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <button
                    onClick={handleCreatePromo}
                    disabled={promoCreating || promoForm.code.trim().length < 3 || (isAffiliate && isBlockedPromoCode(promoForm.code.trim()))}
                    className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {promoCreating ? "Olusturuluyor..." : "Promo Kodu Olustur"}
                  </button>
                </div>
              ) : null;
            })()}

            {/* Promo Links List */}
            {promos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Aktif Promosyon Kodları</p>
                {promos.slice(0, visiblePromos).map((promo) => (
                  <div key={promo.id} className="p-3 rounded-xl bg-white/5">
                    {renamingId === promo.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value.toLocaleUpperCase('tr-TR').replace(/[^A-ZİŞĞÜÖÇ0-9]/g, '').slice(0, 8))}
                          placeholder="Yeni kod"
                          maxLength={8}
                          className="flex-1 bg-transparent border border-pink-500/50 rounded-lg px-3 py-2 text-sm text-white font-mono tracking-wider focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRename(promo.id); if (e.key === 'Escape') { setRenamingId(null); setRenameValue(""); } }}
                        />
                        <button
                          onClick={() => handleRename(promo.id)}
                          disabled={renaming || renameValue.trim().length < 3}
                          className="px-3 py-2 text-xs bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {renaming ? '...' : 'Kaydet'}
                        </button>
                        <button
                          onClick={() => { setRenamingId(null); setRenameValue(""); }}
                          className="p-2 text-zinc-500 hover:text-white transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-yellow-500 font-mono">{promo.code}</span>
                            <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded-full">
                              {promo.discount_percent === 100 ? 'BEDAVA' : `%${promo.discount_percent} indirim`}
                            </span>
                            {isAffiliate && (
                              <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">
                                %{35 - promo.discount_percent} komisyon
                              </span>
                            )}
                          </div>
                          {!isAffiliate && (
                            <p className="text-xs text-zinc-500 mt-1">
                              {promo.current_signups || 0}/{promo.max_signups || '∞'} kayit
                              {promo.expires_at && ` · ${new Date(promo.expires_at) > new Date() ? `${Math.ceil((new Date(promo.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))}s kaldi` : 'suresi dolmus'}`}
                              {promo.creator_email && ` · ${promo.creator_email}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyPromoLink(promo.code)}
                            className="px-3 py-1.5 text-xs bg-white/10 text-zinc-300 hover:text-white rounded-lg transition"
                          >
                            {copiedPromo === promo.code ? 'Kopyalandi!' : 'Kopyala'}
                          </button>
                          {isAffiliate ? (
                            <button
                              onClick={() => { setRenamingId(promo.id); setRenameValue(promo.code); }}
                              className="p-2 text-zinc-500 hover:text-pink-400 transition"
                              title="Kodu Değiştir"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleDeletePromo(promo.id)} className="p-2 text-zinc-500 hover:text-red-400 transition" title="Sil">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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

          {/* URL Generator — only for affiliates with promo codes */}
          {isAffiliate && promos.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">İndirimli Link Oluştur</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-3">Herhangi bir Forilove URL&apos;sini yapıştırın, promo kodunuz otomatik eklenir.</p>
              {promos.length > 1 && (
                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {promos.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => { setSelectedPromoCode(p.code); setGeneratedUrl(""); setUrlCopied(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition shrink-0 ${
                        selectedPromoCode === p.code ? "bg-pink-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              )}
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
                    if (!trimmed || !selectedPromoCode) return;
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
                      url.searchParams.set('promo', selectedPromoCode);
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
            </div>
          )}
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
