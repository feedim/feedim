import type { MomentsPerfHints } from "@/components/moments/types";

export function getMomentsPerfHints(): MomentsPerfHints {
  if (typeof window === "undefined") {
    return {
      constrained: true,
      warmupDelayMs: 800,
      allowVideoPrefetch: false,
    };
  }

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

  return {
    constrained,
    warmupDelayMs: constrained ? 900 : 220,
    allowVideoPrefetch: !constrained,
  };
}
