import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { PaperData, PaperSection } from "./types";

interface Props {
  paperData: PaperData;
  setPaperData: (data: PaperData) => void;
}

export function PaperEditor({ paperData, setPaperData }: Props) {
  return (
    <div className="space-y-5">
      <div className="glass card-elevated rounded-2xl p-6 border border-white/10 space-y-4">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-cyan" />
          Paper Metadata & Authors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Paper Title</label>
            <input
              type="text"
              value={paperData.title}
              onChange={(e) => setPaperData({ ...paperData, title: e.target.value })}
              className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Authors (comma separated)</label>
            <input
              type="text"
              value={paperData.authors}
              onChange={(e) => setPaperData({ ...paperData, authors: e.target.value })}
              className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Affiliations / Department</label>
            <input
              type="text"
              value={paperData.affiliations}
              onChange={(e) => setPaperData({ ...paperData, affiliations: e.target.value })}
              className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Abstract</label>
            <textarea
              rows={4}
              value={paperData.abstract}
              onChange={(e) => setPaperData({ ...paperData, abstract: e.target.value })}
              className="w-full rounded-xl bg-card border border-border p-3 text-sm focus:border-cyan focus:outline-none resize-y"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Keywords / Index Terms</label>
            <input
              type="text"
              value={paperData.keywords}
              onChange={(e) => setPaperData({ ...paperData, keywords: e.target.value })}
              className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Body Sections ({paperData.sections.length})
          </h3>
          <button
            onClick={() => {
              const newSec: PaperSection = {
                id: `sec-${paperData.sections.length + 1}`,
                title: "New Section",
                content: "Enter section content here...",
              };
              setPaperData({ ...paperData, sections: [...paperData.sections, newSec] });
              toast.success("Added new section!");
            }}
            className="inline-flex items-center gap-1 text-xs text-cyan hover:underline"
          >
            + Add Section
          </button>
        </div>

        {paperData.sections.map((sec, idx) => (
          <div key={sec.id} className="glass card-elevated rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono text-cyan">{idx + 1}.</span>
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => {
                    const updated = [...paperData.sections];
                    updated[idx].title = e.target.value;
                    setPaperData({ ...paperData, sections: updated });
                  }}
                  className="rounded-lg bg-card/60 border border-border px-2.5 py-1 text-sm font-semibold text-foreground w-full max-w-sm focus:border-cyan focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (paperData.sections.length <= 1) {
                    toast.error("Paper must have at least one section.");
                    return;
                  }
                  const updated = paperData.sections.filter((_, i) => i !== idx);
                  setPaperData({ ...paperData, sections: updated });
                  toast.success("Section removed");
                }}
                className="text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </div>
            <textarea
              rows={5}
              value={sec.content}
              onChange={(e) => {
                const updated = [...paperData.sections];
                updated[idx].content = e.target.value;
                setPaperData({ ...paperData, sections: updated });
              }}
              className="w-full rounded-xl bg-card border border-border p-3 text-sm focus:border-cyan focus:outline-none resize-y"
            />
          </div>
        ))}
      </div>

      <div className="glass card-elevated rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Bibliography & References ({paperData.references.length})
          </h3>
          <button
            onClick={() => {
              setPaperData({
                ...paperData,
                references: [...paperData.references, "Author, A. (2025). New publication title. Journal of Neuro Research, 1(1), 1-10."],
              });
              toast.success("Added reference slot!");
            }}
            className="inline-flex items-center gap-1 text-xs text-cyan hover:underline"
          >
            + Add Reference
          </button>
        </div>
        <div className="space-y-2.5">
          {paperData.references.map((ref, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">[{idx + 1}]</span>
              <input
                type="text"
                value={ref}
                onChange={(e) => {
                  const updated = [...paperData.references];
                  updated[idx] = e.target.value;
                  setPaperData({ ...paperData, references: updated });
                }}
                className="flex-1 rounded-lg bg-card border border-border px-3 py-1.5 text-xs focus:border-cyan focus:outline-none"
              />
              <button
                onClick={() => {
                  const updated = paperData.references.filter((_, i) => i !== idx);
                  setPaperData({ ...paperData, references: updated });
                }}
                className="text-xs text-destructive hover:underline px-2"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
