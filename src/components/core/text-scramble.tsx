import { useEffect, useRef, useState, type ReactNode } from "react";

const NOISE = "!@#$%^&*()_+-=[]{}|;:,.<>?0123456789";

function scrambleFrame(target: string, progress: number): string {
  return Array.from(target)
    .map((ch, i) => {
      if (ch === " " || ch === "\u00a0") return ch;
      const settleAt = (i + 1) / target.length;
      if (progress >= settleAt) return ch;
      return NOISE[Math.floor(Math.random() * NOISE.length)]!;
    })
    .join("");
}

type TextScrambleProps = {
  children: ReactNode;
  className?: string;
  /** ms — default 800 */
  duration?: number;
  /** When true, starts scramble. Parent should set via IntersectionObserver. */
  active?: boolean;
};

/**
 * Cycles alphanumeric noise per character, then settles on the final string.
 * Respects prefers-reduced-motion (shows final text immediately).
 */
export function TextScramble({
  children,
  className,
  duration = 800,
  active = true,
}: TextScrambleProps) {
  const target =
    typeof children === "string" || typeof children === "number" ? String(children) : "";
  const [display, setDisplay] = useState(target);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      started.current = true;
      return;
    }

    started.current = true;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(scrambleFrame(target, t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration, target]);

  useEffect(() => {
    if (!active) setDisplay(target);
  }, [target, active]);

  return (
    <span className={className} aria-label={target}>
      {display || children}
    </span>
  );
}
