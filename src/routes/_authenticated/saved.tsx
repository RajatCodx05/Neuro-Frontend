import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, FolderOpen, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saved")({
  component: SavedPage,
});

type Saved = { id: string; dataset_id: string; dataset_snapshot: Record<string, unknown>; created_at: string };
type Collection = { id: string; name: string; created_at: string };

function SavedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"saved" | "collections">("saved");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [s, c] = await Promise.all([
      api.savedDatasets.list(),
      api.collections.list(),
    ]);
    setSaved(s ?? []);
    setCollections(c ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const removeSaved = async (id: string) => {
    await api.savedDatasets.delete(id);
    setSaved((v) => v.filter((s) => s.id !== id));
    toast.success("Removed");
  };

  const addCollection = async () => {
    if (!newName.trim() || !user) return;
    try {
      const data = await api.collections.create(newName.trim());
      setCollections((v) => [data, ...v]);
      setNewName("");
      toast.success("Collection created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create collection");
    }
  };

  const removeCollection = async (id: string) => {
    await api.collections.delete(id);
    setCollections((v) => v.filter((c) => c.id !== id));
    toast.success("Collection deleted");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Saved & Collections</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your bookmarked datasets and folders.</p>
          </div>
        </div>

        <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
          <button onClick={() => setTab("saved")}
            className={`rounded-full px-4 py-1.5 ${tab === "saved" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
            <Bookmark className="mr-1.5 inline h-3.5 w-3.5" />Saved datasets
          </button>
          <button onClick={() => setTab("collections")}
            className={`rounded-full px-4 py-1.5 ${tab === "collections" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}>
            <FolderOpen className="mr-1.5 inline h-3.5 w-3.5" />Collections
          </button>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : tab === "saved" ? (
          <div className="mt-6 space-y-3">
            {saved.length === 0 ? (
              <EmptyState icon={Bookmark} title="No saved datasets yet"
                description="Bookmark datasets from search results and detail pages to find them here." />
            ) : saved.map((s) => {
              const snap = s.dataset_snapshot as { name?: string; repo?: string; modality?: string; description?: string };
              return (
                <div key={s.id} className="glass card-elevated flex items-start gap-4 rounded-2xl p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 text-xs font-bold text-white">
                    {snap.modality ?? "DS"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{snap.repo ?? "Dataset"} · {s.dataset_id}</div>
                    <Link to="/dataset/$id" params={{ id: s.dataset_id }} className="mt-0.5 block font-display text-base font-semibold hover:text-cyan">
                      {snap.name ?? s.dataset_id}
                    </Link>
                    {snap.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{snap.description}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to="/dataset/$id" params={{ id: s.dataset_id }} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button onClick={() => removeSaved(s.id)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5">
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="New collection name…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan/50" />
                <button onClick={addCollection}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-4 py-2 text-sm font-medium text-[oklch(0.15_0.03_258)]">
                  <Plus className="h-3.5 w-3.5" /> Create
                </button>
              </div>
            </div>
            {collections.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No collections yet"
                description="Create folders to group your saved datasets by topic or project." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((c) => (
                  <div key={c.id} className="glass card-elevated rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                      <FolderOpen className="h-5 w-5 text-cyan" />
                      <button onClick={() => removeCollection(c.id)} className="text-muted-foreground hover:text-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 font-display text-base font-semibold">{c.name}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Created {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Bookmark; title: string; description: string }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <div className="mt-3 font-display text-lg font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
