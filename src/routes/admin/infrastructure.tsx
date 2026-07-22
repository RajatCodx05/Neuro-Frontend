import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import { z } from "zod";
import { HardDrive, Database, Activity, AlertTriangle, CheckCircle2, BarChart3, Cpu, MemoryStick } from "lucide-react";

const tab = z.enum(["mongo", "redis", "storage"]).catch("mongo");
const searchSchema = z.object({ tab: tab });

export const Route = createFileRoute("/admin/infrastructure")({
  head: () => ({ meta: [{ title: "Admin · Infrastructure — NeuroSearch AI" }] }),
  validateSearch: (s) => searchSchema.parse(s),
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
  const { tab } = useSearch({ from: "/admin/infrastructure" });
  const navigate = useNavigate();

  const mongo = useQuery({
    queryKey: ["infra-mongo"],
    queryFn: () => api.admin.infra.mongo() as Promise<{
      totalSizeBytes: number;
      dataSizeBytes: number;
      storageSizeBytes: number;
      indexSizeBytes: number;
      freeTierLimitBytes: number;
      usagePercent: number;
      collections: Array<{ name: string; count: number; sizeBytes: number; storageSizeBytes: number; indexSizeBytes: number; avgObjSizeBytes: number }>;
      growth: Array<{ day: string; sizeBytes: number }>;
    }>,
    enabled: tab === "mongo",
  });
  const redis = useQuery({
    queryKey: ["infra-redis"],
    queryFn: () => api.admin.infra.redis() as Promise<{
      uptimeSeconds: number;
      connectedClients: number;
      activeSseConnections: number;
      memoryUsedBytes: number;
      memoryPeakBytes: number;
      maxMemoryBytes: number;
      memoryUsagePercent: number;
      inFlightQueries: number;
      messageThroughputPerMin: number;
      pubsubChannels: Array<{ channel: string; subscribers: number }>;
      version: string;
      os: string;
      keyspaceHits: number;
      keyspaceMisses: number;
      hitRate: number;
    }>,
    enabled: tab === "redis",
  });
  const storage = useQuery({
    queryKey: ["infra-storage"],
    queryFn: () => api.admin.infra.storage() as Promise<{
      // MongoDB
      mongoUsedBytes: number;
      mongoStorageBytes: number;
      mongoLimitBytes: number;
      mongoUsagePercent: number;
      mongoDocuments: number;
      mongoCollections: number;
      // Redis
      redisUsedBytes: number;
      redisMaxBytes: number;
      redisUsagePercent: number;
      // Combined
      totalUsedBytes: number;
      totalLimitBytes: number;
      totalRemainingBytes: number;
      totalUsagePercent: number;
    }>,
    enabled: tab === "storage",
  });

  const setTab = (t: "mongo" | "redis" | "storage") => navigate({ to: "/admin/infrastructure", search: { tab: t } });

  return (
    <>
      <AdminPageHeader title="Infrastructure" description="MongoDB, Redis and storage health" />
      <div className="px-6 py-6 md:px-8">
        <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
          {(["mongo", "redis", "storage"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 capitalize ${tab === t ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
              {t === "mongo" ? "MongoDB" : t === "redis" ? "Redis" : "Storage"}
            </button>
          ))}
        </div>

        {tab === "mongo" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Total size" value={mongo.data ? fmtBytes(mongo.data.totalSizeBytes) : "—"} />
              <Stat label="Collections" value={mongo.data?.collections.length ?? "—"} />
              <Stat label="Docs (approx)" value={mongo.data ? mongo.data.collections.reduce((a: number, c: { count: number }) => a + c.count, 0).toLocaleString() : "—"} />
              <Stat label="14-day growth" value={mongo.data ? fmtBytes(mongo.data.growth[mongo.data.growth.length - 1].sizeBytes - mongo.data.growth[0].sizeBytes) : "—"} />
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-sm font-semibold">Storage growth</div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mongo.data?.growth ?? []}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.82 0.16 210)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.82 0.16 210)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={fmtBytes} />
                    <Tooltip contentStyle={{ background: "rgba(20,25,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={(v) => fmtBytes(Number(v))} />
                    <Area type="monotone" dataKey="sizeBytes" stroke="oklch(0.82 0.16 210)" fill="url(#g)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass overflow-hidden rounded-2xl">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left">Collection</th>
                    <th className="px-4 py-3 text-right">Documents</th>
                    <th className="px-4 py-3 text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(mongo.data?.collections ?? []).map((c: { name: string; count: number; sizeBytes: number }) => (
                    <tr key={c.name}>
                      <td className="px-4 py-3 font-mono text-xs">{c.name}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmtBytes(c.sizeBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "redis" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="SSE connections" value={redis.data?.activeSseConnections ?? "—"} />
              <Stat label="Msgs / min" value={redis.data?.messageThroughputPerMin?.toLocaleString() ?? "—"} />
              <Stat label="In-flight queries" value={redis.data?.inFlightQueries ?? "—"} />
              <Stat label="Memory" value={redis.data ? fmtBytes(redis.data.memoryUsedBytes) : "—"} />
              <Stat label="Uptime" value={redis.data ? `${Math.floor(redis.data.uptimeSeconds / 86400)}d` : "—"} />
              <Stat label="Clients" value={redis.data?.connectedClients ?? "—"} />
            </div>
            <div className="glass overflow-hidden rounded-2xl">
              <div className="border-b border-white/5 px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">Pub/sub channels</div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-white/5">
                  {(redis.data?.pubsubChannels ?? []).map((c: { channel: string; subscribers: number }) => (
                    <tr key={c.channel}>
                      <td className="px-4 py-3 font-mono text-xs">{c.channel}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{c.subscribers} subscribers</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "storage" && (
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
                  <Database className="h-4 w-4 text-emerald-400" />
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
                  <Cpu className="h-4 w-4 text-rose-400" />
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
                          contentStyle={{ background: 'rgba(20,25,40,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
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
              <Stat icon={Database} label="MongoDB data" value={storage.data ? fmtBytes(storage.data.mongoUsedBytes) : "—"} />
              <Stat icon={MemoryStick} label="Redis memory" value={storage.data ? fmtBytes(storage.data.redisUsedBytes) : "—"} />
              <Stat icon={HardDrive} label="Total used" value={storage.data ? fmtBytes(storage.data.totalUsedBytes) : "—"} />
              <Stat icon={CheckCircle2} label="Free remaining" value={storage.data ? fmtBytes(storage.data.totalRemainingBytes) : "—"} />
            </div>
          </div>
        )}
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
