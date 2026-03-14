"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithCache, withCacheScope, writeCache } from "@/lib/fetchWithCache";
import { FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";

// ─── Shared Notification Count ───
// Single Supabase Realtime (WebSocket) subscription shared across
// Sidebar + MobileBottomNav. Replaces duplicate 30s polling.
// Fallback: polls every 60s in case Realtime isn't enabled.

let _count = 0;
let _subscriberCount = 0;
let _channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
let _pollInterval: ReturnType<typeof setInterval> | null = null;
let _fetchTimeout: ReturnType<typeof setTimeout> | null = null;
let _connectTimer: ReturnType<typeof setTimeout> | null = null;
let _currentUserId: string | null = null;
const _listeners = new Set<(count: number) => void>();

// Device login alert callback — called when a device_login notification arrives via Realtime
let _onDeviceLogin: ((content: string) => void) | null = null;

export function setDeviceLoginHandler(handler: ((content: string) => void) | null) {
  _onDeviceLogin = handler;
}

function getNotificationCountUrl(userId?: string | null) {
  return withCacheScope("/api/notifications?count=true", `notif-badge:${userId || "guest"}`);
}

function notify(count: number) {
  _count = count;
  _listeners.forEach(fn => fn(count));
}

async function fetchCount(forceRefresh = false) {
  try {
    const data = await fetchWithCache(
      getNotificationCountUrl(_currentUserId),
      { ttlSeconds: FRESHNESS_WINDOWS.notificationCount, forceRefresh },
    ) as { unread_count?: number };
    notify(data.unread_count || 0);
  } catch {}
}

function debouncedFetch() {
  if (_fetchTimeout) clearTimeout(_fetchTimeout);
  _fetchTimeout = setTimeout(() => {
    void fetchCount(true);
  }, 300);
}

function connect(userId: string) {
  if (_channel || _connectTimer) return;
  _currentUserId = userId;

  // Delay connection to avoid "closed before established" in React StrictMode
  _connectTimer = setTimeout(() => {
    _connectTimer = null;
    if (_subscriberCount <= 0) return; // Already disconnected

    const supabase = createClient();

    // Subscribe to notification changes via Supabase Realtime (WebSocket)
    _channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          debouncedFetch();
          if (payload.new?.type === "device_login" && _onDeviceLogin) {
            _onDeviceLogin(payload.new.content || "");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => debouncedFetch()
      )
      .subscribe();

    // Fallback polling every 60s (in case Realtime isn't enabled for the table)
    _pollInterval = setInterval(() => {
      void fetchCount(true);
    }, 60_000);
  }, 100);

  // Initial fetch immediately
  void fetchCount(false);
}

function disconnect() {
  if (_connectTimer) {
    clearTimeout(_connectTimer);
    _connectTimer = null;
  }
  if (_channel) {
    const ch = _channel;
    _channel = null;
    const supabase = createClient();
    supabase.removeChannel(ch).catch(() => {});
  }
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  if (_fetchTimeout) {
    clearTimeout(_fetchTimeout);
    _fetchTimeout = null;
  }
  _count = 0;
  _currentUserId = null;
}

export function useNotificationCount(enabled: boolean, userId?: string): number {
  const [count, setCount] = useState(_count);

  useEffect(() => {
    if (!enabled || !userId) return;

    _subscriberCount++;
    _listeners.add(setCount);
    connect(userId);
    setCount(_count);

    return () => {
      _listeners.delete(setCount);
      _subscriberCount--;
      if (_subscriberCount <= 0) {
        _subscriberCount = 0;
        disconnect();
      }
    };
  }, [enabled, userId]);

  return count;
}

/** Call when user marks all notifications as read */
export function resetNotificationCount(userId?: string) {
  writeCache(getNotificationCountUrl(userId), { unread_count: 0 }, FRESHNESS_WINDOWS.notificationCount);
  notify(0);
}
