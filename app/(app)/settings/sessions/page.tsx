"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { Smartphone, Monitor, Shield, ShieldCheck, ShieldOff, LogOut } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import { SettingsItemSkeleton } from "@/components/Skeletons";
import LoadingShell from "@/components/LoadingShell";
import { getDeviceHash } from "@/lib/deviceHash";
import { formatRelativeDate } from "@/lib/utils";

interface Session {
  id: number;
  device_hash: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  is_trusted: boolean;
  created_at: string;
  last_active_at: string | null;
}

export default function SessionsPage() {
  useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceHash, setCurrentDeviceHash] = useState<string | null>(null);

  useEffect(() => {
    try { setCurrentDeviceHash(getDeviceHash()); } catch {}
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const toggleTrust = async (sessionId: number, currentTrust: boolean) => {
    const newTrust = !currentTrust;
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_trusted: newTrust } : s));
    try {
      const res = await fetch("/api/account/sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, is_trusted: newTrust }),
      });
      if (!res.ok) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_trusted: currentTrust } : s));
        feedimAlert("error", "Güven durumu güncellenemedi, lütfen daha sonra tekrar deneyin");
      } else {
        // silent
      }
    } catch {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_trusted: currentTrust } : s));
    }
  };

  const endSession = async (sessionId: number) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      feedimAlert("question", "Bu cihazdan çıkış yapmak istiyor musunuz?", {
        showYesNo: true,
        onYes: () => resolve(true),
        onNo: () => resolve(false),
      });
    });
    if (!confirmed) return;

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    try {
      await fetch(`/api/account/sessions?id=${sessionId}`, { method: "DELETE" });
      feedimAlert("success", "Oturum sonlandırıldı");
    } catch {
      loadSessions();
    }
  };

  const endAllSessions = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      feedimAlert("question", "Tüm diğer oturumları sonlandırmak istiyor musunuz? Bu cihazdaki oturumunuz etkilenmez.", {
        showYesNo: true,
        onYes: () => resolve(true),
        onNo: () => resolve(false),
      });
    });
    if (!confirmed) return;

    try {
      await fetch("/api/account/sessions?all=true", { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.device_hash === currentDeviceHash));
      feedimAlert("success", "Tüm oturumlar sonlandırıldı");
    } catch {
      feedimAlert("error", "Bir hata oluştu");
    }
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { device: "Bilinmeyen Cihaz", browser: "", os: "", isMobile: false };
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    let browser = "Tarayıcı";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    let os = "";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    return { device: isMobile ? "Mobil" : "Masaüstü", browser, os, isMobile };
  };

  const activeSessions = sessions.filter(s => s.is_active);
  const thisDevice = activeSessions.find(s => s.device_hash === currentDeviceHash);
  const otherDevices = activeSessions.filter(s => s.device_hash !== currentDeviceHash);

  return (
    <AppLayout headerTitle="Aktif Oturumlar" hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <LoadingShell><SettingsItemSkeleton /></LoadingShell>
        ) : activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Smartphone className="h-10 w-10 text-text-muted/40 mb-3" />
            <p className="text-sm text-text-muted">Aktif oturum yok</p>
          </div>
        ) : (
          <div className="px-4 space-y-5">
            {/* Info text */}
            <p className="text-xs text-text-muted">
              Hesabınıza giriş yapılan cihazları burada görebilirsiniz. Güvenilir cihazlar ek doğrulama gerektirmez.
            </p>

            {/* This device */}
            {thisDevice && (
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Bu cihaz</h3>
                <SessionCard
                  session={thisDevice}
                  isCurrentDevice
                  parseUserAgent={parseUserAgent}
                  onToggleTrust={() => toggleTrust(thisDevice.id, thisDevice.is_trusted)}
                  onEndSession={() => endSession(thisDevice.id)}
                />
              </div>
            )}

            {/* Other devices */}
            {otherDevices.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Diğer cihazlar</h3>
                <div className="space-y-2">
                  {otherDevices.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      parseUserAgent={parseUserAgent}
                      onToggleTrust={() => toggleTrust(s.id, s.is_trusted)}
                      onEndSession={() => endSession(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* End all sessions */}
            {otherDevices.length > 0 && (
              <button
                onClick={endAllSessions}
                className="w-full t-btn cancel text-error"
              >
                Diğer tüm oturumları sonlandır
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SessionCard({
  session,
  isCurrentDevice = false,
  parseUserAgent,
  onToggleTrust,
  onEndSession,
}: {
  session: Session;
  isCurrentDevice?: boolean;
  parseUserAgent: (ua: string | null) => { device: string; browser: string; os: string; isMobile: boolean };
  onToggleTrust: () => void;
  onEndSession: () => void;
}) {
  const { device, browser, os, isMobile } = parseUserAgent(session.user_agent);

  return (
    <div className="p-3.5 rounded-[15px] bg-bg-secondary">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="h-10 w-10 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
          {isMobile ? <Smartphone className="h-5 w-5 text-text-muted" /> : <Monitor className="h-5 w-5 text-text-muted" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {device}
              {isCurrentDevice && (
                <span className="ml-1.5 text-[0.7rem] font-semibold text-accent-main bg-accent-main/10 px-1.5 py-0.5 rounded-full">
                  Bu cihaz
                </span>
              )}
            </p>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{browser}{os ? ` \u2022 ${os}` : ""}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {session.last_active_at ? `Son aktivite: ${formatRelativeDate(session.last_active_at)}` : ""}
          </p>
        </div>

        {/* Trust badge */}
        <div className="shrink-0">
          {session.is_trusted ? (
            <ShieldCheck className="h-5 w-5 text-accent-main" />
          ) : (
            <ShieldOff className="h-5 w-5 text-text-muted/40" />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-primary">
        <button
          onClick={onToggleTrust}
          className="flex-1 t-btn cancel !h-[36px] !text-xs"
        >
          <Shield className="h-3.5 w-3.5" />
          {session.is_trusted ? "Güvenme" : "Güven"}
        </button>
        <button
          onClick={onEndSession}
          className="t-btn cancel !h-[36px] !text-xs text-error"
        >
          <LogOut className="h-3.5 w-3.5" />
          Çıkış yap
        </button>
      </div>
    </div>
  );
}
