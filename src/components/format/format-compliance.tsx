import { CheckCircle2, Check } from "lucide-react";
import type { FormatType, PaperData } from "./types";

interface Props {
  paperData: PaperData;
  selectedFormat: FormatType;
}

export function FormatComplianceView({ paperData, selectedFormat }: Props) {
  const wordCount =
    paperData.sections.reduce((acc, s) => acc + s.content.split(/\s+/).length, 0) +
    paperData.abstract.split(/\s+/).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="md:col-span-2 glass card-elevated rounded-2xl p-6 border border-white/10 space-y-5">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          {selectedFormat.toUpperCase()} Format Compliance Checklist
        </h3>
        <div className="divide-y divide-white/5 space-y-3">
          <div className="pt-2 flex items-start gap-3">
            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Abstract Length & Structure</p>
              <p className="text-xs text-muted-foreground">
                {paperData.abstract.split(/\s+/).length} words (Recommended: 150-250 words).
              </p>
            </div>
          </div>
          <div className="pt-3 flex items-start gap-3">
            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Heading Numbering & Styling</p>
              <p className="text-xs text-muted-foreground">
                {selectedFormat === "ieee"
                  ? "Roman numerals (I., II., III.) automatically structured."
                  : selectedFormat === "apa"
                  ? "APA Level 1 & 2 title-case hierarchy applied."
                  : "ACM SIG style numbered headings applied."}
              </p>
            </div>
          </div>
          <div className="pt-3 flex items-start gap-3">
            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">In-text Bracket Citations</p>
              <p className="text-xs text-muted-foreground">
                {selectedFormat === "ieee" || selectedFormat === "acm"
                  ? "Numerical bracket references [1], [2] verified."
                  : "Author-date format citations mapped to reference list."}
              </p>
            </div>
          </div>
          <div className="pt-3 flex items-start gap-3">
            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Keywords / Index Terms Taxonomies</p>
              <p className="text-xs text-muted-foreground">
                {paperData.keywords.split(",").length} terms configured for indexing engines.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass card-elevated rounded-2xl p-6 border border-white/10 space-y-4">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Document Statistics
        </h3>
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-muted-foreground">Target Format</span>
            <span className="font-semibold text-cyan uppercase">{selectedFormat}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-muted-foreground">Word Count</span>
            <span className="font-semibold">{wordCount}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-muted-foreground">Total Sections</span>
            <span className="font-semibold">{paperData.sections.length}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-muted-foreground">References</span>
            <span className="font-semibold">{paperData.references.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
