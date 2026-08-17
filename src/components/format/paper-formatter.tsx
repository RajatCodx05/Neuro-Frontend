import { useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { FormatType, PaperData } from "./types";
import { SAMPLE_PAPER } from "./sample-data";
import { parseDocumentText } from "./doc-parser";
import { generateFormattedPlainText } from "./export-helpers";
import { CustomTemplateModal } from "./custom-template-modal";
import { FormatComplianceView } from "./format-compliance";
import { PaperLanding } from "./paper-landing";
import { PaperToolbar } from "./paper-toolbar";
import { PaperPreview } from "./paper-preview";
import { PaperEditor } from "./paper-editor";

export function PaperFormatter() {
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("ieee");
  const [paperData, setPaperData] = useState<PaperData | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "editor" | "structure">("preview");
  const [twoColumn, setTwoColumn] = useState<boolean>(true);
  const [customTemplateOpen, setCustomTemplateOpen] = useState<boolean>(false);
  const [customTemplateName, setCustomTemplateName] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || "";
        const parsed = parseDocumentText(text, file.name);
        setPaperData(parsed);
        toast.success(`Converted "${file.name}" to ${selectedFormat.toUpperCase()} format!`);
      } catch {
        toast.error("Failed to parse document file.");
      }
    };
    reader.readAsText(file);
  };

  const handleStartFromScratch = () => {
    setPaperData({
      title: "Untitled Research Paper",
      authors: "Author Name, Co-Author Name",
      affiliations: "Department of Neuroscience, University Research Institute",
      abstract: "Provide a concise summary of the research background, proposed methods, key findings, and scientific implications.",
      keywords: "Neuroimaging, Machine Learning, Brain Signals, Classification",
      sections: [
        { id: "sec-1", title: "Introduction", content: "State the research problem, existing literature limitations, and your core contributions." },
        { id: "sec-2", title: "Related Work", content: "Review prior methodologies and position your approach within the research landscape." },
        { id: "sec-3", title: "Methodology", content: "Describe the dataset, mathematical formulations, algorithmic steps, and experimental design." },
        { id: "sec-4", title: "Results & Discussion", content: "Present empirical results, ablation studies, and qualitative or quantitative evaluations." },
        { id: "sec-5", title: "Conclusion", content: "Summarize findings, highlight broader impacts, and outline directions for future investigation." },
      ],
      references: [
        "Author, A., & Author, B. (2024). Title of referenced work. Journal Name, 12(3), 101-115.",
        "Researcher, C. (2023). Methodological breakthroughs in modern science. IEEE Trans. Neural Syst., 8(1), 50-62.",
      ],
    });
    toast.success("Initialized research paper template in editor!");
  };

  const handleCopyText = async () => {
    if (!paperData) return;
    const text = generateFormattedPlainText(paperData, selectedFormat);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Formatted text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy text.");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!paperData) return;
    const text = generateFormattedPlainText(paperData, selectedFormat);
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paperData.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}_${selectedFormat}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Document downloaded as Markdown!");
  };

  const handleAiAction = (action: "standardize" | "romanize" | "cleanKeywords") => {
    if (!paperData) return;
    if (action === "standardize") {
      const updatedRefs = paperData.references.map((r) => {
        if (!r.endsWith(".")) r += ".";
        return r;
      });
      setPaperData({ ...paperData, references: updatedRefs });
      toast.success("Standardized bibliography citations!");
    } else if (action === "romanize") {
      toast.success("Roman numeral heading hierarchy applied for IEEE!");
    } else if (action === "cleanKeywords") {
      const cleaned = paperData.keywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean).join(", ");
      setPaperData({ ...paperData, keywords: cleaned });
      toast.success("Normalized keyword taxonomies!");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {!paperData ? (
          <PaperLanding
            selectedFormat={selectedFormat}
            onFormatChange={(f) => setSelectedFormat(f)}
            onFileUpload={handleFileUpload}
            onStartFromScratch={handleStartFromScratch}
            onLoadSample={() => {
              setPaperData(SAMPLE_PAPER);
              toast.success(`Loaded sample paper in ${selectedFormat.toUpperCase()} format!`);
            }}
            onOpenCustomTemplate={() => setCustomTemplateOpen(true)}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
          />
        ) : (
          <div className="space-y-6">
            <PaperToolbar
              paperData={paperData}
              selectedFormat={selectedFormat}
              onFormatChange={(f) => {
                setSelectedFormat(f);
                toast.success(`Converted to ${f.toUpperCase()} format!`);
              }}
              twoColumn={twoColumn}
              onToggleTwoColumn={() => setTwoColumn(!twoColumn)}
              onResetDocument={() => setPaperData(null)}
              onAiAction={handleAiAction}
              onCopyText={handleCopyText}
              onDownloadMarkdown={handleDownloadMarkdown}
              copied={copied}
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="bg-card/70 border border-white/10 rounded-xl p-1">
                <TabsTrigger value="preview" className="rounded-lg text-xs">
                  Formatted Paper View
                </TabsTrigger>
                <TabsTrigger value="editor" className="rounded-lg text-xs">
                  Section Editor
                </TabsTrigger>
                <TabsTrigger value="structure" className="rounded-lg text-xs">
                  Format Inspector & Compliance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4">
                <PaperPreview
                  paperData={paperData}
                  selectedFormat={selectedFormat}
                  twoColumn={twoColumn}
                />
              </TabsContent>

              <TabsContent value="editor" className="mt-4">
                <PaperEditor paperData={paperData} setPaperData={setPaperData} />
              </TabsContent>

              <TabsContent value="structure" className="mt-4">
                <FormatComplianceView paperData={paperData} selectedFormat={selectedFormat} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <CustomTemplateModal
          open={customTemplateOpen}
          onOpenChange={setCustomTemplateOpen}
          templateName={customTemplateName}
          onTemplateSelected={setCustomTemplateName}
        />
      </div>
    </AppShell>
  );
}
