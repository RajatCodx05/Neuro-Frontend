import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Trash2, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Admin · Announcements — NeuroSearch AI" }] }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" rows={4}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50" />
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
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-base font-semibold">{a.title}</div>
                    {a.active
                      ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald-400">Active</span>
                      : <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Draft</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={a.active} onChange={(e) => toggle(a.id, e.target.checked)}
                      className="h-4 w-8 appearance-none rounded-full bg-white/10 checked:bg-cyan" />
                    Live
                  </label>
                  <button onClick={() => remove(a.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-rose-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">No announcements yet.</div>}
        </div>
      </div>
    </>
  );
}
