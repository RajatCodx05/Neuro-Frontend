import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { z } from "zod";

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

function InfraPage() {
  const { tab } = useSearch({ from: "/admin/infrastructure" });
  const navigate = useNavigate();

  const mongo = useQuery({
    queryKey: ["infra-mongo"],
    queryFn: () => api.admin.infra.mongo() as Promise<{
      totalSizeBytes: number;
      collections: Array<{ name: string; count: number; sizeBytes: number }>;
      growth: Array<{ day: string; sizeBytes: number }>;
    } | null>,
    enabled: tab !== "redis",
  });
  const redis = useQuery({
    queryKey: ["infra-redis"],
    queryFn: () => api.admin.infra.redis() as Promise<{
      uptimeSeconds: number;
      connectedClients: number;
      activeSseConnections: number;
      memoryUsedBytes: number;
      inFlightQueries: number;
      messageThroughputPerMin: number;
      pubsubChannels: Array<{ channel: string; subscribers: number }>;
    } | null>,
    enabled: tab === "redis",
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Stat label="MongoDB storage" value={mongo.data ? fmtBytes(mongo.data.totalSizeBytes) : "—"} />
            </div>
            <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
              File storage metrics will appear here once the storage layer is provisioned. Currently only
              MongoDB storage is tracked.
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </div>
  );
}
