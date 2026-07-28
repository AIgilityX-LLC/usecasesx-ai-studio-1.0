import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHero } from "@/components/usecasex/PageHero";

export const Route = createFileRoute("/_app/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — UseCasesX™" },
      {
        name: "description",
        content: "Update your profile, avatar, password, plan, analytics, and security.",
      },
    ],
  }),
  component: AccountLayout,
});

const TABS: { to: string; label: string }[] = [
  { to: "/account", label: "Profile" },
  { to: "/account/security", label: "Security" },
  { to: "/account/organization", label: "Organization" },
  { to: "/entitlement", label: "My Plan" },
  { to: "/module-analytics", label: "Module Analytics" },
];

function AccountLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string) =>
    to === "/account"
      ? pathname === "/account" || pathname === "/account/"
      : pathname.startsWith(to);

  return (
    <>
      <PageHero
        tone="dark"
        eyebrow="Account"
        title="Account settings"
        description="Manage your profile, avatar, password, plan, analytics, and security."
      />
      <div className="border-b border-border bg-background">
        <nav
          className="mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-6"
          aria-label="Account sections"
        >
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to as never}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive(t.to)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <Outlet />
    </>
  );
}
