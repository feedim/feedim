"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnfreezeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUnfreeze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/unfreeze", { method: "POST" });
      if (res.ok) {
        document.cookie = "fdm-status=; Max-Age=0; Path=/;";
        router.replace("/");
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUnfreeze}
      disabled={loading}
      className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full"
      aria-label="Hesabı Etkinleştir"
    >
      {loading ? (
        <span className="loader !w-5 !h-5" style={{ borderColor: "var(--bg-primary)", borderTopColor: "transparent" }} />
      ) : (
        "Hesabı Etkinleştir"
      )}
    </button>
  );
}
