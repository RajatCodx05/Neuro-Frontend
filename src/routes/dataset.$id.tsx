import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { api, type SearchResult } from "@/lib/api-client";
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

  // 2. Remove scraped ASCII/Markdown table noise (lines/blocks with pipe columns & dashes)
  text = text.replace(/\|\|\s*[A-Za-z0-9\s()=|-]+(?:---|\|\|)[\s\S]*?\|\|/g, "");
  text = text.replace(/^\|\|[\s\S]*?\|\|$/gm, "");
  text = text.replace(/^\|.*---.*\|$/gm, "");
  text = text.replace(/^\s*\|.*\|.*\|.*$/gm, "");

  // 3. Remove standalone orphan markdown hashes (#, ##) and orphan section numbers (e.g. "3.", "2.", "1.")
  text = text.replace(/^\s*#+\s*$/gm, "");
  text = text.replace(/^\s*\d+\.\s*$/gm, "");

  // 4. Ensure newline breaks before embedded markdown headers or section numbers with titles
  text = text.replace(/([^\n])\s*(#{1,6}\s+|(?:\d+\.)+\d*\s+[A-Z])/g, "$1\n\n$2");

  // 5. Clean up multiple empty lines
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
    // E.g. "3.3. Code availability All participants were scanned on a Siemens..."
    // E.g. "Neuroimaging specificities All MRI acquisitions are available..."
    const headingMatch = trimmed.match(
      /^((?:(?:\d+\.)+\d*\s*)?[A-Z0-9][A-Za-z0-9\s,&\/\-:\(\)]{2,65}?)(?=\s+[A-Z][a-z]{3,}|\s+[0-9]+\s+[A-Z]|\n|$)/
    );

    const isExplicitHeading = /^(#{1,6}\s*|(?:\d+\.)+\d+\s+[A-Z])/.test(rawBlock.trim());
    const headingTextCandidate = headingMatch ? headingMatch[1].trim() : "";

    if (
      isExplicitHeading ||
      (headingTextCandidate && headingTextCandidate.length < 80 && trimmed.length > headingTextCandidate.length + 15)
    ) {
      if (headingTextCandidate && headingTextCandidate.length < 80 && trimmed.length > headingTextCandidate.length + 10) {
        const headingText = headingTextCandidate.replace(/^#+\s*/, "").trim();
        const bodyText = trimmed.slice(headingTextCandidate.length).replace(/^[:\-\s]+/, "").trim();

        // Require headingText to have actual letter content (not just "3.")
        if (headingText && /[a-zA-Z]/.test(headingText) && headingText !== "#") {
          blocks.push({ type: "heading", text: headingText });
        }
        if (bodyText && bodyText !== "#" && !/^\d+\.\s*$/.test(bodyText)) {
          if (/\b1,\s+.*\b2,\s+/.test(bodyText)) {
            const items = bodyText
              .split(/(?=\b\d+,\s+)/)
              .map((s) => s.replace(/^\d+,\s*/, "").trim())
              .filter((s) => Boolean(s) && s !== "#");
            if (items.length > 1) {
              blocks.push({ type: "list", items });
              continue;
            }
          }
          const cleanBody = bodyText.replace(/\|\|/g, " ").replace(/\s+/g, " ").trim();
          if (cleanBody && cleanBody !== "#" && !/^\d+\.\s*$/.test(cleanBody)) {
            blocks.push({ type: "paragraph", text: cleanBody });
          }
        }
        continue;
      }
    }

    // Standard heading check if single short line with letters
    if (trimmed.length < 90 && /[a-zA-Z]/.test(trimmed) && !trimmed.includes(".") && !trimmed.includes("\n")) {
      blocks.push({ type: "heading", text: trimmed });
      continue;
    }

    // List item check
    if (/\b1,\s+.*\b2,\s+/.test(trimmed)) {
      const items = trimmed
        .split(/(?=\b\d+,\s+)/)
        .map((s) => s.replace(/^\d+,\s*/, "").trim())
        .filter((s) => Boolean(s) && s !== "#");
      if (items.length > 1) {
        blocks.push({ type: "list", items });
        continue;
      }
    }

    // Clean paragraph
    const cleanParagraph = trimmed
      .replace(/\|\|/g, " ")
      .replace(/\|\s*---\s*---\s*\|/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanParagraph && cleanParagraph !== "#" && !/^\d+\.\s*$/.test(cleanParagraph)) {
      blocks.push({ type: "paragraph", text: cleanParagraph });
    }
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
                      <div className="mt-1 font-medium text-foreground capitalize break-words">
                        {v}
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
                <div className="space-y-4">
                  {descriptionBlocks.map((block, idx) => {
                    if (block.type === "heading") {
                      return (
                        <h3
                          key={idx}
                          className="mt-6 mb-2 text-sm font-semibold text-foreground border-b border-white/10 pb-1.5 flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4 text-cyan" />
                          {block.text}
                        </h3>
                      );
                    }
                    if (block.type === "list") {
                      return (
                        <ul key={idx} className="my-3 space-y-2 pl-2">
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
                        className="text-sm leading-relaxed text-muted-foreground text-justify sm:text-left"
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

