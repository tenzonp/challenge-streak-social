import { useEffect, useMemo, useState } from "react";

export type PerformanceMode = {
  lowEnd: boolean;
  reduceMotion: boolean;
};

function detectLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const hardwareConcurrency = navigator.hardwareConcurrency ?? 8;
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;
  const saveData = (navigator as any).connection?.saveData === true;

  // Heuristic tuned for low-end Android devices.
  return saveData || hardwareConcurrency <= 4 || (typeof deviceMemory === "number" && deviceMemory <= 4);
}

export function isPerfReduceMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("perf-reduce-motion");
}

export function usePerformanceMode(): PerformanceMode {
  const initial = useMemo<PerformanceMode>(() => {
    const lowEnd = detectLowEndDevice();
    return { lowEnd, reduceMotion: lowEnd };
  }, []);

  const [mode] = useState<PerformanceMode>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("perf-low-end", mode.lowEnd);
    root.classList.toggle("perf-reduce-motion", mode.reduceMotion);
  }, [mode.lowEnd, mode.reduceMotion]);

  return mode;
}
