import { Link } from "@tanstack/react-router";

const FALLBACK_INDUSTRIES: { name: string; slug: string }[] = [
  { name: "Defense", slug: "defense" },
  { name: "Healthcare", slug: "healthcare" },
  { name: "Real Estate", slug: "real-estate" },
  { name: "Manufacturing", slug: "manufacturing" },
  { name: "Pharmaceuticals", slug: "pharma" },
  { name: "Transport & Travel", slug: "transport-travel" },
  { name: "Airlines & Aviation", slug: "airlines-aviation" },
  { name: "Food & Agribusiness", slug: "food-agribusiness" },
  { name: "Retail & E-Commerce", slug: "retail" },
  { name: "Education & Academia", slug: "education" },
  { name: "Media & Entertainment", slug: "media" },
  { name: "Automotive & Industrial", slug: "automotive" },
  { name: "Supply Chain & Logistics", slug: "logistics" },
  { name: "Regulatory & Compliance", slug: "regulatory-compliance" },
  { name: "Law Enforcement Agencies", slug: "law-enforcement" },
  { name: "Government & Public Sector", slug: "government" },
  { name: "Hospitality, Gaming & Leisure", slug: "hospitality" },
  { name: "Banking, Finance & Insurance", slug: "banking" },
];

export function IndustryFocusedSection({ industries }: { industries?: { slug: string; name: string }[] }) {
  const INDUSTRIES = industries && industries.length > 0 ? industries : FALLBACK_INDUSTRIES;
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          {/* LEFT — narrative card */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[oklch(0.85_0.13_215)]">
              AI for every sector
            </div>
            <h2 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-[40px]">
              Industry-Focused AI Use Cases
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Explore tailored AI, GenAI, Agentic AI, and automation use cases across regulated,
              commercial, industrial, public-sector, and service industries.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              UseCaseX helps leaders discover practical AI opportunities across multiple
              industries — from predictive insights and automation to governance, compliance,
              workflow intelligence, and executive decision support.
            </p>

            <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur lg:block">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { v: "18+", l: "Industries" },
                  { v: "1000+", l: "Use Cases" },
                  { v: "20+", l: "AI Types" },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="font-mono text-2xl font-bold text-white">{s.v}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{s.l}</div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-white/60">
                Each industry view surfaces sovereignty-aware use cases mapped to value, complexity,
                risk and readiness — ready to score, prioritize and operationalize.
              </p>
            </div>

            <div className="mt-8">
              <Link
                to="/ai-hub/usecasex/explore"
                className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:border-[oklch(0.85_0.13_215)] hover:text-[oklch(0.85_0.13_215)]"
              >
                Explore AI Use Cases for These Industries
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* RIGHT — two-column industry list */}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {INDUSTRIES.map((ind, i) => (
              <li key={ind.slug}>
                <Link
                  to="/ai-hub/usecasex/explore"
                  search={{ industries: [ind.slug] }}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3.5 backdrop-blur transition-all hover:-translate-y-px hover:border-[oklch(0.78_0.13_215_/_0.5)] hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold text-[oklch(0.78_0.13_215)] opacity-80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-white transition-colors group-hover:text-[oklch(0.92_0.08_215)]">
                      {ind.name}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className="text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-[oklch(0.85_0.13_215)]"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
