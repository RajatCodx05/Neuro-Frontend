import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Admin · Agent activity — NeuroSearch AI" }] }),
  component: AgentsPage,
});

const AGENTS_PAGE_SIZE = 15;

type AgentEvent = { id: string; agent: string; query: string; durationMs: number; resultCount: number; status: string; createdAt: string };

function AgentsPage() {
  const [page, setPage] = useState(1);
  const { data = [] } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => api.admin.infra.agents() as Promise<AgentEvent[]>,
  });

  const totalPages = Math.max(1, Math.ceil(data.length / AGENTS_PAGE_SIZE));
  const paged = data.slice((page - 1) * AGENTS_PAGE_SIZE, page * AGENTS_PAGE_SIZE);

  return (
    <>
      <AdminPageHeader title="Agent activity" description="Trace log across the Fallback, Search Provider and Link Verifier agents" />
      <div className="px-6 py-6 md:px-8">
        <div className="glass overflow-hidden rounded-2xl">
          {/* Pagination header — top right */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-b border-white/5 [.light_&]:border-black/5 px-4 py-3">
              <span className="mr-1 text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5 [.light_&]:border-black/5">
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Query</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-right">Results</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
              {paged.map((e: AgentEvent) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-mono text-xs text-cyan">{e.agent}</td>
                  <td className="px-4 py-3 truncate max-w-xs">{e.query}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{e.durationMs}ms</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{e.resultCount}</td>
                  <td className={`px-4 py-3 ${e.status === "success" ? "text-emerald-500 [.light_&]:text-emerald-600" : "text-rose-500 [.light_&]:text-rose-600"}`}>{e.status}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString()}</td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No agent activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
