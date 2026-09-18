import { useEffect, useState } from "react";

/** Animates a number from 0 → target once on mount. Respects reduced motion. */
export function useCountUp(target: number, durationMs = 1200, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, enabled]);

  return value;
}
