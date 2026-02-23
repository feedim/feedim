"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import { SettingsItemSkeleton } from "@/components/Skeletons";
import LoadingShell from "@/components/LoadingShell";

export default function NotificationSettingsPage() {
  useSearchParams();
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({});
  const [notifPaused, setNotifPaused] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifSettings();
  }, []);

  // Auto-expire pause when time is up
  useEffect(() => {
    if (!pausedUntil || !notifPaused) return;
    const remaining = new Date(pausedUntil).getTime() - Date.now();
    if (remaining <= 0) {
      setNotifPaused(false);
      setPausedUntil(null);
      return;
    }
    const timer = setTimeout(() => {
      setNotifPaused(false);
      setPausedUntil(null);
    }, remaining);
    return () => clearTimeout(timer);
  }, [pausedUntil, notifPaused]);

  const loadNotifSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/settings");
      const data = await res.json();
      setNotifSettings(data.settings || {});
      setNotifPaused(data.isPaused || false);
      setPausedUntil(data.pausedUntil || null);
    } catch {} finally {
      setLoading(false);
    }
  };

  const toggleNotifType = async (type: string) => {
    const newValue = !notifSettings[type];
    const updated = { ...notifSettings, [type]: newValue };
    setNotifSettings(updated);
    try {
      await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updated }),
      });
    } catch {
      setNotifSettings({ ...notifSettings, [type]: !newValue });
    }
  };

  const toggleNotifPause = async () => {
    const newPaused = !notifPaused;
    setNotifPaused(newPaused);
    const newPausedUntil = newPaused ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    setPausedUntil(newPausedUntil);
    try {
      await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pause: newPaused }),
      });
      // silent
    } catch {
      setNotifPaused(!newPaused);
      setPausedUntil(newPaused ? null : newPausedUntil);
    }
  };

  const notifTypes = [
    { type: "like", label: "Beğeni" },
    { type: "comment", label: "Yorum" },
    { type: "reply", label: "Yanıt" },
    { type: "mention", label: "Bahsetme" },
    { type: "follow", label: "Takip" },
    { type: "follow_request", label: "Takip İsteği" },
    { type: "milestone", label: "Başarı" },
    { type: "coin_earned", label: "Jeton Kazanımı" },
    { type: "gift_received", label: "Hediye" },
    { type: "system", label: "Sistem" },
  ];

  return (
    <AppLayout headerTitle="Bildirim Ayarları" hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <LoadingShell><SettingsItemSkeleton /></LoadingShell>
        ) : (
          <>
            {/* Pause toggle */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <span className="text-sm font-medium">24 saat duraklatma</span>
                <p className="text-xs text-text-muted mt-0.5">
                  {notifPaused && pausedUntil
                    ? `Duraklatıldı — ${new Date(pausedUntil).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} tarihine kadar`
                    : "Tüm bildirimleri geçici olarak kapat"}
                </p>
              </div>
              <button
                onClick={toggleNotifPause}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${notifPaused ? "bg-accent-main" : "bg-bg-tertiary"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifPaused ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="h-px bg-border-primary mx-4 my-1" />

            {/* Notification type toggles */}
            {notifTypes.map(({ type, label }) => (
              <div key={type} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm">{label}</span>
                <button
                  onClick={() => toggleNotifType(type)}
                  className={`relative rounded-full transition-colors duration-200 shrink-0 ${notifSettings[type] !== false ? "bg-accent-main" : "bg-bg-tertiary"}`}
                  style={{ width: 40, height: 22 }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${notifSettings[type] !== false ? "translate-x-[18px]" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </AppLayout>
  );
}
