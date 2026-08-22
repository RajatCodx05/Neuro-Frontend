import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  ThumbsDown,
  Globe,
  Sparkles,
  Edit3,
  Trash2,
  Archive,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DISLIKE_REASONS } from "@/components/app/DislikeFeedbackModal";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({ meta: [{ title: "Admin · Dataset Moderation — NeuroSearch AI" }] }),
  component: ModerationPage,
});

type Tab = "candidates" | "dislike" | "published";

function ModerationPage() {
  const [tab, setTab] = useState<Tab>("candidates");

  // Pagination states
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [dislikePage, setDislikePage] = useState(1);
  const [publishedPage, setPublishedPage] = useState(1);

  // Dislike filters
  const [dislikeReason, setDislikeReason] = useState<string>("");
  const [minDislikes, setMinDislikes] = useState<number>(1);

  // Detail Modal target datasetId
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  // Hard Delete Modal target
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Manual Add Featured Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const qc = useQueryClient();

  // 1. Popular Candidates Query
  const { data: candidatesData, isLoading: candidatesLoading, refetch: refetchCandidates } = useQuery({
    queryKey: ["mod-candidates", candidatesPage],
    queryFn: () => api.admin.moderation.popularCandidates({ page: candidatesPage, limit: 30 }),
  });

  // 2. Dislike Review Queue Query
  const { data: dislikeData, isLoading: dislikeLoading, refetch: refetchDislike } = useQuery({
    queryKey: ["mod-dislike", dislikeReason, minDislikes, dislikePage],
    queryFn: () =>
      api.admin.moderation.dislikeQueue({
        reason: dislikeReason || undefined,
        minDislikes,
        page: dislikePage,
        limit: 30,
      }),
  });

  // 3. Published Catalog Query
  const { data: publishedData, isLoading: publishedLoading, refetch: refetchPublished } = useQuery({
    queryKey: ["mod-published", publishedPage],
    queryFn: () => api.admin.moderation.publishedCatalog({ page: publishedPage, limit: 30 }),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["mod-candidates"] });
    qc.invalidateQueries({ queryKey: ["mod-dislike"] });
    qc.invalidateQueries({ queryKey: ["mod-published"] });
    toast.success("Moderation data refreshed");
  };

  return (
    <>
      <AdminPageHeader
        title="Dataset Moderation & Curation"
        description="Curate popular datasets, review user dislikes, and manage metadata overrides"
      />

      <div className="px-6 py-6 md:px-8">
        {/* Navigation Tabs & Refresh button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 [.light_&]:border-black/10 pb-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] p-1 text-sm">
            <button
              onClick={() => setTab("candidates")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors ${
                tab === "candidates"
                  ? "bg-amber-500/20 text-amber-300 [.light_&]:bg-amber-500/15 [.light_&]:text-amber-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="h-4 w-4" />
              Popular Candidates
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                {candidatesLoading ? "…" : candidatesData?.pagination?.total ?? 0}
              </span>
            </button>

            <button
              onClick={() => setTab("dislike")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors ${
                tab === "dislike"
                  ? "bg-rose-500/20 text-rose-300 [.light_&]:bg-rose-500/15 [.light_&]:text-rose-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
              Dislike Review
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                {dislikeLoading ? "…" : dislikeData?.pagination?.total ?? 0}
              </span>
            </button>

            <button
              onClick={() => setTab("published")}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors ${
                tab === "published"
                  ? "bg-cyan/20 text-cyan [.light_&]:bg-cyan/15 [.light_&]:text-cyan-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-4 w-4" />
              Published Catalog
              <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-mono text-cyan">
                {publishedLoading ? "…" : publishedData?.pagination?.total ?? 0}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-cyan/20 border border-cyan/40 px-3.5 py-1.5 text-xs font-medium text-cyan hover:bg-cyan/30 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Featured Dataset
            </button>

            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* ── TAB 1: POPULAR CANDIDATES ──────────────────────────────────── */}
        {tab === "candidates" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300 [.light_&]:text-amber-800">
              <span className="font-semibold">Candidate Criteria:</span> Likes ≥ 3 AND Net Score (Likes − Dislikes) &gt; 0. Candidate datasets require admin review and explicit publishing before appearing in the public Popular section.
            </div>

            {candidatesLoading ? (
              <LoadingSkeletonRows />
            ) : !candidatesData?.items?.length ? (
              <EmptyState title="No popular candidates require review" message="Datasets meeting the popularity threshold will automatically appear here." />
            ) : (
              <div className="space-y-3">
                {candidatesData.items.map((item) => (
                  <div key={item.datasetId} className="glass card-elevated rounded-2xl p-5 transition-all">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">{item.canonicalTitle}</h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {item.datasetId}
                          </span>
                          <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan font-mono">
                            {item.repository}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                          <span className="text-emerald-400">Likes: {item.likes}</span>
                          <span className="text-rose-400">Dislikes: {item.dislikes}</span>
                          <span className="font-bold text-amber-400">Net Score: +{item.netScore}</span>
                          {item.species.length > 0 && <span>Species: {item.species.join(", ")}</span>}
                          {item.disease && <span>Disease: {item.disease}</span>}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setSelectedDatasetId(item.datasetId)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Review & Publish
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <PaginationBar
                  page={candidatesPage}
                  totalPages={candidatesData.pagination.totalPages}
                  onPageChange={setCandidatesPage}
                />
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DISLIKE REVIEW ──────────────────────────────────────── */}
        {tab === "dislike" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 [.light_&]:border-black/10 bg-white/[0.02] p-3 text-xs">
              <span className="font-mono uppercase tracking-wider text-muted-foreground">Filters:</span>
              
              <select
                value={dislikeReason}
                onChange={(e) => { setDislikeReason(e.target.value); setDislikePage(1); }}
                className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/5 px-3 py-1.5 text-xs text-foreground focus:outline-none"
              >
                <option value="">All Dislike Reasons</option>
                {DISLIKE_REASONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Min Dislikes:</span>
                <select
                  value={minDislikes}
                  onChange={(e) => { setMinDislikes(Number(e.target.value)); setDislikePage(1); }}
                  className="rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/5 px-3 py-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value={1}>1+ Dislike</option>
                  <option value={2}>2+ Dislikes</option>
                  <option value={5}>5+ Dislikes</option>
                </select>
              </div>
            </div>

            {dislikeLoading ? (
              <LoadingSkeletonRows />
            ) : !dislikeData?.items?.length ? (
              <EmptyState title="No datasets under dislike review" message="Datasets receiving negative user feedback will appear here for audit." />
            ) : (
              <div className="space-y-3">
                {dislikeData.items.map((item) => (
                  <div key={item.datasetId} className="glass card-elevated rounded-2xl p-5 transition-all">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">{item.canonicalTitle}</h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                            {item.datasetId}
                          </span>
                          {item.pendingFeedbackCount > 0 && (
                            <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                              {item.pendingFeedbackCount} Pending Feedback
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                          <span className="text-emerald-400">Likes: {item.likes}</span>
                          <span className="text-rose-400 font-bold">Dislikes: {item.dislikes}</span>
                          <span>Dislike Ratio: {(item.dislikeRatio * 100).toFixed(1)}%</span>
                          <span>Net Score: {item.netScore}</span>
                        </div>

                        {/* Top Reasons Breakdown Chips */}
                        {item.topReasons?.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mr-1">Reasons:</span>
                            {item.topReasons.map((r) => (
                              <span key={r.reason} className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[11px] text-rose-300">
                                {r.reason.replace(/_/g, " ")} ({r.count})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => setSelectedDatasetId(item.datasetId)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-4 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/25 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Review Dislikes
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <PaginationBar
                  page={dislikePage}
                  totalPages={dislikeData.pagination.totalPages}
                  onPageChange={setDislikePage}
                />
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: PUBLISHED CATALOG ───────────────────────────────────── */}
        {tab === "published" && (
          <div className="space-y-4">
            {publishedLoading ? (
              <LoadingSkeletonRows />
            ) : !publishedData?.items?.length ? (
              <EmptyState title="No published datasets yet" message="Promote candidate datasets from the Popular Candidates tab to display them in the catalog." />
            ) : (
              <div className="glass overflow-hidden rounded-2xl border border-white/10 [.light_&]:border-black/10">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 [.light_&]:border-black/10 bg-white/[0.02] uppercase tracking-wider text-muted-foreground font-mono">
                    <tr>
                      <th className="p-4">Order</th>
                      <th className="p-4">Dataset Title / ID</th>
                      <th className="p-4">Repository</th>
                      <th className="p-4">Reactions</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
                    {publishedData.items.map((item) => (
                      <tr key={item.datasetId} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-mono font-bold text-cyan">#{item.displayOrder}</td>
                        <td className="p-4">
                          <div className="font-semibold text-foreground">{item.canonicalTitle}</div>
                          {item.featuredTitleOverride && (
                            <div className="text-[10px] text-amber-300 font-mono">Override: "{item.featuredTitleOverride}"</div>
                          )}
                          <div className="text-[11px] text-muted-foreground font-mono">{item.datasetId}</div>
                        </td>
                        <td className="p-4 font-mono uppercase">{item.repository}</td>
                        <td className="p-4 font-mono">
                          <span className="text-emerald-400">+{item.likes}</span> / <span className="text-rose-400">−{item.dislikes}</span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan/15 border border-cyan/30 px-2.5 py-0.5 text-[10px] font-semibold text-cyan">
                            <ShieldCheck className="h-3 w-3" /> Published
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedDatasetId(item.datasetId)}
                              className="rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit Metadata / Title"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Unpublish dataset "${item.canonicalTitle}"?`)) {
                                  try {
                                    await api.admin.moderation.unpublishPopular(item.datasetId);
                                    toast.success("Dataset unpublished from Popular");
                                    refetchPublished();
                                    refetchCandidates();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Unpublish failed");
                                  }
                                }
                              }}
                              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                            >
                              Unpublish
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Archive dataset "${item.canonicalTitle}"? This hides it from public search.`)) {
                                  try {
                                    await api.admin.moderation.archiveDataset(item.datasetId);
                                    toast.success("Dataset archived");
                                    refetchPublished();
                                    refetchCandidates();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Archive failed");
                                  }
                                }
                              }}
                              className="rounded-full border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-400 hover:bg-amber-500/20 transition-colors"
                              title="Archive Dataset"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: Dataset Detail & Metadata Editor ───────────────────────────── */}
      {selectedDatasetId && (
        <DatasetModerationDetailModal
          datasetId={selectedDatasetId}
          onClose={() => setSelectedDatasetId(null)}
          onHardDeleteTrigger={(id) => {
            setSelectedDatasetId(null);
            setDeleteTargetId(id);
          }}
          onRefresh={refreshAll}
        />
      )}

      {/* ── MODAL: Hard Delete Confirmation ────────────────────────────────────── */}
      {deleteTargetId && (
        <HardDeleteConfirmationModal
          datasetId={deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onSuccess={() => {
            setDeleteTargetId(null);
            refreshAll();
          }}
        />
      )}

      {/* ── MODAL: Manual Add Featured Dataset ──────────────────────────────────── */}
      {isAddModalOpen && (
        <AddFeaturedDatasetModal
          onClose={() => setIsAddModalOpen(false)}
          onRefresh={refreshAll}
        />
      )}
    </>
  );
}

// ── SUBCOMPONENT: Dataset Detail & Metadata Editor Modal ────────────────────

function DatasetModerationDetailModal({
  datasetId,
  onClose,
  onHardDeleteTrigger,
  onRefresh,
}: {
  datasetId: string;
  onClose: () => void;
  onHardDeleteTrigger: (id: string) => void;
  onRefresh: () => void;
}) {
  const [subTab, setSubTab] = useState<"edit" | "feedback">("edit");
  const [isSaving, setIsSaving] = useState(false);

  // Form states for overrides
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [disease, setDisease] = useState("");
  const [region, setRegion] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [modality, setModality] = useState("");
  const [species, setSpecies] = useState("");
  const [tasks, setTasks] = useState("");
  const [subjects, setSubjects] = useState("");
  const [size, setSize] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [studyDesign, setStudyDesign] = useState("");

  // Popular publish fields
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [featuredTitleOverride, setFeaturedTitleOverride] = useState("");

  const { data: detail, isLoading, refetch } = useQuery({
    queryKey: ["mod-detail", datasetId],
    queryFn: async () => {
      const res = await api.admin.moderation.dislikeDetails(datasetId);
      // Initialize form fields with existing override or canonical values
      const d = res.dataset;
      const o = (res.override ?? {}) as Record<string, unknown>;
      setTitle(String(o.title ?? d.title ?? ""));
      setDescription(String(o.description ?? d.description ?? ""));
      setDisease(String(o.disease ?? d.disease ?? ""));
      setRegion(String(o.region ?? d.region ?? ""));
      setAgeGroup(String(o.ageGroup ?? d.ageGroup ?? ""));
      setModality(Array.isArray(o.modality) ? (o.modality as string[]).join(", ") : (d.modality?.join(", ") ?? ""));
      setSpecies(Array.isArray(o.species) ? (o.species as string[]).join(", ") : (d.species?.join(", ") ?? ""));
      setTasks(Array.isArray(o.tasks) ? (o.tasks as string[]).join(", ") : "");
      setSubjects(o.subjects != null ? String(o.subjects) : (d.subjectCount != null ? String(d.subjectCount) : ""));
      setSize(String(o.size ?? ""));
      setPublicationYear(o.publicationYear != null ? String(o.publicationYear) : "");
      setStudyDesign(String(o.studyDesign ?? ""));
      return res;
    },
  });

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parseList = (str: string) => str.split(",").map((s) => s.trim()).filter(Boolean);
      await api.admin.moderation.updateOverride(datasetId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        disease: disease.trim() || undefined,
        region: region.trim() || undefined,
        ageGroup: ageGroup.trim() || undefined,
        modality: modality ? parseList(modality) : undefined,
        species: species ? parseList(species) : undefined,
        tasks: tasks ? parseList(tasks) : undefined,
        subjects: subjects ? Number(subjects) : undefined,
        size: size.trim() || undefined,
        publicationYear: publicationYear ? Number(publicationYear) : undefined,
        studyDesign: studyDesign.trim() || undefined,
      });
      toast.success("Metadata overrides saved!");
      refetch();
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevertOverride = async () => {
    if (confirm("Revert all admin metadata overrides for this dataset? Canonical values will be restored.")) {
      try {
        await api.admin.moderation.deleteOverride(datasetId);
        toast.success("Overrides reverted!");
        refetch();
        onRefresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to revert override");
      }
    }
  };

  const handlePublish = async () => {
    try {
      await api.admin.moderation.publishPopular(datasetId, {
        displayOrder,
        featuredTitleOverride: featuredTitleOverride.trim() || undefined,
      });
      toast.success("Dataset published to Popular!");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="glass card-elevated flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Dataset Moderation & Editor</h2>
            <p className="font-mono text-xs text-muted-foreground">{datasetId}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !detail ? (
          <div className="p-8"><Skeleton className="h-40 w-full rounded-xl" /></div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
            {/* Reaction Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center text-xs font-mono">
              <div>
                <span className="text-muted-foreground block text-[10px]">Likes</span>
                <span className="text-emerald-400 font-bold text-sm">+{detail.reactionSummary.likes}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Dislikes</span>
                <span className="text-rose-400 font-bold text-sm">−{detail.reactionSummary.dislikes}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Dislike Ratio</span>
                <span className="text-amber-400 font-bold text-sm">{(detail.reactionSummary.dislikeRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Net Score</span>
                <span className="text-cyan font-bold text-sm">{detail.reactionSummary.netScore}</span>
              </div>
            </div>

            {/* Subtabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setSubTab("edit")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${subTab === "edit" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              >
                Metadata Editor & Overrides
              </button>
              <button
                onClick={() => setSubTab("feedback")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${subTab === "feedback" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              >
                Dislike Feedback Logs ({detail.feedbackList.length})
              </button>
            </div>

            {/* Subtab 1: Metadata Editor */}
            {subTab === "edit" && (
              <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
                {detail.override && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-300">
                    <span>⚡ Admin metadata override is currently active on this dataset.</span>
                    <button type="button" onClick={handleRevertOverride} className="text-xs underline hover:text-amber-100">Revert Override</button>
                  </div>
                )}

                {/* Immutable Fields Display */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1 font-mono text-[11px] text-muted-foreground">
                  <div><span className="text-foreground">Source Repository:</span> {detail.dataset.source}</div>
                  <div><span className="text-foreground">Canonical Title:</span> {detail.dataset.title}</div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Title Override</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Disease / Condition</label>
                    <input value={disease} onChange={(e) => setDisease(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Modality (comma-separated)</label>
                    <input value={modality} onChange={(e) => setModality(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Species (comma-separated)</label>
                    <input value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Tasks (comma-separated)</label>
                    <input value={tasks} onChange={(e) => setTasks(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Brain Region</label>
                    <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Description Override</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="submit" disabled={isSaving} className="rounded-full bg-cyan/20 border border-cyan/40 px-4 py-2 font-medium text-cyan hover:bg-cyan/30 disabled:opacity-50">
                    {isSaving ? "Saving…" : "Save Metadata Overrides"}
                  </button>
                </div>

                {/* Popular Publish Section */}
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-3">
                  <h4 className="font-semibold text-amber-300">Publish to Popular Section</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-mono text-[10px] text-muted-foreground">Display Order Position</label>
                      <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-foreground" />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[10px] text-muted-foreground">Featured Card Title (optional)</label>
                      <input value={featuredTitleOverride} onChange={(e) => setFeaturedTitleOverride(e.target.value)} placeholder="Custom card headline…" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-foreground" />
                    </div>
                  </div>
                  <button type="button" onClick={handlePublish} className="rounded-full bg-amber-500/20 border border-amber-500/40 px-4 py-2 font-medium text-amber-300 hover:bg-amber-500/30">
                    Publish Dataset to Popular
                  </button>
                </div>

                {/* Destructive Section */}
                <div className="mt-6 border-t border-rose-500/20 pt-4 flex items-center justify-between">
                  <span className="text-rose-400 font-mono">Danger Zone</span>
                  <button
                    type="button"
                    onClick={() => onHardDeleteTrigger(datasetId)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Permanently Delete Dataset
                  </button>
                </div>
              </form>
            )}

            {/* Subtab 2: Dislike Feedback Logs */}
            {subTab === "feedback" && (
              <div className="space-y-3">
                {!detail.feedbackList.length ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">No dislike feedback comments logged for this dataset.</p>
                ) : (
                  detail.feedbackList.map((f) => (
                    <div key={f.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                        <span className="text-rose-400 font-bold uppercase">{f.reason.replace(/_/g, " ")}</span>
                        <span>{new Date(f.createdAt).toLocaleString()} · {f.isAnonymous ? "Anonymous User" : "Registered User"}</span>
                      </div>
                      {f.comment ? (
                        <p className="text-foreground pt-1">"{f.comment}"</p>
                      ) : (
                        <p className="text-muted-foreground italic text-[11px]">(No comment provided)</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SUBCOMPONENT: Hard Delete Confirmation Modal ─────────────────────────────

function HardDeleteConfirmationModal({
  datasetId,
  onClose,
  onSuccess,
}: {
  datasetId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isMatched = confirmInput.trim() === datasetId.trim();

  const handleHardDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched) return;
    setIsDeleting(true);
    try {
      await api.admin.moderation.hardDeleteDataset(datasetId, confirmInput.trim());
      toast.success("Dataset permanently deleted.");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hard delete failed.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
      <div className="glass card-elevated w-full max-w-md rounded-2xl p-6 shadow-2xl border border-rose-500/40">
        <div className="flex items-center gap-3 text-rose-400 mb-3">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <h3 className="font-display text-base font-bold">Permanently Delete Dataset?</h3>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          This action will permanently purge the dataset, its reaction history, curation records, and metadata overrides from MongoDB. <span className="text-rose-400 font-semibold">This operation cannot be undone.</span>
        </p>

        <form onSubmit={handleHardDelete} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground mb-1">
              Type the Dataset ID <span className="font-bold text-foreground font-mono">{datasetId}</span> to confirm:
            </label>
            <input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={datasetId}
              className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-foreground focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isDeleting} className="rounded-full border border-white/10 px-4 py-2 text-muted-foreground hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isMatched || isDeleting}
              className="rounded-full bg-rose-500/20 border border-rose-500/40 px-4 py-2 font-medium text-rose-300 hover:bg-rose-500/30 disabled:opacity-30 transition-colors"
            >
              {isDeleting ? "Deleting…" : "Permanently Delete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── UTILITY SUBCOMPONENTS ───────────────────────────────────────────────────

function PaginationBar({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground font-mono">
      <span>Page {page} of {totalPages}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-full border border-white/10 p-1.5 disabled:opacity-30 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-full border border-white/10 p-1.5 disabled:opacity-30 hover:bg-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="glass rounded-2xl p-12 text-center space-y-2">
      <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{message}</p>
    </div>
  );
}

function LoadingSkeletonRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass card-elevated rounded-2xl p-5 space-y-3">
          <Skeleton className="h-5 w-64 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── SUBCOMPONENT: Add Featured Dataset Modal ─────────────────────────────

function AddFeaturedDatasetModal({
  onClose,
  onRefresh,
}: {
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [step, setStep] = useState<"search" | "review">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for overrides
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [disease, setDisease] = useState("");
  const [region, setRegion] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [modality, setModality] = useState("");
  const [species, setSpecies] = useState("");
  const [tasks, setTasks] = useState("");
  const [subjects, setSubjects] = useState("");
  const [size, setSize] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [studyDesign, setStudyDesign] = useState("");

  // Curation fields
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [featuredTitleOverride, setFeaturedTitleOverride] = useState("");

  const { data: searchData, isLoading: isSearchLoading } = useQuery({
    queryKey: ["mod-admin-search", searchQuery, page],
    queryFn: () => api.admin.moderation.searchDatasets({ q: searchQuery || undefined, page, limit: 10 }),
    enabled: step === "search",
  });

  const handleSelectDataset = (item: any) => {
    if (item.isPublished) return;
    setSelectedDataset(item);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setDisease(item.disease || "");
    setRegion(item.region || "");
    setAgeGroup(item.ageGroup || "");
    setModality(Array.isArray(item.modality) ? item.modality.join(", ") : "");
    setSpecies(Array.isArray(item.species) ? item.species.join(", ") : "");
    setTasks(Array.isArray(item.tasks) ? item.tasks.join(", ") : "");
    setSubjects(item.subjects != null ? String(item.subjects) : "");
    setSize(item.size || "");
    setPublicationYear(item.publicationYear != null ? String(item.publicationYear) : "");
    setStudyDesign(item.studyDesign || "");
    setStep("review");
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;
    setIsSubmitting(true);
    try {
      const parseList = (str: string) => str.split(",").map((s) => s.trim()).filter(Boolean);

      // Save metadata override
      await api.admin.moderation.updateOverride(selectedDataset.datasetId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        disease: disease.trim() || undefined,
        region: region.trim() || undefined,
        ageGroup: ageGroup.trim() || undefined,
        modality: modality ? parseList(modality) : undefined,
        species: species ? parseList(species) : undefined,
        tasks: tasks ? parseList(tasks) : undefined,
        subjects: subjects ? Number(subjects) : undefined,
        size: size.trim() || undefined,
        publicationYear: publicationYear ? Number(publicationYear) : undefined,
        studyDesign: studyDesign.trim() || undefined,
      });

      // Publish to Popular / Featured
      await api.admin.moderation.publishPopular(selectedDataset.datasetId, {
        displayOrder,
        featuredTitleOverride: featuredTitleOverride.trim() || undefined,
      });

      toast.success(`Dataset "${title || selectedDataset.title}" published to Featured!`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish dataset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="glass card-elevated flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              {step === "search" ? "Add Featured Dataset — Select Canonical Dataset" : "Review & Publish Featured Dataset"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {step === "search"
                ? "Search active canonical datasets from the database to publish directly as Featured."
                : `Dataset ID: ${selectedDataset?.datasetId}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: Search Canonical Datasets */}
        {step === "search" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by title, disease, modality, species, repository, or ID..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-cyan/40"
                />
              </div>
              <button type="submit" className="rounded-xl bg-cyan/20 border border-cyan/40 px-4 py-2 text-xs font-medium text-cyan hover:bg-cyan/30">
                Search
              </button>
            </form>

            {isSearchLoading ? (
              <LoadingSkeletonRows />
            ) : !searchData?.items?.length ? (
              <EmptyState title="No datasets found" message="Try searching with a broader title, repository name, or disease query." />
            ) : (
              <div className="space-y-3">
                {searchData.items.map((item) => (
                  <div key={item.datasetId} className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-white/5 hover:border-white/15 transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground text-xs line-clamp-1">{item.title}</h4>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {item.datasetId}
                        </span>
                        <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-[10px] font-mono text-cyan uppercase">
                          {item.repository}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground">
                        {item.modality.length > 0 && <span>Modality: {item.modality.join(", ")}</span>}
                        {item.species.length > 0 && <span>Species: {item.species.join(", ")}</span>}
                        {item.disease && <span>Disease: {item.disease}</span>}
                        {item.subjects != null && <span>Subjects: {item.subjects}</span>}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {item.isPublished ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-medium text-amber-300">
                          <ShieldCheck className="h-3 w-3" /> Already Featured
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectDataset(item)}
                          className="inline-flex items-center gap-1 rounded-full bg-cyan/20 border border-cyan/40 px-3.5 py-1.5 text-xs font-medium text-cyan hover:bg-cyan/30 transition-colors"
                        >
                          Select & Edit <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <PaginationBar
                  page={page}
                  totalPages={searchData.pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Review Metadata & Publish */}
        {step === "review" && selectedDataset && (
          <form onSubmit={handlePublish} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4 text-xs">
            {/* Header info */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1 font-mono text-[11px] text-muted-foreground">
              <div><span className="text-foreground">Source Repository:</span> {selectedDataset.repository}</div>
              <div><span className="text-foreground">Canonical Title:</span> {selectedDataset.title}</div>
            </div>

            {/* Editable metadata fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Title Override</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Disease / Condition</label>
                <input value={disease} onChange={(e) => setDisease(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Modality (comma-separated)</label>
                <input value={modality} onChange={(e) => setModality(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Species (comma-separated)</label>
                <input value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Tasks (comma-separated)</label>
                <input value={tasks} onChange={(e) => setTasks(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Brain Region</label>
                <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[11px] text-muted-foreground">Description Override</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-foreground focus:outline-none" />
            </div>

            {/* Curation fields */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-3">
              <h4 className="font-semibold text-amber-300">Featured Curation Settings</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] text-muted-foreground">Display Order Position</label>
                  <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-foreground" />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] text-muted-foreground">Featured Card Title (optional)</label>
                  <input value={featuredTitleOverride} onChange={(e) => setFeaturedTitleOverride(e.target.value)} placeholder="Custom card headline…" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-foreground" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep("search")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back to Search
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-cyan/20 border border-cyan/40 px-5 py-2 font-medium text-cyan hover:bg-cyan/30 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Publishing…" : "Publish to Featured"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
