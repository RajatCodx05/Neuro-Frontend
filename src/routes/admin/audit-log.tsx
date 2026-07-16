import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/audit-log")({
  head: () => ({ meta: [{ title: "Admin · Audit log — NeuroSearch AI" }] }),
  component: AuditLogPage,
});

function AuditLogPage() {
  const [q, setQ] = useState("");
  const { data: rows = [] } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => api.admin.auditLog.list(500), // TODO: confirm Node path, limit 500 preserved
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.action, r.target_type, r.target_id, r.admin_id].some((x) => x?.toLowerCase().includes(s)));
  }, [q, rows]);

  return (
    <>
      <AdminPageHeader title="Audit log" description="Every admin action is recorded here" />
      <div className="px-6 py-6 md:px-8">
        <div className="glass mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action, target, admin id…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
        </div>
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Admin</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Target</th>
                <th className="px-4 py-3 text-left">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.admin_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cyan">{r.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.target_type ?? "—"} <span className="font-mono text-xs">{r.target_id ?? ""}</span></td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{JSON.stringify(r.metadata)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
