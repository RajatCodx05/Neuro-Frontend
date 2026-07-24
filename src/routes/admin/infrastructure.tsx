import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { HardDrive, Activity, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/infrastructure")({
  head: () => ({ meta: [{ title: "Admin · Infrastructure — NeuroSearch AI" }] }),
  component: InfraPage,
});

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = n / 1024, i = 0;
  while (v > 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

function InfraPage() {
  const storage = useQuery({
    queryKey: ["infra-storage"],
    queryFn: () => api.admin.infra.storage() as Promise<{
      mongoUsedBytes: number;
      mongoStorageBytes: number;
      mongoLimitBytes: number;
      mongoUsagePercent: number;
      mongoDocuments: number;
      mongoCollections: number;
      redisUsedBytes: number;
      redisMaxBytes: number;
      redisUsagePercent: number;
      totalUsedBytes: number;
      totalLimitBytes: number;
      totalRemainingBytes: number;
      totalUsagePercent: number;
    }>,
  });

  return (
    <>
      <AdminPageHeader title="Infrastructure" description="MongoDB, Redis and storage health" />
      <div className="px-6 py-6 md:px-8">
          <div className="space-y-6">
            {/* Overall storage usage card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <HardDrive className="h-4 w-4 text-cyan" />
                    Total Storage Overview
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    MongoDB Atlas M0 (free) + Redis (free) combined usage
                  </p>
                </div>
                {storage.data && (
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    storage.data.totalUsagePercent > 80 ? "bg-red-500/10 text-red-400" :
                    storage.data.totalUsagePercent > 60 ? "bg-amber-500/10 text-amber-400" :
                    "bg-emerald-500/10 text-emerald-400"
                  }`}>
                    {storage.data.totalUsagePercent > 80 ? <AlertTriangle className="h-3.5 w-3.5" /> :
                     storage.data.totalUsagePercent > 60 ? <Activity className="h-3.5 w-3.5" /> :
                     <CheckCircle2 className="h-3.5 w-3.5" />}
                    {pct(storage.data.totalUsagePercent)} used
                  </div>
                )}
              </div>

              {/* Usage bar */}
              {storage.data && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{fmtBytes(storage.data.totalUsedBytes)} used</span>
                    <span>{fmtBytes(storage.data.totalRemainingBytes)} free</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(storage.data.totalUsagePercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    of {fmtBytes(storage.data.totalLimitBytes)} total
                  </div>
                </div>
              )}
            </div>

            {/* Per-service breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* MongoDB */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <HardDrive className="h-4 w-4 text-emerald-400" />
                  MongoDB Atlas (Free Tier)
                </div>
                <div className="mt-4 space-y-3">
                  {storage.data && (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Storage usage</span>
                          <span>{pct(storage.data.mongoUsagePercent)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              storage.data.mongoUsagePercent > 80 ? "bg-red-500" :
                              storage.data.mongoUsagePercent > 60 ? "bg-amber-500" :
                              "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(storage.data.mongoUsagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-muted-foreground">Data size</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.mongoUsedBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-muted-foreground">Storage size</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.mongoStorageBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-muted-foreground">Documents</div>
                          <div className="mt-0.5 font-medium text-foreground">{storage.data.mongoDocuments?.toLocaleString() ?? "—"}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-muted-foreground">Collections</div>
                          <div className="mt-0.5 font-medium text-foreground">{storage.data.mongoCollections ?? "—"}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3 col-span-2">
                          <div className="text-muted-foreground">Free tier limit</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.mongoLimitBytes)}</div>
                        </div>
                      </div>
                    </>
                  )}
                  {!storage.data && (
                    <div className="py-4 text-center text-xs text-muted-foreground">Loading storage stats...</div>
                  )}
                </div>
              </div>

              {/* Redis */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-rose-400" />
                  Redis (Free Tier)
                </div>
                <div className="mt-4 space-y-3">
                  {storage.data && (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Memory usage</span>
                          <span>{pct(storage.data.redisUsagePercent)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              storage.data.redisUsagePercent > 80 ? "bg-red-500" :
                              storage.data.redisUsagePercent > 60 ? "bg-amber-500" :
                              "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(storage.data.redisUsagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-muted-foreground">Memory used</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.redisUsedBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3">
                          <div className="text-muted-foreground">Max memory</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.redisMaxBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3 col-span-2">
                          <div className="text-muted-foreground">Remaining</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.redisMaxBytes - storage.data.redisUsedBytes)}</div>
                        </div>
                      </div>
                    </>
                  )}
                  {!storage.data && (
                    <div className="py-4 text-center text-xs text-muted-foreground">Loading storage stats...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Storage allocation pie chart */}
            {storage.data && (
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <BarChart3 className="h-4 w-4 text-cyan" />
                  Storage Allocation
                </div>
                <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <div className="h-48 w-48 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'MongoDB (data)', value: storage.data.mongoUsedBytes, color: '#34d399' },
                            { name: 'Redis (memory)', value: storage.data.redisUsedBytes, color: '#fb7185' },
                            { name: 'Free', value: Math.max(storage.data.totalRemainingBytes, 0), color: '#1e293b' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {[
                            { color: '#34d399' },
                            { color: '#fb7185' },
                            { color: '#1e293b' },
                          ].map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--popover)",
                            borderColor: "var(--border)",
                            color: "var(--popover-foreground)",
                            borderRadius: 12,
                            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)"
                          }}
                          itemStyle={{ color: "var(--foreground)" }}
                          labelStyle={{ color: "var(--muted-foreground)" }}
                          formatter={(v: number) => fmtBytes(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 self-center sm:self-start">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-muted-foreground">MongoDB data</span>
                      <span className="ml-auto font-medium text-foreground">{fmtBytes(storage.data.mongoUsedBytes)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0" />
                      <span className="text-muted-foreground">Redis memory</span>
                      <span className="ml-auto font-medium text-foreground">{fmtBytes(storage.data.redisUsedBytes)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-700 shrink-0" />
                      <span className="text-muted-foreground">Free / remaining</span>
                      <span className="ml-auto font-medium text-foreground">{fmtBytes(Math.max(storage.data.totalRemainingBytes, 0))}</span>
                    </div>
                    <hr className="border-white/5 my-2" />
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-muted-foreground">Total capacity</span>
                      <span className="ml-auto text-foreground">{fmtBytes(storage.data.totalLimitBytes)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat icon={HardDrive} label="MongoDB data" value={storage.data ? fmtBytes(storage.data.mongoUsedBytes) : "—"} />
              <Stat icon={Activity} label="Redis memory" value={storage.data ? fmtBytes(storage.data.redisUsedBytes) : "—"} />
              <Stat icon={HardDrive} label="Total used" value={storage.data ? fmtBytes(storage.data.totalUsedBytes) : "—"} />
              <Stat icon={CheckCircle2} label="Free remaining" value={storage.data ? fmtBytes(storage.data.totalRemainingBytes) : "—"} />
            </div>
          </div>
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
