import { useRef, type DragEvent, type ChangeEvent } from "react";
import {
  Upload, FileEdit, Sparkles, CheckCircle2,
  Layers, Share2, FileCode2,
} from "lucide-react";
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
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Top Header / Badges */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 dark:bg-purple-500/10 dark:border-purple-500/30 [.light_&]:text-purple-700 [.light_&]:bg-purple-50 [.light_&]:border-purple-200 px-3 py-1 text-xs font-mono text-purple-300">
          <Sparkles className="h-3.5 w-3.5 text-purple-400 [.light_&]:text-purple-600" />
          <span>AI Research Workspace</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Research Paper Studio
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
          Transform your research documents into publication-ready papers with AI-powered formatting and editing.
        </p>
      </div>

      {/* Action Cards (Stacked Full-Width matching image) */}
      <div className="space-y-4">
        {/* Card 1: Upload Research Document */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`glass card-elevated rounded-2xl border p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
            isDragging
              ? "border-cyan bg-cyan/15 scale-[1.01] ring-1 ring-cyan"
              : "border-border hover:border-cyan/50 hover:bg-card/90"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileInputChange}
            accept=".pdf,.docx,.doc,.txt,.md,.rtf"
            className="hidden"
          />
          <div className="h-14 w-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_24px_rgba(6,182,212,0.18)] [.light_&]:bg-cyan-50 [.light_&]:border-cyan-200 [.light_&]:text-cyan-700 [.light_&]:shadow-sm">
            <Upload className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
            Upload Research Document
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
            Upload PDF, DOCX, or TXT and transform it into a structured research paper.
          </p>
          <button
            type="button"
            className="mt-5 rounded-xl bg-cyan-300 hover:bg-cyan-200 text-slate-950 [.light_&]:bg-cyan-600 [.light_&]:hover:bg-cyan-700 [.light_&]:text-white px-6 py-2.5 text-xs font-semibold shadow-[0_0_24px_rgba(6,182,212,0.35)] [.light_&]:shadow-md transition-all"
          >
            Upload Document
          </button>
        </div>

        {/* Card 2: Start New Research Paper */}
        <div
          onClick={onStartFromScratch}
          className="glass card-elevated rounded-2xl border border-border backdrop-blur-xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:border-purple-500/40 hover:bg-card/90"
        >
          <div className="h-14 w-14 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_24px_rgba(168,85,247,0.18)] [.light_&]:bg-purple-50 [.light_&]:border-purple-200 [.light_&]:text-purple-700 [.light_&]:shadow-sm">
            <FileEdit className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
            Start New Research Paper
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
            Start writing from scratch with AI-assisted research paper structure and formatting.
          </p>
          <button
            type="button"
            className="mt-5 rounded-xl border border-purple-500/40 bg-purple-950/20 hover:border-purple-400 hover:bg-purple-950/40 text-purple-300 [.light_&]:border-purple-300 [.light_&]:bg-purple-50 [.light_&]:hover:bg-purple-100 [.light_&]:text-purple-800 px-6 py-2.5 text-xs font-mono transition-all"
          >
            Start from Scratch
          </button>
        </div>
      </div>

      {/* Choose Paper Format Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-foreground tracking-tight">
            Choose Paper Format
          </h3>
          <button
            type="button"
            onClick={onOpenCustomTemplate}
            className="text-xs text-muted-foreground hover:text-cyan transition-colors underline decoration-dotted underline-offset-4"
          >
            Custom Template (.docx)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* IEEE Card */}
          <div
            onClick={() => onFormatChange("ieee")}
            className={`glass card-elevated rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
              selectedFormat === "ieee"
                ? "border-cyan bg-cyan/15 ring-1 ring-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)] [.light_&]:bg-cyan-50/90 [.light_&]:border-cyan-600"
                : "border-border hover:border-border hover:bg-card/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-xs font-mono font-semibold text-cyan-300 [.light_&]:bg-cyan-100 [.light_&]:border-cyan-200 [.light_&]:text-cyan-800">
                IEEE
              </span>
              {selectedFormat === "ieee" && (
                <CheckCircle2 className="h-4 w-4 text-cyan-400 [.light_&]:text-cyan-600" />
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-3">Technical</p>
          </div>

          {/* APA Card */}
          <div
            onClick={() => onFormatChange("apa")}
            className={`glass card-elevated rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
              selectedFormat === "apa"
                ? "border-purple-400 bg-purple-950/25 ring-1 ring-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] [.light_&]:bg-purple-50/90 [.light_&]:border-purple-600"
                : "border-border hover:border-border hover:bg-card/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs font-mono font-semibold text-purple-300 [.light_&]:bg-purple-100 [.light_&]:border-purple-200 [.light_&]:text-purple-800">
                APA
              </span>
              {selectedFormat === "apa" && (
                <CheckCircle2 className="h-4 w-4 text-purple-400 [.light_&]:text-purple-600" />
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-3">Neuroscience</p>
          </div>

          {/* ACM Card */}
          <div
            onClick={() => onFormatChange("acm")}
            className={`glass card-elevated rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
              selectedFormat === "acm"
                ? "border-foreground/40 bg-card ring-1 ring-foreground/40 shadow-[0_0_20px_rgba(200,200,200,0.15)] [.light_&]:bg-slate-100 [.light_&]:border-slate-600"
                : "border-border hover:border-border hover:bg-card/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-slate-700/40 border border-slate-600/40 px-2 py-0.5 text-xs font-mono font-semibold text-slate-300 [.light_&]:bg-slate-200 [.light_&]:border-slate-300 [.light_&]:text-slate-800">
                ACM
              </span>
              {selectedFormat === "acm" && (
                <CheckCircle2 className="h-4 w-4 text-foreground/70" />
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-3">Computing</p>
          </div>
        </div>
      </div>

      {/* Preloaded Sample Box */}
      <div className="glass card-elevated rounded-2xl border border-border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Explore the workflow using a preloaded neuroscience research document.
        </p>
        <button
          type="button"
          onClick={onLoadSample}
          className="rounded-xl border border-border bg-card/60 hover:bg-card px-4 py-2 text-xs font-mono text-foreground [.light_&]:bg-slate-100 [.light_&]:hover:bg-slate-200 [.light_&]:text-slate-800 transition-all whitespace-nowrap"
        >
          Try a Sample Neuroscience Paper
        </button>
      </div>

      {/* Bottom 4 Feature Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="glass card-elevated rounded-2xl border border-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <FileCode2 className="h-4 w-4 text-cyan-400 [.light_&]:text-cyan-600" />
          <span className="text-xs font-mono text-muted-foreground [.light_&]:text-slate-700">Format Automatically</span>
        </div>
        <div className="glass card-elevated rounded-2xl border border-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400 [.light_&]:text-purple-600" />
          <span className="text-xs font-mono text-muted-foreground [.light_&]:text-slate-700">AI-Assisted Editing</span>
        </div>
        <div className="glass card-elevated rounded-2xl border border-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400 [.light_&]:text-cyan-600" />
          <span className="text-xs font-mono text-muted-foreground [.light_&]:text-slate-700">Research Structure</span>
        </div>
        <div className="glass card-elevated rounded-2xl border border-border p-4 flex flex-col items-center justify-center text-center gap-2">
          <Share2 className="h-4 w-4 text-indigo-400 [.light_&]:text-indigo-600" />
          <span className="text-xs font-mono text-muted-foreground [.light_&]:text-slate-700">Export & Share</span>
        </div>
      </div>
    </div>
  );
}
