import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/app/admin-shell";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const user = await api.auth.me();
      if (!user.isAdmin) throw redirect({ to: "/" });
    } catch (error) {
      if (error && typeof error === "object" && "to" in error) throw error;
      throw redirect({ to: "/auth", search: { redirect: "/admin", mode: "login" as const } });
    }
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
