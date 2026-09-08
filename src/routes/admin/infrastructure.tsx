import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type AdminExternalLog } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { HardDrive, Activity, AlertTriangle, CheckCircle2, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

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
                {storage.isLoading ? (
                  <Skeleton className="h-6 w-20 rounded-full" />
                ) : storage.data && (
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
              {storage.isLoading ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                  <div className="mt-1 flex justify-end">
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              ) : storage.data ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{fmtBytes(storage.data.totalUsedBytes)} used</span>
                    <span>{fmtBytes(storage.data.totalRemainingBytes)} free</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 [.light_&]:bg-black/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(storage.data.totalUsagePercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    of {fmtBytes(storage.data.totalLimitBytes)} total
                  </div>
                </div>
              ) : null}
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
                  {storage.isLoading ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <Skeleton className="h-3 w-24 rounded" />
                          <Skeleton className="h-3 w-10 rounded" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 space-y-1">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-20 rounded" />
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 space-y-1">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-20 rounded" />
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 space-y-1">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-16 rounded" />
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 space-y-1">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-16 rounded" />
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 col-span-2 space-y-1">
                          <Skeleton className="h-3 w-20 rounded" />
                          <Skeleton className="h-4 w-24 rounded" />
                        </div>
                      </div>
                    </>
                  ) : storage.data ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Storage usage</span>
                          <span>{pct(storage.data.mongoUsagePercent)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 [.light_&]:bg-black/5">
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
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3">
                          <div className="text-muted-foreground">Data size</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.mongoUsedBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3">
                          <div className="text-muted-foreground">Storage size</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.mongoStorageBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3">
                          <div className="text-muted-foreground">Documents</div>
                          <div className="mt-0.5 font-medium text-foreground">{storage.data.mongoDocuments?.toLocaleString() ?? "—"}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3">
                          <div className="text-muted-foreground">Collections</div>
                          <div className="mt-0.5 font-medium text-foreground">{storage.data.mongoCollections ?? "—"}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 col-span-2">
                          <div className="text-muted-foreground">Free tier limit</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.mongoLimitBytes)}</div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Redis */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4 text-rose-400" />
                  Redis (Free Tier)
                </div>
                <div className="mt-4 space-y-3">
                  {storage.isLoading ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <Skeleton className="h-3 w-24 rounded" />
                          <Skeleton className="h-3 w-10 rounded" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 space-y-1">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-20 rounded" />
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 space-y-1">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-20 rounded" />
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 col-span-2 space-y-1">
                          <Skeleton className="h-3 w-20 rounded" />
                          <Skeleton className="h-4 w-24 rounded" />
                        </div>
                      </div>
                    </>
                  ) : storage.data ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Memory usage</span>
                          <span>{pct(storage.data.redisUsagePercent)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 [.light_&]:bg-black/5">
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
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3">
                          <div className="text-muted-foreground">Memory used</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.redisUsedBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3">
                          <div className="text-muted-foreground">Max memory</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.redisMaxBytes)}</div>
                        </div>
                        <div className="rounded-lg bg-white/5 [.light_&]:bg-black/[0.04] p-3 col-span-2">
                          <div className="text-muted-foreground">Remaining</div>
                          <div className="mt-0.5 font-medium text-foreground">{fmtBytes(storage.data.redisMaxBytes - storage.data.redisUsedBytes)}</div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Storage allocation pie chart */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-cyan" />
                Storage Allocation
              </div>
              {storage.isLoading ? (
                <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <Skeleton className="h-48 w-48 rounded-full shrink-0" />
                  <div className="flex-1 space-y-3 self-center sm:self-start w-full">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <hr className="border-white/5 my-2" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                </div>
              ) : storage.data ? (
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
              ) : null}
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat icon={HardDrive} label="MongoDB data" value={storage.data ? fmtBytes(storage.data.mongoUsedBytes) : "—"} isLoading={storage.isLoading} />
              <Stat icon={Activity} label="Redis memory" value={storage.data ? fmtBytes(storage.data.redisUsedBytes) : "—"} isLoading={storage.isLoading} />
              <Stat icon={HardDrive} label="Total used" value={storage.data ? fmtBytes(storage.data.totalUsedBytes) : "—"} isLoading={storage.isLoading} />
              <Stat icon={CheckCircle2} label="Free remaining" value={storage.data ? fmtBytes(storage.data.totalRemainingBytes) : "—"} isLoading={storage.isLoading} />
            </div>
          </div>
      </div>

      {/* Phase 8 — External API activity */}
      <ExternalApiSection />
    </>
  );
}

const EXT_PAGE_SIZE = 25;

function fmtMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function getInitialRequestId(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("requestId");
  if (fromUrl) return fromUrl;
  try {
    const ss = sessionStorage.getItem("admin_requestId_filter");
    if (ss) { sessionStorage.removeItem("admin_requestId_filter"); return ss; }
  } catch {}
  return "";
}

function ExternalApiSection() {
  const initialRid = getInitialRequestId();
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [requestIdFilter, setRequestIdFilter] = useState(initialRid);
  const [requestIdInput, setRequestIdInput] = useState(initialRid);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["ext-logs", serviceFilter, statusFilter, requestIdFilter, page],
    queryFn: () => api.admin.externalLogs.list({
      service: serviceFilter || undefined,
      status: (statusFilter as "success" | "error") || undefined,
      requestId: requestIdFilter || undefined,
      limit: EXT_PAGE_SIZE,
      offset: (page - 1) * EXT_PAGE_SIZE,
    }),
    staleTime: 15_000,
  });

  // summary comes from backend aggregate over the FULL filtered dataset, not just this page
  const summary = data?.summary;
  const items: AdminExternalLog[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / EXT_PAGE_SIZE));

  return (
    <div className="px-6 pb-8 md:px-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">External API activity</h2>

      {/* Summary stats — always over full filtered dataset */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total calls", value: isLoading ? null : (summary?.count ?? 0).toLocaleString() },
          { label: "Errors", value: isLoading ? null : (summary?.errors ?? 0).toLocaleString() },
          { label: "Avg duration", value: isLoading ? null : (summary?.avgMs != null ? fmtMs(summary.avgMs) : "—") },
          { label: "Max duration", value: isLoading ? null : (summary?.maxMs != null ? fmtMs(summary.maxMs) : "—") },
          { label: "Min duration", value: isLoading ? null : (summary?.minMs != null ? fmtMs(summary.minMs) : "—") },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="mt-1.5 font-display text-xl font-semibold">
              {value == null ? <Skeleton className="h-6 w-14 rounded" /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Service:</span>
          <select value={serviceFilter} onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer">
            <option value="" className="bg-[oklch(0.18_0.02_258)]">All services</option>
            <option value="tavily" className="bg-[oklch(0.18_0.02_258)]">tavily</option>
            <option value="openneuro" className="bg-[oklch(0.18_0.02_258)]">openneuro</option>
            <option value="dandi" className="bg-[oklch(0.18_0.02_258)]">dandi</option>
            <option value="zenodo" className="bg-[oklch(0.18_0.02_258)]">zenodo</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Status:</span>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer">
            <option value="" className="bg-[oklch(0.18_0.02_258)]">All</option>
            <option value="success" className="bg-[oklch(0.18_0.02_258)]">success</option>
            <option value="error" className="bg-[oklch(0.18_0.02_258)]">error</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Request ID:</span>
          <input
            value={requestIdInput}
            onChange={(e) => setRequestIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setRequestIdFilter(requestIdInput.trim()), setPage(1))}
            placeholder="Filter by request ID…"
            className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-mono outline-none placeholder:text-muted-foreground/60"
          />
          <button onClick={() => { setRequestIdFilter(requestIdInput.trim()); setPage(1); }} className="rounded-xl bg-cyan/10 px-3 py-1.5 text-sm font-medium text-cyan hover:bg-cyan/20 transition shrink-0">Apply</button>
          {requestIdFilter && <button onClick={() => { setRequestIdInput(""); setRequestIdFilter(""); setPage(1); }} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>}
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden rounded-2xl">
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-b border-white/5 [.light_&]:border-black/5 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              {(page - 1) * EXT_PAGE_SIZE + 1}–{Math.min(page * EXT_PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5 [.light_&]:border-black/5">
              <th className="px-4 py-3 text-left">When</th>
              <th className="px-4 py-3 text-left">Service</th>
              <th className="px-4 py-3 text-left">Operation</th>
              <th className="px-4 py-3 text-right">Duration</th>
              <th className="px-4 py-3 text-center">HTTP</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded font-mono" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
                  <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-12 rounded" /></div></td>
                  <td className="px-4 py-3"><div className="flex justify-center"><Skeleton className="h-4 w-8 rounded" /></div></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-14 rounded" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  No external API calls recorded yet.
                </td>
              </tr>
            ) : (
              items.map((l) => (
                <tr key={l._id} className="hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan">{l.service}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.operation}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtMs(l.durationMs)}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{l.httpStatus ?? "—"}</td>
                  <td className={`px-4 py-3 text-xs ${l.status === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                    {l.status}
                    {l.error && <div className="text-[10px] text-rose-400/80 truncate max-w-[140px]">{l.error}</div>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, isLoading }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; isLoading?: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">
        {isLoading ? <Skeleton className="h-7 w-20 rounded-lg" /> : value}
      </div>
    </div>
  );
}
