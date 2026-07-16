import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Trash2, Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Item = { id: string; query: string; created_at: string };

function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.searchHistory
      .list() // Node returns ordered desc, limit 100 by default
      .then((data) => { setItems(data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const clearAll = async () => {
    if (!user) return;
    await api.searchHistory.clearAll();
    setItems([]);
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
            <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
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
              {items.map((i) => (
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
