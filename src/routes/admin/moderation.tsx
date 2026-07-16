import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({ meta: [{ title: "Admin · Moderation — NeuroSearch AI" }] }),
  component: ModerationPage,
});

type Tab = "queue" | "published";

function ModerationPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const qc = useQueryClient();

  const { data: queue = [] } = useQuery({
    queryKey: ["mod-queue"],
    queryFn: () => api.admin.moderation.queue(), // TODO: confirm Node path
  });
  const { data: published = [] } = useQuery({
    queryKey: ["mod-published"],
    queryFn: () => api.admin.moderation.published() as Promise<Array<{ id: string; dataset_id: string; dataset_snapshot: Record<string, unknown>; created_at: string }>>, // TODO: confirm Node path
  });

  const act = async (id: string, action: "approve" | "reject", reason?: string) => {
    try {
      if (action === "approve") await api.admin.moderation.approve(id); // TODO: confirm Node path
      else await api.admin.moderation.reject(id, reason); // TODO: confirm Node path
      toast.success(action === "approve" ? "Approved & published" : "Rejected");
      qc.invalidateQueries({ queryKey: ["mod-queue"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  return (
    <>
      <AdminPageHeader title="Dataset moderation" description="Review community-discovered datasets and manage the catalog" />
      <div className="px-6 py-6 md:px-8">
        <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
          <button onClick={() => setTab("queue")} className={`rounded-full px-4 py-1.5 ${tab === "queue" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
            Review queue <span className="ml-1 rounded-full bg-cyan/20 px-1.5 py-0.5 text-[10px] text-cyan">{queue.length}</span>
          </button>
          <button onClick={() => setTab("published")} className={`rounded-full px-4 py-1.5 ${tab === "published" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
            Published catalog
          </button>
        </div>

        {tab === "queue" && (
          <div className="space-y-3">
            {queue.map((r) => {
              const snap = (r.dataset_snapshot ?? {}) as Record<string, unknown>;
              return (
                <div key={r.id} className="glass card-elevated rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold">{String(snap.title ?? "Untitled dataset")}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        From "{r.source_query ?? "unknown"}" · confidence {r.confidence_score != null ? Number(r.confidence_score).toFixed(2) : "—"} · {new Date(r.discovered_at).toLocaleString()}
                      </div>
                      {snap.description ? <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{String(snap.description)}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => act(r.id, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button onClick={() => { const r2 = prompt("Rejection reason?") || undefined; if (r2 !== undefined) act(r.id, "reject", r2); }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/25">
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {queue.length === 0 && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nothing to review right now.</div>}
          </div>
        )}

        {tab === "published" && (
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left">Dataset</th>
                  <th className="px-4 py-3 text-left">Verified</th>
                  <th className="px-4 py-3 text-left">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {published.map((d) => {
                  const snap = (d.dataset_snapshot ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={d.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{String(snap.title ?? d.dataset_id)}</div>
                        <div className="text-xs text-muted-foreground">{d.dataset_id}</div>
                      </td>
                      <td className="px-4 py-3"><ShieldCheck className="h-4 w-4 text-cyan" /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {published.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-sm text-muted-foreground">No published datasets yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
