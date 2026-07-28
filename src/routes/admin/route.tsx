import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const user = await api.auth.me();
      if (!user.isAdmin) throw redirect({ to: "/403", search: { reason: "admin-access" as const } });
    } catch (error) {
      // ponytail: TanStack Router redirects are throwables. Using standard isRedirect checks ensure they bubble up.
      if (isRedirect(error)) throw error;
      throw redirect({ to: "/auth", search: { redirect: "/admin", mode: "login" as const } });
    }
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
