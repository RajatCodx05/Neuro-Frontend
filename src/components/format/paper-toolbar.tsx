import {
  ArrowLeft, Download, Copy, Check, Sparkles, Columns,
  AlignLeft, FileCode, Printer, CheckCircle2, ChevronDown, FileText, Layers
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FormatType, PaperData } from "./types";
import { exportWordDoc } from "./export-helpers";

interface Props {
  paperData: PaperData;
  selectedFormat: FormatType;
  onFormatChange: (f: FormatType) => void;
  twoColumn: boolean;
  onToggleTwoColumn: () => void;
  onResetDocument: () => void;
  onAiAction: (action: "standardize" | "romanize" | "cleanKeywords") => void;
  onCopyText: () => void;
  onDownloadMarkdown: () => void;
  copied: boolean;
}

export function PaperToolbar({
  paperData,
  selectedFormat,
  onFormatChange,
  twoColumn,
  onToggleTwoColumn,
  onResetDocument,
  onAiAction,
  onCopyText,
  onDownloadMarkdown,
  copied,
}: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between glass card-elevated rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onResetDocument}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>New Document</span>
        </button>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold truncate max-w-xs sm:max-w-md">
              {paperData.title}
            </span>
            <span className="rounded-md bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-cyan uppercase tracking-wider">
              {selectedFormat.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {paperData.sections.length} sections · {paperData.references.length} references
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedFormat}
          onValueChange={(val) => onFormatChange(val as FormatType)}
        >
          <SelectTrigger className="h-9 w-36 text-xs bg-card/80 border-border rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border rounded-xl">
            <SelectItem value="ieee" className="text-xs">IEEE Format</SelectItem>
            <SelectItem value="apa" className="text-xs">APA Format</SelectItem>
            <SelectItem value="acm" className="text-xs">ACM Format</SelectItem>
          </SelectContent>
        </Select>

        {(selectedFormat === "ieee" || selectedFormat === "acm") && (
          <button
            onClick={onToggleTwoColumn}
            className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
              twoColumn
                ? "bg-cyan/15 text-cyan border-cyan/30"
                : "border-border text-muted-foreground hover:bg-card"
            }`}
            title={twoColumn ? "Switch to single column" : "Switch to two-column format"}
          >
            <Columns className="h-4 w-4" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              <span>AI Assist</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border rounded-xl">
            <DropdownMenuLabel className="text-xs text-muted-foreground">AI Formatting Tools</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAiAction("standardize")} className="text-xs cursor-pointer">
              <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-400" />
              Standardize Bibliography
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAiAction("cleanKeywords")} className="text-xs cursor-pointer">
              <Layers className="mr-2 h-3.5 w-3.5 text-cyan" />
              Normalize Taxonomy Terms
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAiAction("romanize")} className="text-xs cursor-pointer">
              <AlignLeft className="mr-2 h-3.5 w-3.5 text-purple-400" />
              Auto-Structure Headings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_220)] to-[oklch(0.86_0.15_200)] px-3.5 py-2 text-xs font-medium text-[oklch(0.15_0.03_258)] shadow-sm hover:opacity-90 transition-opacity">
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-popover border-border rounded-xl">
            <DropdownMenuItem onClick={() => exportWordDoc(paperData, selectedFormat)} className="text-xs font-medium cursor-pointer">
              <FileText className="mr-2 h-4 w-4 text-cyan" />
              Download Word (.docx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()} className="text-xs font-medium cursor-pointer">
              <Printer className="mr-2 h-4 w-4 text-purple-400" />
              Export as PDF / Print
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadMarkdown} className="text-xs font-medium cursor-pointer">
              <FileCode className="mr-2 h-4 w-4 text-emerald-400" />
              Download Markdown (.md)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCopyText} className="text-xs font-medium cursor-pointer">
              {copied ? <Check className="mr-2 h-4 w-4 text-emerald-400" /> : <Copy className="mr-2 h-4 w-4 text-muted-foreground" />}
              Copy Formatted Text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
