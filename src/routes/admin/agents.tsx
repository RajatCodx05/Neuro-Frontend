import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type AdminAgentItem } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Search, X, Inbox, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Admin · Agent activity — NeuroSearch AI" }] }),
  component: AgentsPage,
});

const PAGE_SIZE = 20;

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
    const fromSession = sessionStorage.getItem("admin_requestId_filter");
    if (fromSession) { sessionStorage.removeItem("admin_requestId_filter"); return fromSession; }
  } catch {}
  return "";
}

function AgentsPage() {
  const [agentFilter, setAgentFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const initialRid = getInitialRequestId();
  const [requestIdInput, setRequestIdInput] = useState(initialRid);
  const [requestIdFilter, setRequestIdFilter] = useState(initialRid);
  const [page, setPage] = useState(1);

  const hasFilters = !!(agentFilter || providerFilter || statusFilter || requestIdFilter);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-agents-v2", agentFilter, providerFilter, statusFilter, requestIdFilter, page],
    queryFn: async () => {
      if (!hasFilters) {
        // ponytail: no filters → backward-compat flat array
        const arr = await api.admin.infra.agents() as unknown as AdminAgentItem[];
        const offset = (page - 1) * PAGE_SIZE;
        return { items: arr.slice(offset, offset + PAGE_SIZE), total: arr.length };
      }
      const result = await api.admin.infra.agents({
        agent: agentFilter || undefined,
        provider: providerFilter || undefined,
        status: (statusFilter as "success" | "error") || undefined,
        requestId: requestIdFilter || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }) as { items: AdminAgentItem[]; total: number; limit: number; offset: number };
      return result;
    },
    staleTime: 15_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applyRequestId = useCallback(() => {
    setRequestIdFilter(requestIdInput.trim());
    setPage(1);
  }, [requestIdInput]);

  const clearAll = useCallback(() => {
    setAgentFilter(""); setProviderFilter(""); setStatusFilter("");
    setRequestIdInput(""); setRequestIdFilter(""); setPage(1);
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Agent activity"
        description={isLoading ? "Loading…" : `${total.toLocaleString()} agent log entries`}
      />
      <div className="space-y-4 px-6 py-6 md:px-8">
        {/* Filters */}
        <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
          {/* RequestId search */}
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 min-w-48">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={requestIdInput}
              onChange={(e) => setRequestIdInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyRequestId()}
              placeholder="Filter by request ID…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 font-mono"
            />
            {requestIdInput && (
              <button onClick={() => { setRequestIdInput(""); setRequestIdFilter(""); setPage(1); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Agent filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Agent:</span>
            <select
              value={agentFilter}
              onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer"
            >
              <option value="" className="bg-[oklch(0.18_0.02_258)]">All agents</option>
              <option value="fallback" className="bg-[oklch(0.18_0.02_258)]">fallback</option>
              <option value="parse_query" className="bg-[oklch(0.18_0.02_258)]">parse_query</option>
              <option value="repository_search" className="bg-[oklch(0.18_0.02_258)]">repository_search</option>
              <option value="link_verifier" className="bg-[oklch(0.18_0.02_258)]">link_verifier</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer"
            >
              <option value="" className="bg-[oklch(0.18_0.02_258)]">All</option>
              <option value="success" className="bg-[oklch(0.18_0.02_258)]">success</option>
              <option value="error" className="bg-[oklch(0.18_0.02_258)]">error</option>
            </select>
          </div>

          <button onClick={applyRequestId} className="rounded-xl bg-cyan/10 px-3 py-1.5 text-sm font-medium text-cyan hover:bg-cyan/20 transition">
            Apply
          </button>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition">
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="glass overflow-hidden rounded-2xl">
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-b border-white/5 [.light_&]:border-black/5 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs text-muted-foreground">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5 [.light_&]:border-black/5">
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Provider / Model</th>
                <th className="px-4 py-3 text-left">Request ID</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-right">Results</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded font-mono" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded font-mono" /></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-12 rounded" /></div></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-8 rounded" /></div></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-3 w-28 rounded" /></div></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-rose-400" />
                    Failed to load agent activity.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No agent activity yet.</p>
                  </td>
                </tr>
              ) : (
                items.map((e: AdminAgentItem) => (
                  <tr key={e._id ?? (e as any).id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono text-xs text-cyan">{e.agent}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {e.provider ?? "—"}{e.model ? ` / ${e.model}` : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {e.requestId ? `${e.requestId.slice(0, 12)}…` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {fmtMs(e.durationMs)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      {e.resultCount}
                    </td>
                    <td className={`px-4 py-3 ${e.status === "success" ? "text-emerald-500 [.light_&]:text-emerald-600" : "text-rose-500 [.light_&]:text-rose-600"}`}>
                      {e.status}
                      {e.errorMessage && (
                        <div className="text-[10px] text-rose-400/80 truncate max-w-[120px]">{e.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
