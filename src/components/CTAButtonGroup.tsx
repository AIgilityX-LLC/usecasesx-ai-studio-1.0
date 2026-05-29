import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface CTA { label: ReactNode; to?: string; href?: string; variant?: "primary" | "secondary" | "ghost"; onClick?: () => void; }

export function CTAButtonGroup({ ctas, align = "left" }: { ctas: CTA[]; align?: "left" | "center" }) {
  return (
    <div className={"flex flex-wrap items-center gap-3 " + (align === "center" ? "justify-center" : "")}>
      {ctas.map((c, i) => {
        const cls =
          c.variant === "secondary"
            ? "rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary"
            : c.variant === "ghost"
              ? "text-sm font-semibold text-muted-foreground hover:text-foreground"
              : "rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110";
        if (c.to) return <Link key={i} to={c.to as never} className={cls}>{c.label}</Link>;
        if (c.href) return <a key={i} href={c.href} target="_blank" rel="noreferrer" className={cls}>{c.label}</a>;
        return <button key={i} onClick={c.onClick} className={cls}>{c.label}</button>;
      })}
    </div>
  );
}
