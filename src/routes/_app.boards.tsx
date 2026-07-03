import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { KanbanSquare, Star } from "lucide-react";

export const Route = createFileRoute("/_app/boards")({
  component: BoardsLayout,
});

function BoardsLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const onCollections = pathname.startsWith("/boards/collections");
  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
      active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;
  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1280px] gap-6 px-6 pt-4">
          <Link to="/boards" className={tabClass(!onCollections)}>
            <KanbanSquare className="h-4 w-4" /> Boards
          </Link>
          <Link to="/boards/collections" className={tabClass(onCollections)}>
            <Star className="h-4 w-4" /> Collections
          </Link>
        </div>
      </div>
      <Outlet />
    </>
  );
}
