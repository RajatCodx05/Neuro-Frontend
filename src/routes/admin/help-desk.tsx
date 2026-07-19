import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/help-desk")({
  head: () => ({ meta: [{ title: "Admin · Help desk — NeuroSearch AI" }] }),
  component: HelpDeskPage,
});

type Tab = "tickets" | "articles";

function HelpDeskPage() {
  const [tab, setTab] = useState<Tab>("tickets");
  const qc = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => api.admin.helpDesk.tickets() as Promise<Array<{ id: string; subject: string; message: string; status: string; created_at: string }>>,
  });
  const { data: articles = [] } = useQuery({
    queryKey: ["help-articles"],
    queryFn: () => api.admin.helpDesk.articles() as Promise<Array<{ id: string; title: string; slug: string; published: boolean; updated_at: string }>>,
  });

  const setTicketStatus = async (id: string, status: "open" | "in_progress" | "resolved") => {
    const patchData = { status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) };
    await api.admin.helpDesk.updateTicket(id, patchData);
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const addArticle = async () => {
    if (!title.trim() || !slug.trim() || !body.trim()) return;
    try {
      await api.admin.helpDesk.createArticle({ title, slug, body, published });
      setTitle(""); setSlug(""); setBody("");
      qc.invalidateQueries({ queryKey: ["help-articles"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };
  const removeArticle = async (id: string) => {
    if (!confirm("Delete article?")) return;
    await api.admin.helpDesk.deleteArticle(id);
    qc.invalidateQueries({ queryKey: ["help-articles"] });
  };

  return (
    <>
      <AdminPageHeader title="Help desk" description="User support tickets and help center articles" />
      <div className="px-6 py-6 md:px-8">
        <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
          <button onClick={() => setTab("tickets")} className={`rounded-full px-4 py-1.5 ${tab === "tickets" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
            Support tickets <span className="ml-1 rounded-full bg-cyan/20 px-1.5 py-0.5 text-[10px] text-cyan">{tickets.filter((t) => t.status !== "resolved").length}</span>
          </button>
          <button onClick={() => setTab("articles")} className={`rounded-full px-4 py-1.5 ${tab === "articles" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
            Help articles
          </button>
        </div>

        {tab === "tickets" && (
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.subject}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground line-clamp-2 max-w-md">{t.message}</td>
                    <td className="px-4 py-3">
                      <select value={t.status} onChange={(e) => setTicketStatus(t.id, e.target.value as never)}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none">
                        <option value="open">open</option>
                        <option value="in_progress">in progress</option>
                        <option value="resolved">resolved</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {tickets.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-sm text-muted-foreground">No tickets yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "articles" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">New article</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50" />
                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug-in-url"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50" />
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (Markdown)" rows={5}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50" />
              <div className="mt-3 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
                    className="h-4 w-8 appearance-none rounded-full bg-white/10 checked:bg-cyan" />
                  Publish immediately
                </label>
                <button onClick={addArticle}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
                  <Plus className="h-4 w-4" /> Add article
                </button>
              </div>
            </div>

            <div className="glass overflow-hidden rounded-2xl">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Slug</th>
                    <th className="px-4 py-3 text-left">Published</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {articles.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium">{a.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.slug}</td>
                      <td className="px-4 py-3">{a.published ? <span className="text-emerald-400">yes</span> : <span className="text-muted-foreground">draft</span>}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.updated_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeArticle(a.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-rose-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {articles.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No articles yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
