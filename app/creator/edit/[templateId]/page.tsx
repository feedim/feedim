"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";

export default function EditŞablonPage({ params }: { params: Promise<{ templateId: string }> }) {
  const resolvedParams = use(params);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coinPrice, setCoinPrice] = useState(100);
  const [discountPrice, setDiscountPrice] = useState<number | null>(null);
  const [discountLabel, setDiscountLabel] = useState("");
  const [discountDuration, setDiscountDuration] = useState<number | null>(null);
  const [discountExpiresAt, setDiscountExpiresAt] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadŞablon();
  }, []);

  useEffect(() => {
    setPreviewHtml(htmlContent);
  }, [htmlContent]);

  useEffect(() => {
    if (name) {
      const autoSlug = name
        .toLowerCase()
        .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g')
        .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 40);
      setSlug(autoSlug);
    }
  }, [name]);

  const loadŞablon = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!profile || (profile.role !== "creator" && profile.role !== "admin")) {
        toast.error("Bu sayfaya erişim yetkiniz yok");
        router.push("/dashboard");
        return;
      }

      const { data: template, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", resolvedParams.templateId)
        .eq("created_by", user.id)
        .single();

      if (error || !template) {
        toast.error("Şablon bulunamadı");
        router.push("/creator");
        return;
      }

      setName(template.name || "");
      setSlug(template.slug || "");
      setDescription(template.description || "");
      setCoinPrice(template.coin_price || 100);
      setDiscountPrice(template.discount_price || null);
      setDiscountLabel(template.discount_label || "");
      setDiscountExpiresAt(template.discount_expires_at || null);
      setHtmlContent(template.html_content || "");
      setPreviewHtml(template.html_content || "");
    } catch (error) {
      console.error(error);
      router.push("/creator");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const trimmedDesc = description.trim();

    // Client-side validation — same rules as editor
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("Şablon adı en az 2 karakter olmalı");
      return;
    }
    if (trimmedName.length > 60) {
      toast.error("Şablon adı en fazla 60 karakter olabilir");
      return;
    }
    if (trimmedSlug.length < 5) {
      toast.error("Slug en az 5 karakter olmalı");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
      toast.error("Slug sadece küçük harf, rakam ve tire içermelidir");
      return;
    }
    if (trimmedDesc.length > 50) {
      toast.error("Açıklama en fazla 50 karakter olabilir");
      return;
    }
    if (coinPrice < 1 || coinPrice > 9999) {
      toast.error("Fiyat 1-9999 arasında olmalı");
      return;
    }
    if (discountPrice !== null && (discountPrice < 1 || discountPrice >= coinPrice)) {
      toast.error("İndirimli fiyat 1 ile orijinal fiyat arasında olmalı");
      return;
    }
    if (!htmlContent || htmlContent.trim() === "") {
      toast.error("HTML içeriği boş olamaz");
      return;
    }

    setSaving(true);
    try {
      const safeName = trimmedName.substring(0, 60);
      const safeSlug = trimmedSlug.replace(/[^a-z0-9-]/g, '').substring(0, 40);
      const safeDescription = trimmedDesc.substring(0, 50);
      const safeDiscountLabel = discountLabel.trim().substring(0, 20);
      const safeCoinPrice = Math.max(1, Math.min(9999, coinPrice));
      const safeDiscountPrice = discountPrice ? Math.max(1, Math.min(safeCoinPrice - 1, discountPrice)) : null;

      // Calculate discount_expires_at from duration if setting new discount
      let expiresAt = discountExpiresAt;
      if (safeDiscountPrice && discountDuration) {
        const expires = new Date();
        expires.setHours(expires.getHours() + discountDuration);
        expiresAt = expires.toISOString();
      }

      const { error } = await supabase
        .from("templates")
        .update({
          name: safeName,
          slug: safeSlug,
          description: safeDescription,
          coin_price: safeCoinPrice,
          discount_price: safeDiscountPrice,
          discount_label: safeDiscountPrice ? (safeDiscountLabel || null) : null,
          discount_expires_at: safeDiscountPrice ? expiresAt : null,
          html_content: htmlContent,
        })
        .eq("id", resolvedParams.templateId);

      if (error) throw error;

      toast.success("Şablon güncellendi!");
    } catch (error: any) {
      toast.error("Güncelleme hatası: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      const sanitized = DOMPurify.sanitize(htmlContent, { WHOLE_DOCUMENT: true, ADD_TAGS: ["style", "link", "meta", "title"], ADD_ATTR: ["target", "data-editable", "data-type", "data-hook", "data-locked"] });
      previewWindow.document.write(sanitized);
      previewWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white" aria-label="Yükleniyor">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px] border-b border-white/10">
        <nav className="w-full px-6 flex items-center justify-between min-h-[73px]">
          <div className="flex items-center gap-3">
            <button onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push('/creator'); } }} className="flex items-center gap-2 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Geri</span>
            </button>
            <div className="h-6 w-px bg-white/10"></div>
            <button
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              className="p-2 bg-[#1a1d23] hover:bg-[#22262e] rounded-lg border border-white/10 transition-all"
              aria-label={leftPanelOpen ? "Paneli Kapat" : "Paneli Aç"}
            >
              <Menu className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </button>
          </div>
          <h1 className="text-lg font-semibold flex-1 ml-3">Şablon Düzenle</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreview}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Önizle
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-4 py-2 text-sm"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Settings & Editor */}
        <div
          className={`border-r border-white/10 flex flex-col transition-all duration-300 ${
            leftPanelOpen ? 'w-[400px]' : 'w-0 overflow-hidden'
          }`}
        >
          {/* Settings */}
          <div className="p-6 border-b border-white/10 space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Sablon Adi</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-modern w-full"
                placeholder="Orn: Romantik Yildonumu"
                maxLength={60}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Slug (URL)</label>
              <div className="flex items-center gap-0 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                <span className="text-xs text-zinc-500 pl-3 shrink-0">forilove.com/p/</span>
                <input
                  type="text"
                  value={slug}
                  readOnly
                  placeholder="otomatik-oluşturulur"
                  className="flex-1 bg-transparent text-sm text-white/50 outline-none py-3 pr-3 cursor-not-allowed"
                  tabIndex={-1}
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">Şablon adından otomatik oluşturulur</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Açıklama</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 50))}
                className="input-modern w-full"
                placeholder="Kisaca sablonu tanitin"
                maxLength={50}
              />
              <p className="text-[11px] text-zinc-500 mt-1 text-right">{description.length}/50</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Fiyat (FL)</label>
              <input
                type="number"
                value={coinPrice}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setCoinPrice(Math.min(9999, Math.max(0, val)));
                }}
                className="input-modern w-full"
                min="0"
                max="9999"
              />
            </div>

            {/* Discount Section */}
            <div className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-pink-400">İndirim</label>
                {discountPrice ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountPrice(null);
                      setDiscountLabel("");
                      setDiscountDuration(null);
                      setDiscountExpiresAt(null);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    İndirimi Kaldır
                  </button>
                ) : null}
              </div>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">İndirimli Fiyat (FL)</label>
                <input
                  type="number"
                  value={discountPrice ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Math.min(coinPrice - 1, Math.max(1, parseInt(e.target.value) || 0));
                    setDiscountPrice(val);
                  }}
                  placeholder="Örn: 99"
                  className="input-modern w-full"
                  min="1"
                  max={coinPrice - 1}
                />
              </div>

              {discountPrice !== null && (
                <>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">İndirim Nedeni</label>
                    <input
                      type="text"
                      value={discountLabel}
                      onChange={(e) => setDiscountLabel(e.target.value.slice(0, 20))}
                      placeholder="Örn: Sınırlı Süre"
                      className="input-modern w-full"
                      maxLength={20}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">İndirim Süresi</label>
                    <select
                      value={discountDuration ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseInt(e.target.value);
                        setDiscountDuration(val);
                        if (!val) setDiscountExpiresAt(null);
                      }}
                      className="input-modern w-full"
                    >
                      <option value="">Süresiz</option>
                      <option value="6">6 Saat</option>
                      <option value="12">12 Saat</option>
                      <option value="24">24 Saat</option>
                      <option value="48">48 Saat</option>
                      <option value="72">72 Saat (3 Gün)</option>
                      <option value="168">1 Hafta</option>
                      <option value="720">1 Ay</option>
                    </select>
                  </div>

                  {discountExpiresAt && (
                    <p className="text-xs text-yellow-500/80">
                      Mevcut bitiş: {new Date(discountExpiresAt).toLocaleString('tr-TR')}
                    </p>
                  )}

                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-2">
                    <p className="text-xs text-pink-300">
                      <span className="line-through text-zinc-500">{coinPrice} FL</span>
                      {" → "}
                      <span className="font-bold text-yellow-500">{discountPrice} FL</span>
                      {discountLabel && <span className="ml-1 text-pink-400">({discountLabel})</span>}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* HTML Editor */}
          <div className="flex-1 flex flex-col p-6 min-h-0">
            <label className="block text-sm text-zinc-400 mb-2">HTML Kodu</label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="flex-1 min-h-[600px] bg-zinc-900 border border-white/10 rounded-lg p-4 font-mono text-sm text-white resize-none focus:outline-none focus:border-pink-500/50"
              spellCheck={false}
            />
          </div>

        </div>

        {/* Right: Live Preview */}
        <div className="flex-1 bg-white transition-all duration-300">
          <div className="h-full overflow-y-auto">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
