"use client";

interface LazySizesWindow extends Window {
  lazySizesConfig?: {
    init: boolean;
    loadMode: number;
    expFactor: number;
    hFac: number;
    ricTimeout: number;
    throttleDelay: number;
  };
  lazySizes?: { init: () => void };
}

export async function initLazySizes() {
  if (typeof window === "undefined") return;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const saveData = !!nav.connection?.saveData;
  const effectiveType = nav.connection?.effectiveType || "";
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const lowCpu = (navigator.hardwareConcurrency || 8) <= 4;
  const slowNetwork = /(^|slow-)(2g|3g)$|^(2g|3g)$/.test(effectiveType);
  const constrained = coarsePointer || saveData || slowNetwork || lowMemory || lowCpu;

  const lazyWindow = window as LazySizesWindow;
  lazyWindow.lazySizesConfig = {
    init: false,
    loadMode: constrained ? 1 : 2,
    expFactor: constrained ? 2 : 4,
    hFac: constrained ? 0.7 : 0.8,
    ricTimeout: constrained ? 120 : 50,
    throttleDelay: constrained ? 180 : 100,
  };

  await import("lazysizes");
  // @ts-expect-error lazysizes plugin has no exported type declarations
  await import("lazysizes/plugins/attrchange/ls.attrchange");

  // Init immediately on next frame — don't wait for idle
  requestAnimationFrame(() => {
    if (lazyWindow.lazySizes) {
      lazyWindow.lazySizes.init();
    }
  });
}
