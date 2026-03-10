"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RefreshCw, Power, PowerOff } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";

interface ErrorLog {
  id: number;
  error_hash: string;
  message: string;
  source: string | null;
  url: string | null;
  user_agent: string | null;
  count: number;
  first_seen: string;
  last_seen: string;
}

export default function ErrorLogPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/error-log");
      if (res.status === 403) {
        feedimAlert("error", "Erişim reddedildi");
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setEnabled(!!data.enabled);
    } catch {
      feedimAlert("error", "Loglar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const toggleEnabled = async () => {
    const next = !enabled;
    try {
      await fetch("/api/error-log", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      setEnabled(next);
      if (!next) {
        setLogs([]);
        feedimAlert("success", "Error log kapatıldı ve loglar silindi");
      } else {
        feedimAlert("success", "Error log açıldı");
      }
    } catch {
      feedimAlert("error", "İşlem başarısız");
    }
  };

  const clearLogs = async () => {
    try {
      await fetch("/api/error-log", { method: "DELETE" });
      setLogs([]);
      setEnabled(false);
      feedimAlert("success", "Tüm loglar silindi ve error log kapatıldı");
    } catch {
      feedimAlert("error", "İşlem başarısız");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Error Log</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary text-text-primary text-sm font-medium hover:bg-bg-tertiary transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              enabled
                ? "bg-success/10 text-success hover:bg-success/20"
                : "bg-bg-secondary text-text-muted hover:bg-bg-tertiary"
            }`}
          >
            {enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            {enabled ? "Açık" : "Kapalı"}
          </button>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Temizle
            </button>
          )}
        </div>
      </div>

      {!enabled && (
        <div className="text-center py-12 text-text-muted">
          <PowerOff className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Error log kapalı. Loglamayı başlatmak için açın.</p>
        </div>
      )}

      {enabled && loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-bg-secondary rounded-xl p-4 animate-pulse">
              <div className="h-4 w-3/4 bg-bg-tertiary rounded mb-2" />
              <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
            </div>
          ))}
        </div>
      )}

      {enabled && !loading && logs.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-sm">Henüz log yok. Kullanıcılar hata yaşadığında burada görünecek.</p>
        </div>
      )}

      {enabled && !loading && logs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted mb-3">{logs.length} benzersiz hata</p>
          {logs.map(log => (
            <details key={log.id} className="bg-bg-secondary rounded-xl overflow-hidden group">
              <summary className="flex items-start gap-3 p-4 cursor-pointer hover:bg-bg-tertiary/50 transition select-none">
                <span className="shrink-0 mt-0.5 bg-red-500/10 text-red-500 text-[0.7rem] font-bold px-2 py-0.5 rounded-full">
                  ×{log.count}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-400 break-all line-clamp-2">{log.message}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    {log.url && <span>{log.url}</span>}
                    <span>{formatDate(log.last_seen)}</span>
                  </div>
                </div>
              </summary>
              <div className="px-4 pb-4 space-y-2 text-xs border-t border-border-primary/30 pt-3">
                <div>
                  <span className="text-text-muted">Mesaj:</span>
                  <pre className="mt-1 bg-bg-primary/50 rounded-lg p-2 text-text-primary break-all whitespace-pre-wrap">{log.message}</pre>
                </div>
                {log.source && (
                  <div>
                    <span className="text-text-muted">Kaynak:</span>
                    <pre className="mt-1 bg-bg-primary/50 rounded-lg p-2 text-text-primary break-all whitespace-pre-wrap">{log.source}</pre>
                  </div>
                )}
                {log.url && (
                  <div>
                    <span className="text-text-muted">URL:</span>
                    <span className="ml-2">{log.url}</span>
                  </div>
                )}
                {log.user_agent && (
                  <div>
                    <span className="text-text-muted">User Agent:</span>
                    <span className="ml-2 break-all">{log.user_agent}</span>
                  </div>
                )}
                <div className="flex gap-4">
                  <div>
                    <span className="text-text-muted">İlk görülme:</span>
                    <span className="ml-2">{formatDate(log.first_seen)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Son görülme:</span>
                    <span className="ml-2">{formatDate(log.last_seen)}</span>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
