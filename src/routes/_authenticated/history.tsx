import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Trash2, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Item = { id: string; query: string; created_at: string };

const PAGE_SIZE = 10;

function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.searchHistory
      .list()
      .then((data) => { setItems(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [items.length, page, totalPages]);

  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const clearAll = async () => {
    if (!user) return;
    await api.searchHistory.clearAll();
    setItems([]);
    setPage(0);
    toast.success("History cleared");
  };

  const remove = async (id: string) => {
    await api.searchHistory.deleteOne(id);
    setItems((v) => v.filter((i) => i.id !== id));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">History</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your recent searches.</p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{page + 1}/{totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 glass card-elevated rounded-2xl">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-3 font-display text-lg font-semibold">No searches yet</div>
              <p className="mt-1 text-sm text-muted-foreground">Your recent queries will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {pageItems.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <button
                    onClick={() => navigate({ to: "/search", search: { q: i.query } as never })}
                    className="flex-1 truncate text-left text-sm hover:text-cyan">
                    {i.query}
                  </button>
                  <span className="text-[11px] text-muted-foreground">{new Date(i.created_at).toLocaleString()}</span>
                  <button onClick={() => remove(i.id)} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-white/5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => navigate({ to: "/search", search: { q: i.query } as never })}
                    className="grid h-7 w-7 place-items-center rounded-lg text-cyan hover:bg-white/5">
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
