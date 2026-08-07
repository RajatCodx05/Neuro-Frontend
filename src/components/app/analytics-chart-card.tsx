import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BarChart3, Maximize2, X } from "lucide-react";

import { cn } from "@/lib/utils";

// ---------- Clickable dashboard card ----------

export type AnalyticsChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  onExpand: () => void;
};

/**
 * Compact, clickable analytics widget. Hovering scales the card slightly;
 * clicking it opens the shared AnalyticsChartModal.
 */
export function AnalyticsChartCard({
  title,
  description,
  children,
  onExpand,
}: AnalyticsChartCardProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-haspopup="dialog"
      className="group glass flex w-full cursor-pointer flex-col rounded-2xl p-5 text-left transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <Maximize2
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
          aria-hidden
        />
      </div>
      <div className="mt-3 h-52 w-full">{children}</div>
    </button>
  );
}

// ---------- Placeholder for not-yet-implemented widgets ----------

export function AnalyticsChartPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-secondary/30 px-4",
        className,
      )}
    >
      <BarChart3 className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
        Coming soon
      </span>
      <span className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground/50">
        This analytics widget will be available in an upcoming release.
      </span>
    </div>
  );
}

// ---------- Reusable enlarged-chart modal ----------

export type AnalyticsChartModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional real-statistics panel rendered below the enlarged chart. */
  details?: React.ReactNode;
};

/**
 * Shared modal used by every analytics card. Shows the chart enlarged,
 * above a blurred dark overlay, and real statistics below. Dismissible via
 * the X button, clicking outside, or ESC.
 */
export function AnalyticsChartModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  details,
}: AnalyticsChartModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/60 bg-background px-6 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate font-display text-lg font-semibold tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [.light_&]:hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="px-6 pb-6 pt-5">
            {/* Enlarged chart occupies most of the modal */}
            <div className="h-[45vh] max-h-[460px] min-h-64 w-full">{children}</div>
            {/* Real statistics from backend data (no placeholder text) */}
            {details && <div className="mt-5">{details}</div>}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
