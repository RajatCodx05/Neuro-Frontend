import { useRef, type ChangeEvent } from "react";
import { Settings2, FileUp, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  onTemplateSelected: (name: string) => void;
}

export function CustomTemplateModal({ open, onOpenChange, templateName, onTemplateSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onTemplateSelected(file.name);
      onOpenChange(false);
      toast.success(`Custom template "${file.name}" applied successfully!`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-cyan" />
            Upload Custom Template (.docx)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload your university or conference Word template (.docx) to automatically apply institutional styles, fonts, and margins.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <input
            type="file"
            ref={inputRef}
            onChange={handleUpload}
            accept=".docx,.dotx"
            className="hidden"
          />
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-cyan/50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
          >
            <FileUp className="mx-auto h-8 w-8 text-cyan/70 mb-2" />
            <p className="text-sm font-medium">Click to select template (.docx)</p>
            <p className="text-xs text-muted-foreground mt-1">Supports IEEE, Nature, Springer, Elsevier, or Custom .docx</p>
          </div>
          {templateName && (
            <div className="rounded-xl bg-cyan/10 p-3 text-xs text-cyan flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Selected template: <b>{templateName}</b></span>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
