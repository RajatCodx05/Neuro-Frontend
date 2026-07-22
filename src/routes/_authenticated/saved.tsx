import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, FolderOpen, Plus, Trash2, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api, type SavedDataset, type Collection } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saved")({
  component: SavedPage,
});

type Snap = { name?: string; repo?: string; modality?: string; description?: string };
type ColItem = { id: string; savedDatasetId: { id: string; datasetId: string; datasetSnapshot: Snap } };

const LIMIT = 30;

function SavedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"saved" | "collections">("saved");
  const [saved, setSaved] = useState<SavedDataset[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  // collection detail state
  const [openCol, setOpenCol] = useState<Collection | null>(null);
  const [colItems, setColItems] = useState<ColItem[]>([]);
  const [colLoading, setColLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null); // savedDataset id being added

  const load = async () => {
    if (!user) return;
    const [s, c] = await Promise.all([api.savedDatasets.list(), api.collections.list()]);
    setSaved(s ?? []);
    setCollections(c ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const removeSaved = async (id: string) => {
    try {
      await api.savedDatasets.delete(id);
      setSaved((v) => v.filter((s) => s.id !== id));
      // also remove from open collection view if present
      setColItems((v) => v.filter((ci) => {
        const sdId = String((ci.savedDatasetId as Record<string, unknown>)?._id ?? ci.savedDatasetId);
        return sdId !== id;
      }));
      toast.success("Removed from saved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to remove"); }
  };

  const addCollection = async () => {
    if (!newName.trim() || !user) return;
    try {
      const data = await api.collections.create(newName.trim());
      setCollections((v) => [data, ...v]);
      setNewName("");
      toast.success("Collection created");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create collection"); }
  };

  const removeCollection = async (id: string) => {
    try {
      await api.collections.delete(id);
      setCollections((v) => v.filter((c) => c.id !== id));
      if (openCol?.id === id) setOpenCol(null);
      toast.success("Collection deleted");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
  };

  const openCollection = async (col: Collection) => {
    setOpenCol(col);
    setColLoading(true);
    try {
      const items = await api.collections.getItems(col.id);
      setColItems(items as ColItem[]);
    } catch { toast.error("Failed to load collection"); }
    finally { setColLoading(false); }
  };

  const addToCollection = async (savedDatasetId: string) => {
    if (!openCol) return;
    setAdding(savedDatasetId);
    try {
      await api.collections.addItem(openCol.id, savedDatasetId);
      // reload items
      const items = await api.collections.getItems(openCol.id);
      setColItems(items as ColItem[]);
      // bump itemCount on collection list
      setCollections((v) => v.map((c) => c.id === openCol.id ? { ...c, itemCount: (c.itemCount ?? 0) + 1 } : c));
      toast.success("Added to collection");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Already in collection"); }
    finally { setAdding(null); }
  };

  const removeFromCollection = async (savedDatasetId: string) => {
    if (!openCol) return;
    try {
      await api.collections.removeItem(openCol.id, savedDatasetId);
      setColItems((v) => v.filter((ci) => ci.savedDatasetId.id !== savedDatasetId));
      setCollections((v) => v.map((c) => c.id === openCol.id ? { ...c, itemCount: Math.max(0, (c.itemCount ?? 1) - 1) } : c));
      toast.success("Removed from collection");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to remove"); }
  };

  // which saved datasets are already in the open collection
  const inCollection = new Set(colItems.map((ci) => ci.savedDatasetId.id));

  // ── Collection Detail Panel ─────────────────────────────────────────
  if (openCol) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <button onClick={() => setOpenCol(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-3 w-3" /> Back to Collections
          </button>
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="h-6 w-6 text-cyan" />
            <h1 className="font-display text-2xl font-semibold">{openCol.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Datasets in this collection · Add from your saved list below.</p>

          {/* Items already in collection */}
          {colLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : colItems.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Collection is empty" description="Add saved datasets below to organise them here." />
          ) : (
            <div className="space-y-3 mb-8">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">In this collection</p>
              {colItems.map((ci) => {
                const sd = ci.savedDatasetId;
                const snap = sd.datasetSnapshot;
                return (
                  <div key={ci.id} className="glass card-elevated flex items-start gap-4 rounded-2xl p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 text-xs font-bold text-white">
                      {(snap.modality ?? "DS").toString().slice(0, 4)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{snap.repo ?? "Dataset"}</div>
                      <Link to="/dataset/$id" params={{ id: sd.datasetId }} className="mt-0.5 block font-display text-sm font-semibold hover:text-cyan">
                        {snap.name ?? sd.datasetId}
                      </Link>
                      {snap.description && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{snap.description}</p>}
                    </div>
                    <button onClick={() => removeFromCollection(sd.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5 shrink-0">
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Saved datasets to add */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Add from saved datasets</p>
            {saved.length === 0 ? (
              <div className="text-sm text-muted-foreground">No saved datasets yet.</div>
            ) : saved.map((s) => {
              const snap = s.dataset_snapshot as Snap;
              const already = inCollection.has(s.id);
              return (
                <div key={s.id} className="glass flex items-start gap-4 rounded-2xl p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/20 to-neural/20 text-xs font-bold text-white">
                    {(snap.modality ?? "DS").toString().slice(0, 4)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">{snap.name ?? s.dataset_id}</p>
                    {snap.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{snap.description}</p>}
                  </div>
                  {already ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 px-3 py-1.5 text-xs text-cyan shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Added
                    </span>
                  ) : (
                    <button onClick={() => addToCollection(s.id)} disabled={adding === s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3 py-1.5 text-xs font-medium text-[oklch(0.15_0.03_258)] disabled:opacity-50 shrink-0">
                      {adding === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Main Saved & Collections Page ───────────────────────────────────
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Saved &amp; Collections</h1>
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
            {/* Limit indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{saved.length} / {LIMIT} saved</span>
              {saved.length >= LIMIT && <span className="text-amber-400">Limit reached — remove a dataset to save more</span>}
            </div>
            {saved.length === 0 ? (
              <EmptyState icon={Bookmark} title="No saved datasets yet"
                description="Bookmark datasets from search results and detail pages to find them here." />
            ) : saved.map((s) => {
              const snap = s.dataset_snapshot as Snap;
              return (
                <div key={s.id} className="glass card-elevated flex items-start gap-4 rounded-2xl p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 text-xs font-bold text-white">
                    {(snap.modality ?? "DS").toString().slice(0, 4)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{snap.repo ?? "Dataset"} · {s.dataset_id.slice(0, 16)}…</div>
                    <Link to="/dataset/$id" params={{ id: s.dataset_id }} className="mt-0.5 block font-display text-base font-semibold hover:text-cyan">
                      {snap.name ?? s.dataset_id}
                    </Link>
                    {snap.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{snap.description}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to="/dataset/$id" params={{ id: s.dataset_id }}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5">
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button onClick={() => removeSaved(s.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/5">
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
                  onKeyDown={(e) => e.key === "Enter" && addCollection()}
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
                  <div key={c.id} className="glass card-elevated rounded-2xl p-5 cursor-pointer hover:border-cyan/20 border border-transparent transition-colors"
                    onClick={() => openCollection(c)}>
                    <div className="flex items-start justify-between">
                      <FolderOpen className="h-5 w-5 text-cyan" />
                      <button onClick={(e) => { e.stopPropagation(); void removeCollection(c.id); }} className="text-muted-foreground hover:text-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 font-display text-base font-semibold">{c.name}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {c.itemCount != null ? `${c.itemCount} dataset${c.itemCount !== 1 ? "s" : ""} · ` : ""}
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </div>
                    <div className="mt-3 text-xs text-cyan/70">Click to open →</div>
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
