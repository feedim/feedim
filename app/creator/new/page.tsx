"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";

export default function NewŞablonPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coinPrice, setCoinPrice] = useState(100);
  const [htmlContent, setHtmlContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Set panel closed on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && leftPanelOpen) {
        setLeftPanelOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    // Auto-update preview
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

  const checkAccess = async () => {
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

      setUserRole(profile.role);
    } catch (error) {
      console.error(error);
      router.push("/dashboard");
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    const trimmedDesc = description.trim();

    // Client-side validation
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
    if (coinPrice < 0 || coinPrice > 9999) {
      toast.error("Fiyat 0-9999 arasında olmalı");
      return;
    }
    if (!htmlContent || htmlContent.trim() === "") {
      toast.error("HTML içeriği boş olamaz");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const safeName = trimmedName.substring(0, 60);
      const safeSlug = trimmedSlug.replace(/[^a-z0-9-]/g, '').substring(0, 40);
      const safeDescription = trimmedDesc.substring(0, 50);

      const { error } = await supabase.from("templates").insert({
        name: safeName,
        slug: safeSlug,
        description: safeDescription,
        coin_price: Math.max(0, Math.min(9999, coinPrice)),
        html_content: htmlContent,
        created_by: user.id,
        is_public: true,
      });

      if (error) throw error;

      toast.success("Şablon oluşturuldu!");
      router.push("/creator");
    } catch (error: any) {
      toast.error("Kaydetme hatası: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      // Extract scripts before DOMPurify strips them, then re-inject
      const scripts: string[] = [];
      const withoutScripts = htmlContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_: string, content: string) => {
        const trimmed = content.trim();
        if (trimmed) scripts.push(trimmed);
        return '';
      });
      const sanitized = DOMPurify.sanitize(withoutScripts, { WHOLE_DOCUMENT: true, ADD_TAGS: ["style", "link", "meta", "title"], ADD_ATTR: ["target", "data-editable", "data-type", "data-label", "data-css-property", "data-hook", "data-area", "data-area-label"], ALLOW_DATA_ATTR: true });
      const scriptTags = scripts.map(s => `<script>${s}<\/script>`).join('\n');
      previewWindow.document.write(sanitized + scriptTags);
      previewWindow.document.close();
    }
  };

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
          <h1 className="text-lg font-semibold flex-1 ml-3">Yeni Şablon Oluştur</h1>
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
              {saving ? "Oluşturuluyor..." : "Oluştur"}
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
          </div>

          {/* HTML Editor */}
          <div className="flex-1 flex flex-col p-6 min-h-0">
            <label className="block text-sm text-zinc-400 mb-2">HTML Kodu</label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="flex-1 min-h-[600px] bg-zinc-900 border border-white/10 rounded-lg p-4 font-mono text-sm text-white resize-none focus:outline-none focus:border-pink-500/50"
              spellCheck={false}
              placeholder="HTML kodunuzu buraya yazın..."
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
