"use client";

import { useEffect } from "react";

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

export default function LocationPrompt() {
  useEffect(() => {
    try {
      // Check if we already saved location recently
      const lastSaved = localStorage.getItem("fdm-location-saved");
      if (lastSaved) {
        const elapsed = Date.now() - parseInt(lastSaved, 10);
        if (elapsed < FIVE_DAYS) return; // Saved within 5 days — skip
      }

      requestLocation();
    } catch {}
  }, []);

  return null;
}

function requestLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        saveLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // Denied or error — IP fallback
        saveLocation({ ip_fallback: true });
      },
      { timeout: 10000, maximumAge: 300000 }
    );
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
      // Only mark as saved if we actually got a location
      if (data.location) {
        localStorage.setItem("fdm-location-saved", String(Date.now()));
      }
    })
    .catch(() => {});
}
