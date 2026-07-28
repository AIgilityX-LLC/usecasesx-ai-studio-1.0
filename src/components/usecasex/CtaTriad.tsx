import { Link } from "@tanstack/react-router";
import { Rocket, Compass, Crown } from "lucide-react";

/**
 * Standardized platform CTAs (doc §13): Assess readiness with SARPI,
 * Request AIgilityX Advisory, Join Pro Waitlist.
 */
export function CtaTriad({ className = "" }: { className?: string }) {
  return (
    <section className={`border-y border-border bg-secondary/40 ${className}`}>
      <div className="mx-auto grid max-w-[1200px] gap-4 px-6 py-12 md:grid-cols-3">
        <Link
          to="/sarpi"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:shadow-[var(--shadow-gold)]"
        >
          <Rocket className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-lg font-bold text-foreground">Assess readiness with SARPI™</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Benchmark your AI strategy, risk and readiness before you invest.
          </p>
          <span className="mt-3 inline-block text-sm font-bold text-primary group-hover:underline">
            Open SARPI™ →
          </span>
        </Link>
        <Link
          to="/advisorx"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:shadow-[var(--shadow-gold)]"
        >
          <Compass className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-lg font-bold text-foreground">Request AIgilityX Advisory</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get board-ready recommendations from AIgilityX advisors.
          </p>
          <span className="mt-3 inline-block text-sm font-bold text-primary group-hover:underline">
            Talk to AdvisorX™ →
          </span>
        </Link>
        <Link
          to="/pricing"
          className="group rounded-2xl border border-border bg-card p-6 transition hover:shadow-[var(--shadow-gold)]"
        >
          <Crown className="h-6 w-6 text-primary" />
          <h3 className="mt-3 text-lg font-bold text-foreground">Join the Pro Waitlist</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Unlock full details, ROI tools, comparisons and exports.
          </p>
          <span className="mt-3 inline-block text-sm font-bold text-primary group-hover:underline">
            Get Pro access →
          </span>
        </Link>
      </div>
    </section>
  );
}
