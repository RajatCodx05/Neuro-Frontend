import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/403")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ reason: typeof s.reason === "string" ? s.reason : undefined }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const search = Route.useSearch();
  const reason = search.reason;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 hero-bg" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] glow-cyan">
            <ShieldAlert className="h-4 w-4 text-[oklch(0.15_0.03_258)]" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-semibold text-foreground">
            NeuroSearch <span className="text-cyan-600 dark:text-cyan">AI</span>
          </span>
        </Link>
        <div className="glass-strong card-elevated rounded-3xl p-6 sm:p-8 text-center">
          <h1 className="gradient-text text-7xl font-bold">403</h1>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            {reason === "admin-access" ? "Admin access required" : "Access restricted"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {reason === "admin-access"
              ? "Your account does not have administrator privileges. If you believe this is an error, contact support."
              : "You do not have permission to view this page."}
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-5 py-2.5 text-sm font-medium text-[oklch(0.15_0.03_258)] transition hover:shadow-md"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
