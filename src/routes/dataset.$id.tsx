import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Bookmark,
  Share2,
  ExternalLink,
  Loader2,
  Check,
  Copy,
  FileText,
  Database,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { useAuth } from "@/lib/auth-context";
import { useSearchState } from "@/lib/search-state";
import { api, type SearchResult } from "@/lib/api-client";
import { modalityDisplayLabel } from "@/lib/search-filters";
import { toast } from "sonner";

export const Route = createFileRoute("/dataset/$id")({
  component: DatasetPage,
});

/**
 * Clean up raw web scraped markdown text / text blobs into clean, systematic sections
 */
/**
 * Clean up raw web scraped markdown text / text blobs into clean, systematic sections
 */
/**
 * Clean up raw web scraped markdown text / text blobs into clean, systematic sections
 */
function cleanHeadingTitle(raw: string): string {
  if (!raw) return "";
  // Strip markdown hashes, leading section numbers (e.g., "3.", "2.2", "3.1.2", "3 ", "1-")
  let text = raw
    .replace(/^#+\s*/, "")
    .replace(/^(?:\d+[\.\-]\s*)+/, "")
    .replace(/^\d+\s+/, "")
    .trim();

  // Strip trailing colons, hashes, or dashes
  text = text.replace(/[:\-#]+$/, "").trim();

  // Convert all-caps or all-lowercase short headings to Title Case
  if (text.length > 0 && text.length < 60) {
    if (text === text.toUpperCase() || text === text.toLowerCase()) {
      text = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }
  }
  return text;
}

function cleanBodyText(raw: string): string {
  if (!raw) return "";
  let text = raw
    .replace(/\|\|/g, " ")
    .replace(/\|\s*---\s*---\s*\|/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Strip orphan leading section number from start of paragraph like "1. The dataset contains..." -> "The dataset contains..."
  text = text.replace(/^(?:\d+\.)+\s+/, "").replace(/^\d+\.\s+(?=[A-Z])/, "");
  return text;
}

function cleanDescriptionText(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // 1. Remove common web scraping footer junk & navigation UI elements
  text = text.replace(/##\s*PERMALINK[\s\S]*$/i, "");
  text = text.replace(/##\s*RESOURCES[\s\S]*$/i, "");
  text = text.replace(/###\s*###\s*###\s*Download[\s\S]*$/i, "");
  text = text.replace(/BranchesTags\s+Open\s+more\s+actions\s+menu[\s\S]*$/i, "");
  text = text.replace(/##\s*Repository\s+files\s+navigation[\s\S]*$/i, "");
  text = text.replace(/\|\|\s*---\s*---\s*\|\|/g, "");
  text = text.replace(/##\s*Add\s+to\s+Collections/gi, "");
  text = text.replace(/\.nbib/gi, "");
  text = text.replace(/\[\.\.\.\]/g, " ");

  // 2. Remove scraped citation noise & CrossRef/Google Scholar lists (Image 2)
  text = text.replace(/\+\s*CrossRef\s*\+\s*Google\s*Scholar.*$/gim, "");
  text = text.replace(/^.*(?:Gorgolewski|Holdgraf|Khambhati).*(?:doi:|Sci\.|Nat\.|Int\.|Neurolmage).*$/gm, "");

  // 3. Remove scraped ASCII/Markdown table noise (lines/blocks with pipe columns & dashes)
  text = text.replace(/\|\|\s*[A-Za-z0-9\s()=|-]+(?:---|\|\|)[\s\S]*?\|\|/g, "");
  text = text.replace(/^\|\|[\s\S]*?\|\|$/gm, "");
  text = text.replace(/^\|.*---.*\|$/gm, "");
  text = text.replace(/^\s*\|.*\|.*\|.*$/gm, "");

  // 4. Remove standalone orphan markdown hashes (#, ##) and orphan section numbers (e.g. "3.", "2.", "1.")
  text = text.replace(/^\s*#+\s*$/gm, "");
  text = text.replace(/^\s*\d+\.\s*$/gm, "");

  // 5. Ensure newline breaks before embedded headers or section numbers with titles
  text = text.replace(/([^\n])\s*(#{1,6}\s+|(?:\d+\.)+\d*\s+[A-Z])/g, "$1\n\n$2");

  // 6. Clean up multiple empty lines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

type SectionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseDescriptionBlocks(raw: string): SectionBlock[] {
  const cleaned = cleanDescriptionText(raw);
  if (!cleaned) return [];

  const rawBlocks = cleaned.split(/\n\n+/);
  const blocks: SectionBlock[] = [];

  for (const rawBlock of rawBlocks) {
    let trimmed = rawBlock.trim();
    if (!trimmed) continue;

    // Strip leading/trailing hashes and pipes
    trimmed = trimmed.replace(/^#+\s*/, "").replace(/#+\s*$/, "").trim();
    if (!trimmed || /^(?:#+|\d+\.|\d+|#|\.\s*)$/.test(trimmed)) continue;

    // Check if block contains an embedded section heading at start followed by body text
    const headingMatch = trimmed.match(
      /^((?:(?:\d+\.)+\d*\s*)?[A-Z0-9][A-Za-z0-9\s,&\/\-:\(\)]{2,65}?)(?=\s+[A-Z][a-z]{3,}|\s+[0-9]+\s+[A-Z]|\n|$)/
    );

    const isExplicitHeading = /^(#{1,6}\s*|(?:\d+\.)+\d+\s+[A-Z])/.test(rawBlock.trim());
    const headingCandidateRaw = headingMatch ? headingMatch[1].trim() : "";

    if (
      isExplicitHeading ||
      (headingCandidateRaw && headingCandidateRaw.length < 80 && trimmed.length > headingCandidateRaw.length + 15)
    ) {
      if (headingCandidateRaw && headingCandidateRaw.length < 80 && trimmed.length > headingCandidateRaw.length + 10) {
        const cleanHeading = cleanHeadingTitle(headingCandidateRaw);
        const bodyText = cleanBodyText(trimmed.slice(headingCandidateRaw.length).replace(/^[:\-\s]+/, ""));

        if (cleanHeading && /[a-zA-Z]/.test(cleanHeading)) {
          blocks.push({ type: "heading", text: cleanHeading });
        }
        if (bodyText && bodyText !== "#" && !/^\d+\.\s*$/.test(bodyText)) {
          if (/\b1,\s+.*\b2,\s+/.test(bodyText)) {
            const items = bodyText
              .split(/(?=\b\d+,\s+)/)
              .map((s) => cleanBodyText(s.replace(/^\d+,\s*/, "")))
              .filter((s) => Boolean(s) && s !== "#");
            if (items.length > 1) {
              blocks.push({ type: "list", items });
              continue;
            }
          }
          blocks.push({ type: "paragraph", text: bodyText });
        }
        continue;
      }
    }

    // Standard heading check if single short line with letters
    if (trimmed.length < 90 && /[a-zA-Z]/.test(trimmed) && !trimmed.includes(".") && !trimmed.includes("\n")) {
      const cleanHeading = cleanHeadingTitle(trimmed);
      if (cleanHeading) {
        blocks.push({ type: "heading", text: cleanHeading });
        continue;
      }
    }

    // List item check
    if (/\b1,\s+.*\b2,\s+/.test(trimmed)) {
      const items = trimmed
        .split(/(?=\b\d+,\s+)/)
        .map((s) => cleanBodyText(s.replace(/^\d+,\s*/, "")))
        .filter((s) => Boolean(s) && s !== "#");
      if (items.length > 1) {
        blocks.push({ type: "list", items });
        continue;
      }
    }

    // Clean paragraph
    const paragraphText = cleanBodyText(trimmed);
    if (paragraphText && paragraphText !== "#" && !/^\d+\.\s*$/.test(paragraphText)) {
      blocks.push({ type: "paragraph", text: paragraphText });
    }
  }

  // Enforce writing pattern like Images 4 & 5: if first block is a paragraph without a heading, prepend Overview heading
  if (blocks.length > 0 && blocks[0].type === "paragraph") {
    blocks.unshift({ type: "heading", text: "Overview" });
  }

  return blocks;
}

function DatasetPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const { filteredResults } = useSearchState();
  // Read the latest search pool without re-triggering the fetch effect.
  const filteredResultsRef = useRef(filteredResults);
  filteredResultsRef.current = filteredResults;

  useEffect(() => {
    setLoading(true);
    api.datasets
      .getById(id)
      .then((res) => {
        setD(res);
        if (user) {
          api.savedDatasets
            .list()
            .then((list) => {
              setIsSaved(list.some((item) => item.dataset_id === res.id));
            })
            .catch(() => {});
        }
      })
      .catch(async (err) => {
        // Expand fix: repository-tier / discovery records are returned by search
        // with no Mongo _id (id: null) and are NOT persisted in the DB, so the
        // backend getById 404s. The exact snapshot the user clicked is still in
        // the search-state cache — render it instead of "Dataset not found."
        const snapshot = filteredResultsRef.current.find((r) => r.id === id);
        if (snapshot) {
          setD(snapshot);
          return;
        }
        // Fallback check in user saved datasets snapshot
        try {
          const list = await api.savedDatasets.list();
          const found = list.find((item) => item.dataset_id === id || item.id === id);
          if (found && found.dataset_snapshot) {
            setD(found.dataset_snapshot as SearchResult);
            setIsSaved(true);
          } else {
            toast.error(err instanceof Error ? err.message : "Failed to load dataset");
          }
        } catch {
          toast.error(err instanceof Error ? err.message : "Failed to load dataset");
        }
      })
      .finally(() => setLoading(false));
  }, [id, user]);

  const save = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/dataset/${id}`, mode: "login" } });
      return;
    }
    if (!d) return;
    if (isSaved) {
      toast.error("Dataset already saved");
      return;
    }
    // Optimistic update
    setIsSaved(true);
    try {
      await api.savedDatasets.upsert({ dataset_id: d.id, dataset_snapshot: JSON.parse(JSON.stringify(d)) });
      toast.success("Saved to your library");
    } catch (err) {
      setIsSaved(false);
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const share = () => {
    const urlToCopy = d?.url || window.location.href;
    navigator.clipboard.writeText(urlToCopy);
    toast.success("Copied to Clipboard");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!d) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to results
          </button>
          <div className="mt-10 text-center text-muted-foreground">Dataset not found.</div>
        </div>
      </AppShell>
    );
  }

  const descriptionBlocks = parseDescriptionBlocks(d.description);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to results
        </button>

        {/* Hero Card */}
        <div className="relative mt-6 overflow-hidden rounded-3xl glass-strong card-elevated">
          <div className="p-6 sm:p-8">
            {/* <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-foreground font-medium">
                {d.repo}
              </span>
              <span>· {d.id}</span>
              {d.verified && (
                <span className="inline-flex items-center gap-1 text-cyan font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Verified {d.verified}
                </span>
              )}
            </div> */}
            <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl leading-snug">
              {d.name}
            </h1>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {isSaved ? (
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 px-4 py-2 text-xs font-medium text-green-400 bg-green-500/10 cursor-default"
                >
                  <Check className="h-3.5 w-3.5" /> Saved
                </button>
              ) : (
                <button
                  onClick={save}
                  className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors"
                >
                  <Bookmark className="h-3.5 w-3.5" /> Save
                </button>
              )}
              <button
                onClick={share}
                className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              {d.url && (
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full glass px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors text-cyan"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Access the Data
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Systematic Dataset Metadata Table */}
            <Section title="Dataset Specifications">
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {[
                  ["Modality", d.modality],
                  ["Species", d.species],
                  ["Age Group", d.ageGroup],
                  ["Disease / Condition", d.disease],
                  ["Subject Count", d.subjects ? `${d.subjects.toLocaleString()} subjects` : null],
                  ["Brain Region", d.region],
                  ["License", d.license],
                  ["Access Tier", d.access],
                  ["Data Size", d.size],
                  ["Repository", d.repo],
                ]
                  .filter(([, v]) => v != null && v !== "" && v !== "null" && v !== "DS")
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                        {k}
                      </div>
                      {/* Issue 1: modality uses the canonical display label
                          (and skips CSS `capitalize`, which would mangle
                          "fMRI" → "FMRI"). All other cells keep title-casing. */}
                      <div
                        className={`mt-1 font-medium text-foreground break-words ${k === "Modality" ? "" : "capitalize"}`}
                      >
                        {k === "Modality" ? modalityDisplayLabel(String(v)) : v}
                      </div>
                    </div>
                  ))}
              </div>
            </Section>

            {/* Structured Overview & Description Section */}
            <Section title="Overview & Description">
              {descriptionBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No detailed description available for this dataset.
                </p>
              ) : (
                <div className="space-y-6">
                  {descriptionBlocks.map((block, idx) => {
                    if (block.type === "heading") {
                      return (
                        <div key={idx} className="border-b border-white/10 pb-2 pt-3 first:pt-0">
                          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-cyan shrink-0" />
                            <span>{block.text}</span>
                          </h3>
                        </div>
                      );
                    }
                    if (block.type === "list") {
                      return (
                        <ul key={idx} className="space-y-2 pl-2">
                          {block.items.map((item, itemIdx) => (
                            <li
                              key={itemIdx}
                              className="text-sm leading-relaxed text-muted-foreground flex items-start gap-2.5"
                            >
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan shrink-0 mt-2" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p
                        key={idx}
                        className="text-sm leading-relaxed text-muted-foreground text-justify sm:text-left break-words"
                      >
                        {block.text}
                      </p>
                    );
                  })}
                </div>
              )}
            </Section>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            <Section title="Repository & Source">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan/40 to-neural/40 text-xs font-bold text-white uppercase">
                  {d.repo.slice(0, 3)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{d.repo}</div>
                  {d.verified ? (
                    <div className="text-[11px] text-cyan flex items-center gap-1 mt-0.5 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Verified {d.verified}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">Community Catalog</div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Access & Licensing">
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">License</span>
                  <span className="font-medium text-foreground">{d.license ?? "Open Data"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Access Tier</span>
                  <span className="font-medium text-foreground uppercase">{d.access ?? "Open"}</span>
                </div>
                {d.doi && (
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-muted-foreground">DOI</span>
                    <span className="truncate max-w-[150px] font-mono text-cyan">{d.doi}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* Citation Box */}
            <Section title="Citation & Reference">
              <div className="rounded-xl bg-white/5 p-4 font-mono text-xs text-muted-foreground">
                Author, A. et al. ({new Date().getFullYear()}).{" "}
                <span className="text-foreground">{d.name}</span>. {d.repo}.
                {d.doi ? ` doi:${d.doi}` : ""}
                <div className="mt-3 border-t border-white/5 pt-2.5">
                  <button
                    onClick={() => {
                      const text = `Author, A. et al. (${new Date().getFullYear()}). ${d.name}. ${d.repo}.${d.doi ? ` doi:${d.doi}` : ""}`;
                      navigator.clipboard.writeText(text);
                      toast.success("Citation copied to clipboard");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-cyan hover:underline font-sans"
                  >
                    <Copy className="h-3 w-3" /> Copy Citation
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass card-elevated rounded-2xl p-5 sm:p-6">
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
        {title}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

