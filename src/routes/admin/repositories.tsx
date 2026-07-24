import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/repositories")({
  head: () => ({ meta: [{ title: "Admin · Repositories — NeuroSearch AI" }] }),
  component: RepositoriesPage,
});

const TIERS = ["open", "registered", "restricted"] as const;

function RepositoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("open");
  const [endpoint, setEndpoint] = useState("");

  const { data: repos = [] } = useQuery({
    queryKey: ["admin-repos"],
    queryFn: () => api.admin.repositories.list() as Promise<Array<{ id: string; name: string; trust_tier: string; sync_status: string; dataset_count: number; last_sync_at: string }>>,
  });

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.admin.repositories.create({
        name: name.trim(), trust_tier: tier, endpoint_config: endpoint ? { url: endpoint.trim() } : {},
      });
      setName(""); setEndpoint("");
      toast.success("Repository added");
      qc.invalidateQueries({ queryKey: ["admin-repos"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const resync = async (id: string) => {
    try {
      await api.admin.repositories.resync(id);
      toast.success("Resync triggered");
      qc.invalidateQueries({ queryKey: ["admin-repos"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this repository?")) return;
    try {
      await api.admin.repositories.delete(id);
      qc.invalidateQueries({ queryKey: ["admin-repos"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <>
      <AdminPageHeader title="Repository management" description="Data sources indexed by the platform" />
      <div className="space-y-6 px-6 py-6 md:px-8">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Add repository</div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr,1fr,180px,auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. OpenNeuro)"
              className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="Endpoint URL (optional)"
              className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
            <select value={tier} onChange={(e) => setTier(e.target.value as never)}
              className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50">
              {TIERS.map((t) => <option key={t} value={t} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">{t}</option>)}
            </select>
            <button onClick={add}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5 [.light_&]:border-black/5">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Trust tier</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Datasets</th>
                <th className="px-4 py-3 text-left">Last sync</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
              {repos.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.trust_tier}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${
                      r.sync_status === "online" ? "text-emerald-500 [.light_&]:text-emerald-600" : r.sync_status === "syncing" ? "text-amber-500 [.light_&]:text-amber-600" : "text-rose-500 [.light_&]:text-rose-600"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {r.sync_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.dataset_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.last_sync_at ? new Date(r.last_sync_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => resync(r.id)} title="Resync now"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-cyan">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(r.id)} title="Remove"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5 hover:text-rose-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {repos.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No repositories yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
