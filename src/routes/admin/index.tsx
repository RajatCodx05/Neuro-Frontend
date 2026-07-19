import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Users, Database, ShieldCheck, ScrollText, TrendingUp, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · Dashboard — NeuroSearch AI" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.admin.dashboard() as Promise<{
      totalUsers: number;
      repositories: Array<{ id: string; name: string; sync_status: string; dataset_count: number; last_sync_at: string }>;
      recentAudit: Array<{ id: string; action: string; target_type: string; target_id: string; created_at: string }>;
    }>,
  });

  const stats = [
    { label: "Total users", value: data?.totalUsers ?? "—", icon: Users, to: "/admin/users" },
    { label: "Repositories", value: data?.repositories?.length ?? "—", icon: Database, to: "/admin/repositories" },
    { label: "Datasets indexed", value: (data?.repositories ?? []).reduce((a: number, r: Record<string, unknown>) => a + Number(r.dataset_count ?? 0), 0) ?? "—", icon: TrendingUp, to: "/admin/analytics" },
    { label: "Recent audits", value: (data?.recentAudit ?? []).length ?? "—", icon: ShieldCheck, to: "/admin/audit-log" },
  ];

  return (
    <>
      <AdminPageHeader title="Admin dashboard" description="Platform health at a glance" />
      <div className="space-y-8 px-6 py-6 md:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.label} to={s.to} className="glass card-elevated group rounded-2xl p-5 transition hover:border-white/20">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-cyan" />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <div className="mt-4 font-display text-3xl font-semibold">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
            </Link>
          ))}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Repository sync</h2>
            <Link to="/admin/repositories" className="text-xs text-cyan hover:underline">Manage →</Link>
          </div>
          <div className="glass rounded-2xl">
            <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {(data?.repositories ?? []).slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-4">
                  <span className={`h-2 w-2 rounded-full ${r.sync_status === "online" ? "bg-emerald-400" : r.sync_status === "syncing" ? "bg-amber-400" : "bg-rose-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.dataset_count.toLocaleString()} datasets · {r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : "never synced"}</div>
                  </div>
                </div>
              ))}
              {(!data?.repositories.length) && <div className="p-6 text-sm text-muted-foreground">No repositories configured yet.</div>}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent admin activity</h2>
            <Link to="/admin/audit-log" className="text-xs text-cyan hover:underline"><ScrollText className="mr-1 inline h-3.5 w-3.5" />Audit log →</Link>
          </div>
          <div className="glass divide-y divide-white/5 rounded-2xl">
            {(data?.recentAudit ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-cyan">{row.action}</span>
                  <span className="ml-2 text-muted-foreground">{row.target_type ?? ""} {row.target_id ?? ""}</span>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(!data?.recentAudit.length) && <div className="p-6 text-sm text-muted-foreground">No admin actions recorded yet.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
