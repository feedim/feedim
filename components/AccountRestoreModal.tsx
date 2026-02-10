"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AccountRestoreModalProps {
  scheduledDeletionAt: string;
  onRestore: () => void;
}

export default function AccountRestoreModal({
  scheduledDeletionAt,
  onRestore,
}: AccountRestoreModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const daysRemaining = Math.ceil(
    (new Date(scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const handleRestore = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("restore_user_account", {
        user_uuid: user.id,
      });

      if (error) throw error;

      if (data.success) {
        onRestore();
        router.refresh();
      }
    } catch (error) {
      console.error("Error restoring account:", error);
      alert("Hesap geri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl p-8 max-w-md w-full border border-white/10">
        <h2 className="text-2xl font-bold mb-4 text-white">Hesabınız Silinmek Üzere</h2>
        <p className="text-gray-400 mb-6">
          Hesabınız silinme sürecinde. Hesabınız {daysRemaining} gün içinde kalıcı olarak
          silinecek. Hesabınızı yeniden etkinleştirmek ister misiniz?
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRestore}
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? "Geri Yükleniyor..." : "Hesabı Geri Yükle"}
          </button>
          <button onClick={handleLogout} className="w-full btn-secondary">
            Çıkış Yap
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          {new Date(scheduledDeletionAt).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          tarihinde kalıcı olarak silinecek
        </p>
      </div>
    </div>
  );
}
