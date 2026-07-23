import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Shield, RefreshCw, Mail, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/audit-log")({
  head: () => ({ meta: [{ title: "Admin · Audit log — NeuroSearch AI" }] }),
  component: AuditLogPage,
});

type AuditRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  adminId: { _id: string; name: string; email: string } | string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
};

const POLL_INTERVAL = 5_000; // 5 seconds

function AuditLogPage() {
  const [q, setQ] = useState("");
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number>(0);

  const { data: rows = [] } = useQuery({
    queryKey: ["audit-log"],
    queryFn: () => api.admin.auditLog.list(500) as Promise<AuditRow[]>,
    refetchInterval: paused ? false : POLL_INTERVAL,
  });

  const { data: admins = [] } = useQuery({
    queryKey: ["admin-admins"],
    queryFn: () => api.admin.getAdmins() as Promise<AdminUser[]>,
  });

  // Pause polling when user is scrolling the table
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const onScroll = () => {
      setPaused(true);
      clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(() => setPaused(false), 2000);
    };
    el.addEventListener("scroll", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimer.current);
    };
  }, []);

  const adminName = (r: AuditRow) => {
    if (typeof r.adminId === "object" && r.adminId) return r.adminId.name || r.adminId.email;
    return String(r.adminId ?? "—").slice(0, 8);
  };

  const adminEmail = (r: AuditRow) => {
    if (typeof r.adminId === "object" && r.adminId) return r.adminId.email;
    return "—";
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const id = typeof r.adminId === "object" ? `${r.adminId.name} ${r.adminId.email}` : String(r.adminId);
      return [r.action, r.target_type, r.target_id, id].some((x) => x?.toLowerCase().includes(s));
    });
  }, [q, rows]);

  return (
    <>
      <AdminPageHeader title="Audit log" description="Every admin action is recorded here in real-time" />
      <div className="px-6 py-6 md:px-8">
        {/* Admin Accounts Card */}
        <button onClick={() => setAdminDialogOpen(true)}
          className="glass mb-5 flex w-full items-center gap-4 rounded-2xl p-5 transition-colors hover:border-cyan/30 hover:bg-white/[0.03] border border-transparent text-left">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan/30 to-blue-600/30">
            <Shield className="h-6 w-6 text-cyan" />
          </span>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Admin Accounts</div>
            <div className="mt-1 font-display text-3xl font-semibold">{admins.length}</div>
          </div>
          <span className="text-xs text-cyan/70">Click to view details →</span>
        </button>

        {/* Admin Details Dialog */}
        <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Admin Accounts ({admins.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {admins.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No admin accounts found.</div>
              ) : (
                admins.map((a) => (
                  <div key={a._id} className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan/40 to-blue-600/40 text-xs font-semibold text-white">
                      {(a.name || a.email)[0].toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{a.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Auto-refresh indicator */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className={`h-3 w-3 ${paused ? "" : "animate-spin"}`} />
            {paused ? "Updates paused — scroll stopped" : "Live — auto-refreshing every 5s"}
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
        </div>

        {/* Search */}
        <div className="glass mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by action, target, admin name or email…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
        </div>

        {/* Audit Log Table */}
        <div className="glass overflow-hidden rounded-2xl" ref={tableRef}>
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
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan/20 text-[9px] font-semibold text-cyan">
                        {adminName(r)[0].toUpperCase()}
                      </span>
                      <span className="text-sm">{adminName(r)}</span>
                    </span>
                  </td>
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
