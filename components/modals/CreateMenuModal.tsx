"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, FileText, Trash2, Film, Clapperboard, Users, ArrowLeft } from "lucide-react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import { emitNavigationStart } from "@/lib/navigationProgress";

interface CreateMenuModalProps {
  open: boolean;
  onClose: () => void;
}

interface Draft {
  id: number;
  title: string;
  slug: string;
  updated_at: string;
  content_type?: string;
}

export default function CreateMenuModal({ open, onClose }: CreateMenuModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [view, setView] = useState<"menu" | "drafts">("menu");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  // Reset view when modal opens — or go straight to drafts if requested
  useEffect(() => {
    if (!open) return;
    const v = sessionStorage.getItem("fdm-create-view");
    if (v === "drafts") {
      sessionStorage.removeItem("fdm-create-view");
      setView("drafts");
    } else {
      setView("menu");
    }
  }, [open]);

  // Load draft count when create menu opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { count } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("status", "draft");
        setDraftCount(count || 0);
      } catch {}
    })();
  }, [open]);

  // Load full drafts when drafts view opens
  useEffect(() => {
    if (view !== "drafts") return;
    setDraftsLoading(true);
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setDraftsLoading(false); return; }
        const { data } = await supabase
          .from("posts")
          .select("id, title, slug, updated_at, content_type")
          .eq("author_id", user.id)
          .eq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(10);
        setDrafts(data || []);
      } catch {
        setDrafts([]);
      } finally {
        setDraftsLoading(false);
      }
    })();
  }, [view]);

  const go = (path: string) => {
    onClose();
    emitNavigationStart();
    router.push(path);
  };

  const handleNewPost = () => {
    if (pathname === "/create") {
      feedimAlert("question", "Mevcut gönderi silinecek. Devam etmek istiyor musunuz?", {
        showYesNo: true,
        onYes: () => {
          onClose();
          window.location.href = "/create";
        },
      });
      return;
    }
    go("/create");
  };

  const deleteDraft = (draftId: number) => {
    feedimAlert("question", "Bu taslağı silmek istediğine emin misin?", {
      showYesNo: true,
      onYes: async () => {
        try {
          await supabase.from("posts").delete().eq("id", draftId).eq("status", "draft");
          setDrafts(prev => prev.filter(d => d.id !== draftId));
          setDraftCount(c => Math.max(0, c - 1));
        } catch {}
      },
    });
  };

  const handleClose = () => {
    onClose();
    setView("menu");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={view === "drafts" ? "Taslaklar" : "Oluştur"}
      size="sm"
      centerOnDesktop
      infoText={view === "drafts" ? "Yayınlanmamış taslak gönderilerinizi buradan düzenleyebilir veya silebilirsiniz." : "Yeni gönderi, video veya moment oluşturabilir, taslak gönderilerinizi yönetebilirsiniz."}
      leftAction={view === "drafts" ? (
        <button onClick={() => setView("menu")} className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary" aria-label="Geri">
          <ArrowLeft className="h-6 w-6" />
        </button>
      ) : undefined}
    >
      {view === "menu" ? (
        <div className="py-2 px-2">
          {/* Yeni gönderi */}
          <button
            onClick={handleNewPost}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition text-left my-[3px]"
          >
            <div className="w-9 h-9 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-[18px] w-[18px] text-accent-main" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Gönderi</p>
              <p className="text-xs text-text-muted mt-0.5">Yeni bir gönderi oluşturun</p>
            </div>
          </button>

          {/* Not */}
          <button
            onClick={() => go("/create/note")}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition text-left my-[3px]"
          >
            <div className="w-9 h-9 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
              <Users className="h-[18px] w-[18px] text-accent-main" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Not</p>
              <p className="text-xs text-text-muted mt-0.5">Kısa metin paylaşın (maks 280 karakter)</p>
            </div>
          </button>

          {/* Video */}
          <button
            onClick={() => go("/create/video")}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition text-left my-[3px]"
          >
            <div className="w-9 h-9 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
              <Film className="h-[18px] w-[18px] text-accent-main" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Video</p>
              <p className="text-xs text-text-muted mt-0.5">Video içeriği yükleyin (maks 10 dk)</p>
            </div>
          </button>

          {/* Moment */}
          <button
            onClick={() => go("/create/moment")}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition text-left my-[3px]"
          >
            <div className="w-9 h-9 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
              <Clapperboard className="h-[18px] w-[18px] text-accent-main" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Moment</p>
              <p className="text-xs text-text-muted mt-0.5">Kısa dikey video (maks 60 sn, 9:16)</p>
            </div>
          </button>

          {/* Taslaklar butonu */}
          <div className="border-t border-border-primary mt-2 pt-2">
            <button
              onClick={() => setView("drafts")}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                <FileText className="h-[18px] w-[18px] text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Taslaklar</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {draftCount > 0 ? `${draftCount} taslak` : "Kayıtlı taslak yok"}
                </p>
              </div>
              <svg className="h-4 w-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-2 px-2">
          {draftsLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loader" style={{ width: 24, height: 24 }} />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-muted">Kayıtlı taslak yok</p>
            </div>
          ) : (
            <>
              <p className="px-3 pb-2 text-[0.72rem] text-text-muted">en fazla 10 adet</p>
              {drafts.map(draft => (
                <div
                  key={draft.id}
                  className="group w-full flex items-center gap-3 px-3 py-3 rounded-[13px] hover:bg-bg-tertiary transition text-left mb-1"
                >
                  <button
                    onClick={() => go(draft.content_type === "moment" ? `/create/moment?edit=${draft.slug}` : draft.content_type === "video" ? `/create/video?edit=${draft.slug}` : draft.content_type === "note" ? `/create/note?edit=${draft.slug}` : `/create?edit=${draft.slug}`)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {draft.content_type === "moment" ? (
                      <Clapperboard className="h-4 w-4 text-text-muted shrink-0" />
                    ) : draft.content_type === "video" ? (
                      <Film className="h-4 w-4 text-text-muted shrink-0" />
                    ) : draft.content_type === "note" ? (
                      <Users className="h-4 w-4 text-text-muted shrink-0" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-text-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{draft.title || "Başlıksız"}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(draft.updated_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" "}{draft.content_type === "moment" ? "Moment" : draft.content_type === "video" ? "Video" : draft.content_type === "note" ? "Not" : "Gönderi"}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-bg-tertiary transition text-text-muted hover:text-error shrink-0"
                    title="Sil"
                    aria-label="Taslağı sil"
                  >
                    <Trash2 className="h-[16px] w-[16px]" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
