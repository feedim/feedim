"use client";

import { useEffect } from "react";

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

export default function LocationPrompt() {
  useEffect(() => {
    try {
      // Quick cache check — avoid API call on every page load
      const lastSaved = localStorage.getItem("fdm-location-saved");
      if (lastSaved) {
        const elapsed = Date.now() - parseInt(lastSaved, 10);
        if (elapsed < FIVE_DAYS) return;
      }

      // Check current location status in DB (only works for logged-in users)
      fetch("/api/location")
        .then((r) => {
          if (!r.ok) return null;
          return r.json();
        })
        .then((data) => {
          if (!data) return;

          if (data.location) {
            // Check freshness via created_at
            const createdAt = data.location.created_at
              ? new Date(data.location.created_at).getTime()
              : 0;
            const age = Date.now() - createdAt;

            if (age < FIVE_DAYS) {
              // Location is fresh — cache and skip
              localStorage.setItem("fdm-location-saved", String(Date.now()));
              return;
            }
          }

          // Location unknown or stale — update silently (no browser dialog)
          updateLocation();
        })
        .catch(() => {});
    } catch {}
  }, []);

  return null;
}

/**
 * Update location silently — only use GPS if permission is already granted,
 * otherwise use IP-based fallback (no browser permission dialog).
 */
function updateLocation() {
  if (navigator.permissions) {
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          // Already granted — use GPS silently
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              saveLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => saveLocation({ ip_fallback: true }),
            { timeout: 10000, maximumAge: 300000 }
          );
        } else {
          // Not granted or denied — use IP fallback (no dialog)
          saveLocation({ ip_fallback: true });
        }
      })
      .catch(() => saveLocation({ ip_fallback: true }));
  } else {
    saveLocation({ ip_fallback: true });
  }
}

function saveLocation(body: Record<string, unknown>) {
  fetch("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.location) {
        localStorage.setItem("fdm-location-saved", String(Date.now()));
      }
    })
    .catch(() => {});
}
