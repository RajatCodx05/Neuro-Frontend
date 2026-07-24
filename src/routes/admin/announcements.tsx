import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Switch } from "@/components/ui/switch";
import { Trash2, Send, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Admin · Announcements — NeuroSearch AI" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.admin.announcements.list() as Promise<Array<{ id: string; title: string; body: string; active: boolean; created_at: string }>>,
  });

  const publish = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      await api.admin.announcements.create({ title: title.trim(), body: body.trim(), active: true });
      setTitle(""); setBody("");
      toast.success("Announcement published");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const startEdit = (a: { id: string; title: string; body: string }) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditBody(a.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim() || !editBody.trim()) return;
    try {
      await (api.admin.announcements as any).update(id, { title: editTitle.trim(), body: editBody.trim() });
      toast.success("Announcement updated");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update"); }
  };

  const toggle = async (id: string, active: boolean) => {
    await api.admin.announcements.toggle(id, active);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete announcement?")) return;
    await api.admin.announcements.delete(id);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  return (
    <>
      <AdminPageHeader title="Announcements" description="Compose messages shown to all users" />
      <div className="space-y-6 px-6 py-6 md:px-8">
        <div className="glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Compose</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            className="mt-3 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" rows={4}
            className="mt-3 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
          <div className="mt-3 flex justify-end">
            <button onClick={publish}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
              <Send className="h-4 w-4" /> Publish
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-5">
              {editingId === a.id ? (
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-widest text-cyan font-medium">Edit Announcement</div>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title"
                    className="w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Body" rows={3}
                    className="w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 [.light_&]:border-black/15 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5 [.light_&]:hover:bg-black/5">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button onClick={() => saveEdit(a.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-cyan px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_258)]">
                      <Check className="h-3.5 w-3.5" /> Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-display text-base font-semibold">{a.title}</div>
                      {a.active
                        ? <span className="rounded-full bg-emerald-500/15 [.light_&]:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-400 [.light_&]:text-emerald-700">Active</span>
                        : <span className="rounded-full bg-white/5 [.light_&]:bg-black/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Draft</span>}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
                    <div className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch checked={a.active} onCheckedChange={(checked) => toggle(a.id, checked)} />
                      <span>Live</span>
                    </div>
                    <button onClick={() => startEdit(a)} title="Edit announcement"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-cyan">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(a.id)} title="Delete announcement"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-rose-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No announcements yet.</div>}
        </div>
      </div>
    </>
  );
}
