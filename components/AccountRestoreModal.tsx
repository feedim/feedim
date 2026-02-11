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

  const GRACE_PERIOD_DAYS = 14;
  const deletionDate = new Date(new Date(scheduledDeletionAt).getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleRestore = async () => {
    setLoading(true);
    try {
      // Clear deletion metadata to reactivate account
      const { error } = await supabase.auth.updateUser({
        data: { deletion_requested_at: null },
      });

      if (error) throw error;

      onRestore();
      router.refresh();
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl p-8 max-w-md w-full border border-white/10 animate-slide-up sm:animate-scale-in">
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
          {deletionDate.toLocaleDateString("tr-TR", {
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
