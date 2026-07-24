import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Plus, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/help-desk")({
  head: () => ({ meta: [{ title: "Admin · Help desk — NeuroSearch AI" }] }),
  component: HelpDeskPage,
});

type Tab = "tickets" | "articles";
type Ticket = { id: string; subject: string; message: string; status: string; created_at: string; email?: string; name?: string; source?: string };
type TicketResp = { tickets: Ticket[]; total: number; page: number; limit: number };

const PAGE_SIZE = 10;

function HelpDeskPage() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data: ticketResp } = useQuery({
    queryKey: ["support-tickets", page],
    queryFn: () => api.admin.helpDesk.tickets(page) as Promise<TicketResp>,
  });

  const tickets = ticketResp?.tickets ?? [];
  const totalTickets = ticketResp?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTickets / PAGE_SIZE));

  const { data: articles = [] } = useQuery({
    queryKey: ["help-articles"],
    queryFn: () => api.admin.helpDesk.articles() as Promise<Array<{ id: string; title: string; slug: string; published: boolean; updated_at: string }>>,
  });

  const setTicketStatus = async (id: string, status: "open" | "in_progress" | "resolved") => {
    const patchData = { status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) };
    await api.admin.helpDesk.updateTicket(id, patchData);
    qc.invalidateQueries({ queryKey: ["support-tickets", page] });
  };

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
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
        <div className="mb-4 inline-flex rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] p-1 text-sm">
          <button onClick={() => { setTab("tickets"); setPage(1); }} className={`rounded-full px-4 py-1.5 ${tab === "tickets" ? "bg-white/10 [.light_&]:bg-black/10 text-foreground font-medium" : "text-muted-foreground"}`}>
            Support tickets <span className="ml-1 rounded-full bg-cyan/20 px-1.5 py-0.5 text-[10px] text-cyan">{tickets.filter((t) => t.status !== "resolved").length}</span>
          </button>
          <button onClick={() => setTab("articles")} className={`rounded-full px-4 py-1.5 ${tab === "articles" ? "bg-white/10 [.light_&]:bg-black/10 text-foreground font-medium" : "text-muted-foreground"}`}>
            Help articles
          </button>
        </div>

        {/* Ticket detail modal */}
        {selectedTicket && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/60 p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="glass relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Red close button — top right */}
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-rose-500/20 text-rose-400 transition hover:bg-rose-500/30 hover:text-rose-300"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Subject */}
              <h2 className="pr-10 text-lg font-semibold text-foreground">{selectedTicket.subject}</h2>

              {/* User info */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {selectedTicket.name && <span className="font-medium text-foreground">{selectedTicket.name}</span>}
                {selectedTicket.email && <span>{selectedTicket.email}</span>}
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    selectedTicket.status === "open" ? "bg-amber-400" :
                    selectedTicket.status === "in_progress" ? "bg-blue-400" : "bg-emerald-400"
                  }`} />
                  {selectedTicket.status.replace("_", " ")}
                </span>
                <span>Received {new Date(selectedTicket.created_at).toLocaleString()}</span>
              </div>

              {/* Full message */}
              <div className="mt-5 whitespace-pre-wrap rounded-xl border border-white/10 [.light_&]:border-black/10 bg-white/[0.03] [.light_&]:bg-black/[0.02] p-4 text-sm text-foreground/90 leading-relaxed">
                {selectedTicket.message}
              </div>

              {/* Status change */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Update status:</span>
                <select value={selectedTicket.status} onChange={(e) => {
                  setTicketStatus(selectedTicket.id, e.target.value as never);
                  setSelectedTicket({ ...selectedTicket, status: e.target.value });
                }}
                  className="rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-1.5 text-xs text-foreground outline-none cursor-pointer">
                  <option value="open" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">open</option>
                  <option value="in_progress" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">in progress</option>
                  <option value="resolved" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">resolved</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div className="glass overflow-hidden rounded-2xl">
            {/* Pagination header — top right when tickets exceed page size */}
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
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Message</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
                {tickets.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedTicket(t)}
                    className="cursor-pointer transition hover:bg-white/[0.03] [.light_&]:hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-medium">{t.subject}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.name ? <span className="font-medium text-foreground">{t.name}</span> : null}
                      {t.email ? <span className={t.name ? "block opacity-70" : ""}>{t.email}</span> : null}
                      {!t.name && !t.email ? <span className="italic opacity-50">—</span> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground line-clamp-2 max-w-md">{t.message}</td>
                    <td className="px-4 py-3">
                      <span onClick={(e) => e.stopPropagation()}>
                        <select value={t.status} onChange={(e) => setTicketStatus(t.id, e.target.value as never)}
                          className="rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-2 py-1 text-xs text-foreground outline-none cursor-pointer">
                          <option value="open" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">open</option>
                          <option value="in_progress" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">in progress</option>
                          <option value="resolved" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">resolved</option>
                        </select>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {tickets.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No tickets yet.</td></tr>}
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
                  className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug-in-url"
                  className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body (Markdown)" rows={5}
                className="mt-3 w-full rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-cyan/50" />
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
                  <tr className="border-b border-white/5 [.light_&]:border-black/5">
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Slug</th>
                    <th className="px-4 py-3 text-left">Published</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
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
