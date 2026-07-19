import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Search, Trash2, Shield, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Admin · Users — NeuroSearch AI" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.admin.users.list(),
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      [u.full_name, u.email, u.institute].some((x) => x?.toLowerCase().includes(s))
    );
  }, [q, users]);

  // PATCH /admin/users/:id does not exist on the backend — only DELETE is available.
  // Toggle suspend/promote handlers removed as there is no backend route for them.
  const remove = async (id: string) => {
    if (!confirm("Permanently delete this user?")) return;
    try {
      await api.admin.users.delete(id);
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Action failed"); }
  };

  return (
    <>
      <AdminPageHeader title="User management" description={`${users.length} accounts`} />
      <div className="px-6 py-6 md:px-8">
        <div className="glass mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, institute…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
        </div>
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Institute</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.role ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.institute ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {u.is_admin && <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-cyan">Admin</span>}
                      {u.suspended && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-rose-400">Suspended</span>}
                      {!u.is_admin && !u.suspended && <span className="text-xs text-muted-foreground">Active</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <span title={u.is_admin ? "Is admin" : "Not admin"}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground cursor-default">
                        <Shield className={`h-4 w-4 ${u.is_admin ? "text-cyan" : ""}`} />
                      </span>
                      <span title={u.suspended ? "Suspended" : "Active"}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground cursor-default">
                        {u.suspended ? <Ban className="h-4 w-4 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      </span>
                      <button onClick={() => remove(u.id)} title="Delete"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-rose-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No users match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
