import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
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

  const { data: events = [] } = useQuery<Array<{ id: string; userId: string; userEmail: string; agent: string; model: string; tokens: number; createdAt: string }>>({
    queryKey: ["admin-tokens"],
    queryFn: () => api.admin.infra.tokens() as Promise<Array<{ id: string; userId: string; userEmail: string; agent: string; model: string; tokens: number; createdAt: string }>>,
  });

  const filtered = useMemo(() => events.filter((e) =>
    (!userFilter || e.userEmail.toLowerCase().includes(userFilter.toLowerCase())) &&
    (!agentFilter || e.agent === agentFilter)
  ), [events, userFilter, agentFilter]);

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
      <AdminPageHeader title="Token usage" description={`${total.toLocaleString()} tokens across ${filtered.length} events`} />
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
          <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filter by user email…"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-cyan/50" />
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
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bucketed}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: "rgba(20,25,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="tokens" stroke="oklch(0.82 0.16 210)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.82 0.16 210)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass overflow-hidden rounded-2xl">
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
              {filtered.slice(0, 100).map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{e.userEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan">{e.agent}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.model}</td>
                  <td className="px-4 py-3 text-right">{e.tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
