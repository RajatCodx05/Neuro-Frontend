import { useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, FileText, Sparkles, BookOpen, FileUp } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FormatType } from "./types";

interface Props {
  selectedFormat: FormatType;
  onFormatChange: (f: FormatType) => void;
  onFileUpload: (file: File) => void;
  onStartFromScratch: () => void;
  onLoadSample: () => void;
  onOpenCustomTemplate: () => void;
  isDragging: boolean;
  setIsDragging: (d: boolean) => void;
}

export function PaperLanding({
  selectedFormat,
  onFormatChange,
  onFileUpload,
  onStartFromScratch,
  onLoadSample,
  onOpenCustomTemplate,
  isDragging,
  setIsDragging,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-[oklch(0.72_0.19_245)] via-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] bg-clip-text text-transparent">
          Research Paper Formatter
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Convert your documents to IEEE, APA, or ACM formats instantly. Edit with AI assistance before exporting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`glass card-elevated rounded-3xl p-8 sm:p-10 border transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center relative overflow-hidden ${
            isDragging
              ? "border-cyan bg-cyan/5 scale-[1.02] glow-cyan"
              : "border-white/10 hover:border-cyan/40 hover:bg-white/[0.03]"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileInputChange}
            accept=".pdf,.docx,.doc,.txt,.md,.rtf"
            className="hidden"
          />
          <div className="h-16 w-16 rounded-2xl bg-cyan/10 border border-cyan/20 flex items-center justify-center text-cyan mb-5 group-hover:scale-110 group-hover:bg-cyan/15 transition-all duration-300 shadow-[0_0_24px_rgba(6,182,212,0.15)]">
            <Upload className="h-7 w-7" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground">
            Upload Document
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
            PDF, DOCX, or TXT
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-cyan/90 opacity-0 group-hover:opacity-100 transition-opacity">
            <FileUp className="h-3.5 w-3.5" />
            <span>Click or drop file to format</span>
          </div>
        </div>

        <div
          onClick={onStartFromScratch}
          className="glass card-elevated rounded-3xl p-8 sm:p-10 border border-white/10 hover:border-neural/40 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <div className="h-16 w-16 rounded-2xl bg-[oklch(0.68_0.22_285)]/10 border border-[oklch(0.68_0.22_285)]/25 flex items-center justify-center text-[oklch(0.78_0.2_285)] mb-5 group-hover:scale-110 group-hover:bg-[oklch(0.68_0.22_285)]/15 transition-all duration-300 shadow-[0_0_24px_rgba(168,85,247,0.15)]">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground">
            Start from Scratch
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
            Use the editor to write
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[oklch(0.78_0.2_285)] opacity-0 group-hover:opacity-100 transition-opacity">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open AI-assisted editor</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center space-y-4">
        <div className="w-52">
          <Select
            value={selectedFormat}
            onValueChange={(val) => onFormatChange(val as FormatType)}
          >
            <SelectTrigger className="w-full h-11 bg-card/80 border-border rounded-xl text-sm font-medium shadow-sm hover:border-cyan/50 transition-colors focus:ring-cyan">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border rounded-xl shadow-xl">
              <SelectItem value="ieee" className="font-medium cursor-pointer">
                IEEE Format
              </SelectItem>
              <SelectItem value="apa" className="font-medium cursor-pointer">
                APA Format
              </SelectItem>
              <SelectItem value="acm" className="font-medium cursor-pointer">
                ACM Format
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={onOpenCustomTemplate}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted underline-offset-4 hover:decoration-solid"
        >
          Upload Custom Template (.docx)
        </button>

        <div className="pt-3">
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan" />
            <span>Or try with sample Neuroscience paper</span>
          </button>
        </div>
      </div>
    </div>
  );
}
