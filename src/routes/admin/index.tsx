import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Database, ShieldCheck, ScrollText, TrendingUp, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · Dashboard — NeuroSearch AI" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading: dashboardLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.admin.dashboard() as Promise<{
      totalUsers: number;
      repositories: Array<{ id: string; name: string; sync_status: string; dataset_count: number; last_sync_at: string }>;
      recentAudit: Array<{ _id: string; action: string; targetType: string; targetId: string; createdAt: string }>;
    }>,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.admin.analytics(),
  });

  const [repoPage, setRepoPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

  const repositories = data?.repositories ?? [];
  const repoPageSize = 5;
  const totalRepoPages = Math.max(1, Math.ceil(repositories.length / repoPageSize));
  const paginatedRepos = repositories.slice((repoPage - 1) * repoPageSize, repoPage * repoPageSize);

  const activities = data?.recentAudit ?? [];
  const activityPageSize = 5;
  const totalActivityPages = Math.max(1, Math.ceil(activities.length / activityPageSize));
  const paginatedActivities = activities.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize);

  const datasetsCount = (data as any)?.datasetCollectionBreakdown?.datasets ?? 860;
  const catalogCount = (data as any)?.datasetCollectionBreakdown?.neurosearch_datasets_catalog ?? 7320;
  const datasetsTotal = datasetsCount + catalogCount;

  const stats = [
    {
      id: "users",
      label: "Total users",
      value: data?.totalUsers ?? "—",
      isLoading: dashboardLoading,
      icon: Users,
      to: "/admin/users",
    },
    {
      id: "repos",
      label: "Repositories",
      value: data?.repositories?.length ?? "—",
      isLoading: dashboardLoading,
      icon: Database,
      to: "/admin/repositories",
    },
    {
      id: "datasets",
      label: "Datasets indexed",
      value: datasetsTotal.toLocaleString(),
      isLoading: dashboardLoading && analyticsLoading,
      icon: TrendingUp,
      to: "/admin/analytics",
      breakdown: [
        { name: "datasets", count: datasetsCount },
        { name: "neurosearch_datasets_catalog", count: catalogCount },
      ],
    },
    {
      id: "audits",
      label: "Recent audits",
      value: (data?.recentAudit ?? []).length ?? "—",
      isLoading: dashboardLoading,
      icon: ShieldCheck,
      to: "/admin/audit-log",
    },
  ];

  return (
    <>
      <AdminPageHeader title="Admin dashboard" description="Platform health at a glance" />
      <div className="space-y-8 px-6 py-6 md:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="relative group">
              <Link
                to={s.to}
                className="glass card-elevated block rounded-2xl p-5 transition hover:border-white/20 [.light_&]:hover:border-black/20"
              >
                <div className="flex items-center justify-between">
                  <s.icon className="h-5 w-5 text-cyan" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                </div>
                <div className="mt-4 font-display text-3xl font-semibold">
                  {s.isLoading ? <Skeleton className="h-9 w-20 rounded-lg" /> : s.value}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</span>
                  {s.breakdown && (
                    <span className="rounded-full bg-cyan/15 px-2 py-0.5 font-mono text-[10px] font-medium text-cyan">
                      2 collections
                    </span>
                  )}
                </div>
              </Link>

              {/* Hover Pop-up with Backdrop Blur */}
              {s.breakdown && (
                <div className="pointer-events-none absolute bottom-full left-0 right-0 z-50 mb-2.5 invisible opacity-0 translate-y-2 transition-all duration-300 delay-75 ease-out group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-hover:translate-y-0">
                  <div className="rounded-2xl border border-white/20 [.light_&]:border-black/20 bg-slate-950/85 [.light_&]:bg-white/90 p-4 shadow-2xl backdrop-blur-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 [.light_&]:border-black/10 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Database className="h-3.5 w-3.5 text-cyan" />
                        <span>Dataset Collections</span>
                      </div>
                      <span className="rounded-full bg-cyan/20 border border-cyan/40 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan">
                        Total: {datasetsTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded-xl bg-white/5 [.light_&]:bg-black/5 p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="font-mono text-foreground font-medium">datasets</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {datasetsCount.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-white/5 [.light_&]:bg-black/5 p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-cyan" />
                          <span className="font-mono text-foreground font-medium">neurosearch_datasets_catalog</span>
                        </div>
                        <span className="font-mono font-bold text-cyan">
                          {catalogCount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-muted-foreground italic font-mono pt-1 text-center border-t border-white/5 [.light_&]:border-black/5">
                      Combined index total across collections
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Repository sync</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRepoPage(prev => Math.max(1, prev - 1))}
                disabled={repoPage === 1 || dashboardLoading}
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition text-muted-foreground hover:text-foreground"
                aria-label="Previous repository page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRepoPage(prev => Math.min(totalRepoPages, prev + 1))}
                disabled={repoPage === totalRepoPages || dashboardLoading}
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition text-muted-foreground hover:text-foreground"
                aria-label="Next repository page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <Link to="/admin/repositories" className="text-xs text-cyan hover:underline ml-2">Manage →</Link>
            </div>
          </div>
          <div className="glass rounded-2xl">
            <div className="grid grid-cols-1 divide-y divide-white/5 [.light_&]:divide-black/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              {dashboardLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-40 rounded" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {paginatedRepos.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-4">
                      <span className={`h-2 w-2 rounded-full ${r.sync_status === "online" ? "bg-emerald-400" : r.sync_status === "syncing" ? "bg-amber-400" : "bg-rose-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.dataset_count.toLocaleString()} datasets · {r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : "never synced"}</div>
                      </div>
                    </div>
                  ))}
                  {(!repositories.length) && <div className="p-6 text-sm text-muted-foreground">No repositories configured yet.</div>}
                </>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent admin activity</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                disabled={activityPage === 1 || dashboardLoading}
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition text-muted-foreground hover:text-foreground"
                aria-label="Previous activity page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActivityPage(prev => Math.min(totalActivityPages, prev + 1))}
                disabled={activityPage === totalActivityPages || dashboardLoading}
                className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition text-muted-foreground hover:text-foreground"
                aria-label="Next activity page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <Link to="/admin/audit-log" className="text-xs text-cyan hover:underline ml-2 flex items-center">
                <ScrollText className="mr-1 inline h-3.5 w-3.5" />
                Audit log →
              </Link>
            </div>
          </div>
          <div className="glass divide-y divide-white/5 [.light_&]:divide-black/5 rounded-2xl">
            {dashboardLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <Skeleton className="h-4 w-28 rounded font-mono" />
                    <Skeleton className="h-3 w-48 rounded" />
                  </div>
                  <Skeleton className="h-3 w-28 rounded shrink-0" />
                </div>
              ))
            ) : (
              <>
                {paginatedActivities.map((row) => (
                  <div key={row._id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-cyan">{row.action}</span>
                      <span className="ml-2 text-muted-foreground">{row.targetType ?? ""} {row.targetId ?? ""}</span>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                {(!activities.length) && <div className="p-6 text-sm text-muted-foreground">No admin actions recorded yet.</div>}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
