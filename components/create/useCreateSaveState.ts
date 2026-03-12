"use client";

import { useRef, useState } from "react";

type SaveStatus = "draft" | "published";

export default function useCreateSaveState() {
  const saveInFlightRef = useRef(false);
  const [savingAs, setSavingAs] = useState<SaveStatus | null>(null);

  const startSaving = (status: SaveStatus) => {
    if (saveInFlightRef.current) return false;
    saveInFlightRef.current = true;
    setSavingAs(status);
    return true;
  };

  const finishSaving = (keepLocked = false) => {
    if (keepLocked) return;
    saveInFlightRef.current = false;
    setSavingAs(null);
  };

  return {
    savingAs,
    startSaving,
    finishSaving,
  };
}
