import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Admin · Agent activity — NeuroSearch AI" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const { data = [] } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => api.admin.infra.agents(), // TODO: confirm Node path /admin/agents
  });

  return (
    <>
      <AdminPageHeader title="Agent activity" description="Trace log across the Fallback, Search Provider and Link Verifier agents" />
      <div className="px-6 py-6 md:px-8">
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Query</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-right">Results</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((e: { id: string; agent: string; query: string; durationMs: number; resultCount: number; status: string; createdAt: string }) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-mono text-xs text-cyan">{e.agent}</td>
                  <td className="px-4 py-3 truncate">{e.query}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{e.durationMs}ms</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{e.resultCount}</td>
                  <td className={`px-4 py-3 ${e.status === "success" ? "text-emerald-400" : "text-rose-400"}`}>{e.status}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
