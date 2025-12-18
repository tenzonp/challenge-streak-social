import { useEffect, useMemo, useState } from "react";

export type PerformanceMode = {
  lowEnd: boolean;
  reduceMotion: boolean;
  disableBlur: boolean;
  throttleUpdates: boolean;
};

function detectLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const hardwareConcurrency = navigator.hardwareConcurrency ?? 8;
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;
  const saveData = (navigator as any).connection?.saveData === true;
  const effectiveType = (navigator as any).connection?.effectiveType;
  
  // Detect slow network
  const slowNetwork = effectiveType === '2g' || effectiveType === 'slow-2g';
  
  // More aggressive detection for low-end Android
  const isLowEndAndroid = /Android/i.test(navigator.userAgent) && 
    (hardwareConcurrency <= 4 || (typeof deviceMemory === "number" && deviceMemory <= 4));

  return saveData || slowNetwork || isLowEndAndroid || hardwareConcurrency <= 2 || 
    (typeof deviceMemory === "number" && deviceMemory <= 2);
}

export function isPerfReduceMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("perf-reduce-motion");
}

export function isPerfLowEnd(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("perf-low-end");
}

export function usePerformanceMode(): PerformanceMode {
  const initial = useMemo<PerformanceMode>(() => {
    const lowEnd = detectLowEndDevice();
    return { 
      lowEnd, 
      reduceMotion: lowEnd,
      disableBlur: lowEnd,
      throttleUpdates: lowEnd
    };
  }, []);

  const [mode] = useState<PerformanceMode>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("perf-low-end", mode.lowEnd);
    root.classList.toggle("perf-reduce-motion", mode.reduceMotion);
    root.classList.toggle("perf-disable-blur", mode.disableBlur);
    
    // Force GPU acceleration on low-end
    if (mode.lowEnd) {
      root.style.setProperty('--animation-duration', '0.1s');
      root.style.setProperty('will-change', 'auto');
    }
  }, [mode.lowEnd, mode.reduceMotion, mode.disableBlur]);

  return mode;
}
