import { useEffect } from "react";

/**
 * IntersectionObserver reveal for `[data-reveal]` elements.
 * Adds `.revealed` at threshold 0.15. Delay via `data-reveal-delay` (ms).
 * Watches for late-mounted nodes (async lists). No-ops under reduced motion.
 */
export function useReveal(rootSelector = "main#main-content") {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.querySelector(rootSelector) ?? document.body;

    const revealNow = (el: HTMLElement) => {
      el.classList.add("revealed");
    };

    if (reduce) {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(revealNow);
      const mo = new MutationObserver(() => {
        root.querySelectorAll<HTMLElement>("[data-reveal]:not(.revealed)").forEach(revealNow);
      });
      mo.observe(root, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay ?? 0);
          if (delay > 0) el.style.setProperty("--reveal-delay", `${delay}ms`);
          el.classList.add("revealed");
          io.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    const observeAll = () => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (seen.has(el) || el.classList.contains("revealed")) return;
        seen.add(el);
        io.observe(el);
      });
    };

    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [rootSelector]);
}
