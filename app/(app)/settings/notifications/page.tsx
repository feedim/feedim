"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";

export default function NotificationSettingsPage() {
  useSearchParams();
  const t = useTranslations("settings");
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
    { type: "like", labelKey: "notifLike" as const },
    { type: "comment", labelKey: "notifComment" as const },
    { type: "reply", labelKey: "notifReply" as const },
    { type: "mention", labelKey: "notifMention" as const },
    { type: "follow", labelKey: "notifFollow" as const },
    { type: "follow_request", labelKey: "notifFollowRequest" as const },
    { type: "milestone", labelKey: "notifMilestone" as const },
    { type: "coin_earned", labelKey: "notifCoinEarned" as const },
    { type: "gift_received", labelKey: "notifGift" as const },
    { type: "system", labelKey: "notifSystem" as const },
  ];

  return (
    <AppLayout headerTitle={t("notificationSettings")} hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Pause toggle */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <span className="text-sm font-medium">{t("pauseNotifications24h")}</span>
                <p className="text-xs text-text-muted mt-0.5">
                  {notifPaused && pausedUntil
                    ? t("pausedUntilTime", { time: new Date(pausedUntil).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) })
                    : t("pauseAllDesc")}
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
            {notifTypes.map(({ type, labelKey }) => (
              <div key={type} className="flex items-center justify-between px-4 py-3.5">
                <span className="text-sm">{t(labelKey)}</span>
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
