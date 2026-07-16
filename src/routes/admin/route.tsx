import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { api } from "@/lib/api-client";

// Admin guard re-enabled against Node-backed session + isAdmin JWT field.
// Replaces the old "Demo mode" no-op that bypassed the check.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    let user;
    try {
      user = await api.auth.me(); // throws if no valid session
    } catch {
      throw redirect({ to: "/auth", search: { redirect: undefined, mode: "login" as const } });
    }
    if (!user.isAdmin) {
      // Authenticated but not an admin — send home, not to login
      throw redirect({ to: "/" });
    }
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
