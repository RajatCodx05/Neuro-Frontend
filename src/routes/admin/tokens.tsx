import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/tokens")({
  head: () => ({ meta: [{ title: "Admin · Token usage — NeuroSearch AI" }] }),
  component: TokensPage,
});

type Dim = "user" | "day" | "month" | "agent";

function TokensPage() {
  const [dim, setDim] = useState<Dim>("day");
  const [userFilter, setUserFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data: events = [], isLoading } = useQuery<Array<{ id: string; userId: string; userEmail: string; agent: string; model: string; tokens: number; createdAt: string }>>({
    queryKey: ["admin-tokens"],
    queryFn: () => api.admin.infra.tokens() as Promise<Array<{ id: string; userId: string; userEmail: string; agent: string; model: string; tokens: number; createdAt: string }>>,
  });

  const filtered = useMemo(() => events.filter((e) =>
    (!userFilter || e.userEmail.toLowerCase().includes(userFilter.toLowerCase())) &&
    (!agentFilter || e.agent === agentFilter)
  ), [events, userFilter, agentFilter]);

  // Reset page when filters change
  const prevFilterKey = useMemo(() => userFilter + agentFilter, [userFilter, agentFilter]);
  if (page > 1) {
    const filteredLen = filtered.length;
    const maxPage = Math.max(1, Math.ceil(filteredLen / 10));
    if (page > maxPage) setPage(1);
  }

  const TOKENS_PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / TOKENS_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * TOKENS_PAGE_SIZE, page * TOKENS_PAGE_SIZE);

  const bucketed = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((e) => {
      let k = "";
      if (dim === "user") k = e.userEmail;
      else if (dim === "agent") k = e.agent;
      else if (dim === "day") k = new Date(e.createdAt).toISOString().slice(0, 10);
      else k = new Date(e.createdAt).toISOString().slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + e.tokens);
    });
    return Array.from(map.entries()).sort().map(([label, tokens]) => ({ label, tokens }));
  }, [filtered, dim]);

  const total = filtered.reduce((a, r) => a + r.tokens, 0);

  return (
    <>
      <AdminPageHeader
        title="Token usage"
        description={isLoading ? "Loading token usage..." : `${total.toLocaleString()} tokens across ${filtered.length} events`}
      />
      <div className="space-y-6 px-6 py-6 md:px-8">
        <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            {(["day", "month", "user", "agent"] as const).map((d) => (
              <button key={d} onClick={() => setDim(d)}
                className={`rounded-full px-3 py-1 capitalize ${dim === d ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
                {d}
              </button>
            ))}
          </div>
          {/* <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filter by user email…"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-cyan/50" /> */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Agent:</span>
            <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer">
              <option value="" className="bg-[oklch(0.18_0.02_258)]">All agents</option>
              <option value="fallback" className="bg-[oklch(0.18_0.02_258)]">fallback</option>
              <option value="parse_query" className="bg-[oklch(0.18_0.02_258)]">parse_query</option>
            </select>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Tokens by {dim}</div>
          {isLoading ? (
            <div className="mt-4 h-64 flex flex-col justify-between py-2">
              <div className="flex items-end justify-between gap-2 h-44">
                {[30, 50, 40, 70, 60, 85, 45, 90, 65, 80, 55, 75].map((h, i) => (
                  <Skeleton key={i} className="w-full rounded-t-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bucketed}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
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
                  />
                  <Line type="monotone" dataKey="tokens" stroke="var(--cyan)" strokeWidth={2} dot={{ r: 3, fill: "var(--cyan)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass overflow-hidden rounded-2xl">
          {/* Pagination header — top right */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-b border-white/5 [.light_&]:border-black/5 px-4 py-3">
              <span className="mr-1 text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-right">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-36 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded font-mono" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-16 rounded" /></div></td>
                  </tr>
                ))
              ) : (
                <>
                  {paged.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{e.userEmail}</td>
                      <td className="px-4 py-3 font-mono text-xs text-cyan">{e.agent}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.model}</td>
                      <td className="px-4 py-3 text-right">{e.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                  {paged.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No token usage recorded yet.</td></tr>}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
