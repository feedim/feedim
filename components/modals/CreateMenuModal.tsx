"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, FileText, Trash2, Film } from "lucide-react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";

interface CreateMenuModalProps {
  open: boolean;
  onClose: () => void;
}

interface Draft {
  id: number;
  title: string;
  updated_at: string;
  content_type?: string;
}

export default function CreateMenuModal({ open, onClose }: CreateMenuModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data } = await supabase
          .from("posts")
          .select("id, title, updated_at, content_type")
          .eq("author_id", user.id)
          .eq("status", "draft")
          .order("updated_at", { ascending: false })
          .limit(5);
        setDrafts(data || []);
      } catch {
        setDrafts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleNewPost = () => {
    if (pathname === "/dashboard/write") {
      feedimAlert("question", "Mevcut gönderi silinecek. Devam etmek istiyor musunuz?", {
        showYesNo: true,
        onYes: () => {
          onClose();
          window.location.href = "/dashboard/write";
        },
      });
      return;
    }
    go("/dashboard/write");
  };

  const deleteDraft = (draftId: number) => {
    feedimAlert("question", "Bu taslağı silmek istediğine emin misin?", {
      showYesNo: true,
      onYes: async () => {
        try {
          await supabase.from("posts").delete().eq("id", draftId).eq("status", "draft");
          setDrafts(prev => prev.filter(d => d.id !== draftId));
        } catch {}
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Oluştur" size="sm" centerOnDesktop>
      <div className="py-2 px-2">
        {/* Yeni gönderi */}
        <button
          onClick={handleNewPost}
          className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[6px] hover:bg-bg-tertiary transition text-left"
        >
          <div className="w-9 h-9 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
            <Plus className="h-[18px] w-[18px] text-accent-main" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Gönderi</p>
            <p className="text-xs text-text-muted mt-0.5">Yeni bir gönderi oluşturun</p>
          </div>
        </button>

        {/* Video */}
        <button
          onClick={() => go("/dashboard/write/video")}
          className="w-full flex items-center gap-3 px-3 py-3.5 rounded-[6px] hover:bg-bg-tertiary transition text-left"
        >
          <div className="w-9 h-9 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
            <Film className="h-[18px] w-[18px] text-accent-main" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Video</p>
            <p className="text-xs text-text-muted mt-0.5">Video icerigi yukleyin (maks 10 dk)</p>
          </div>
        </button>

        {/* Taslaklar */}
        {drafts.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1.5 flex items-baseline gap-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Taslaklar</p>
              <span className="text-[0.65rem] text-text-muted/60">en fazla 10 adet</span>
            </div>
            {drafts.map(draft => (
              <div
                key={draft.id}
                className="group w-full flex items-center gap-3 px-3 py-3 rounded-[6px] hover:bg-bg-tertiary transition text-left mb-1"
              >
                <button
                  onClick={() => go(draft.content_type === "video" ? `/dashboard/write/video?edit=${draft.id}` : `/dashboard/write?edit=${draft.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {draft.content_type === "video" ? (
                    <Film className="h-4 w-4 text-text-muted shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-text-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{draft.title || "Başlıksız"}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(draft.updated_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{draft.content_type === "video" ? "Video" : "Gönderi"}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-bg-tertiary transition text-text-muted hover:text-error shrink-0"
                  title="Sil"
                >
                  <Trash2 className="h-[16px] w-[16px]" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}
