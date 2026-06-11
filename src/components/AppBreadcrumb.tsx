import { Link, useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

function prettify(segment: string) {
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
  return decoded.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  const crumbs = parts.map((seg, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/");
    const isLast = idx === parts.length - 1;
    const label = seg.length > 24 ? seg.slice(0, 8) + "…" : prettify(seg);
    return { href, label, isLast };
  });

  return (
    <Breadcrumb className="hidden md:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((c) => (
          <span key={c.href} className="flex items-center gap-1.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {c.isLast ? (
                <BreadcrumbPage>{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={c.href as never}>{c.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
