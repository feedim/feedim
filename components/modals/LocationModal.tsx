"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import Modal from "./Modal";

interface LocationData {
  label: string;
  lat: number;
  lng: number;
}

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onLocationUpdated: (text: string) => void;
  currentLocation?: LocationData | null;
}

type ModalStep = "prompt" | "loading" | "map" | "error";

export default function LocationModal({ open, onClose, onLocationUpdated, currentLocation }: LocationModalProps) {
  const t = useTranslations("modals");
  const hasExisting = !!currentLocation;

  const [step, setStep] = useState<ModalStep>(hasExisting ? "map" : "prompt");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : null,
  );
  const [locationLabel, setLocationLabel] = useState(currentLocation?.label || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [justUpdated, setJustUpdated] = useState(false);

  // Sync when modal opens with new currentLocation
  useEffect(() => {
    if (!open) return;
    if (currentLocation) {
      setStep("map");
      setCoords({ lat: currentLocation.lat, lng: currentLocation.lng });
      setLocationLabel(currentLocation.label);
    } else {
      setStep("prompt");
      setCoords(null);
      setLocationLabel("");
    }
    setErrorMsg("");
    setJustUpdated(false);
  }, [open, currentLocation]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePosition = useCallback(async (pos: GeolocationPosition) => {
    const { latitude, longitude } = pos.coords;
    setCoords({ lat: latitude, lng: longitude });
    try {
      const res = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });
      const data = await res.json();
      if (data.location) {
        const loc = data.location;
        // Detaylı: "Salihli, Manisa, 45300, TR"
        const detailParts = [loc.city, loc.region, loc.postcode, loc.country_code].filter(Boolean);
        const label = detailParts.length > 0 ? detailParts.join(", ") : "";
        setLocationLabel(label);
        // Settings satırına kısa versiyon
        const shortParts = [loc.city, loc.region, loc.country_code].filter(Boolean);
        onLocationUpdated(shortParts.length > 0 ? shortParts.join(", ") : label);
        setJustUpdated(true);
        setStep("map");
      } else {
        setErrorMsg(t("locationNotDetermined"));
        setStep("error");
      }
    } catch {
      setErrorMsg(t("locationNotDetermined"));
      setStep("error");
    }
  }, [t, onLocationUpdated]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg(t("locationNotSupported"));
      setStep("error");
      return;
    }

    setStep("loading");

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      () => {
        navigator.geolocation.getCurrentPosition(
          handlePosition,
          (err) => {
            setErrorMsg(err.code === 1 ? t("locationPermissionDenied") : t("locationNotDetermined"));
            setStep("error");
          },
          { enableHighAccuracy: false, timeout: 15000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [t, handlePosition]);

  return (
    <Modal open={open} onClose={handleClose} title={t("locationTitle")} size="sm">
      <div className="p-4">
        {step === "prompt" && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-accent-main/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-accent-main" />
            </div>
            <p className="text-[0.84rem] text-text-muted leading-relaxed">{t("locationDesc")}</p>
            <button
              onClick={requestLocation}
              className="t-btn accept w-full justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {t("locationPermissionBtn")}
            </button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <span className="loader" style={{ width: 18, height: 18 }} />
          </div>
        )}

        {step === "map" && coords && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <MapPin className="h-4 w-4 text-accent-main shrink-0" />
              <span className="text-[0.88rem] font-medium">{locationLabel}</span>
            </div>
            <div className="relative w-full h-[200px] rounded-[14px] overflow-hidden bg-bg-tertiary">
              <iframe
                title="Map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.02},${coords.lat - 0.01},${coords.lng + 0.02},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                className="w-full h-full border-0"
                loading="eager"
              />
            </div>
            <button
              onClick={justUpdated ? handleClose : requestLocation}
              className="t-btn accept w-full justify-center"
            >
              {justUpdated ? t("ok") : t("locationUpdate")}
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-[0.84rem] text-text-muted leading-relaxed">{errorMsg}</p>
            <button
              onClick={requestLocation}
              className="t-btn accept w-full justify-center"
            >
              {t("locationPermissionBtn")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
