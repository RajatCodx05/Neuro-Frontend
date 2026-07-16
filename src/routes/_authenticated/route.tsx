import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { api } from "@/lib/api-client";

// Auth guard re-enabled against Node-backed session (httpOnly cookie).
// Replaces the old "Demo mode" no-op that bypassed the check.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      await api.auth.me(); // throws if no valid session cookie
    } catch {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href, mode: "login" as const },
      });
    }
  },
  component: () => <Outlet />,
});
