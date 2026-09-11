import { useState, useRef, useEffect } from "react";
import { Copy, Check, ThumbsUp, ThumbsDown, Share2, RotateCcw, MoreHorizontal } from "lucide-react";
import { api } from "@/lib/api-client";
import { SearchFeedbackModal } from "./SearchFeedbackModal";
import { toast } from "sonner";

interface Props {
  query: string;
  resultCount: number;
  activeFilters?: Record<string, unknown>;
  onRefresh?: () => void;
}

export function SearchResponseActionBar({ query, resultCount, activeFilters, onRefresh }: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<"good" | "bad" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopy = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Search URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: `Search results for ${query}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard!");
      }
    } catch {
      // User cancelled share
    }
  };

  const handleSelectGood = async () => {
    setMenuOpen(false);
    if (userRating === "good") {
      // Toggle off
      setUserRating(null);
      try {
        await api.searchFeedback.submit({
          query,
          filters: activeFilters,
          rating: "none",
          resultCount,
        });
      } catch {
        // silent
      }
      return;
    }

    setUserRating("good");
    toast.success("Response rated as good!");
    try {
      await api.searchFeedback.submit({
        query,
        filters: activeFilters,
        rating: "good",
        resultCount,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rating failed");
    }
  };

  const handleSelectBad = () => {
    setMenuOpen(false);
    setModalOpen(true);
  };

  const handleModalSubmit = async (selectedOptions: string[], comment: string | null) => {
    setUserRating("bad");
    try {
      await api.searchFeedback.submit({
        query,
        filters: activeFilters,
        rating: "bad",
        reasons: selectedOptions,
        comment,
        resultCount,
      });
      toast.success("Thank you for your feedback!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Feedback submission failed");
    } finally {
      setModalOpen(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1">
      {/* Container row matching Image 1 */}
      <div className="flex items-center gap-1 rounded-full p-0.5">
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          type="button"
          className="relative grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-400 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
          title="Copy response link"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>

        {/* Rating Button with Popover (Image 1, 3) */}
        <div
          ref={menuRef}
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            type="button"
            className={`relative grid h-8 w-8 place-items-center rounded-lg transition-colors ${
              userRating === "good"
                ? "bg-slate-200 text-slate-900 [.dark_&]:bg-white/20 [.dark_&]:text-white shadow-sm"
                : userRating === "bad"
                  ? "bg-rose-100 text-rose-700 [.dark_&]:bg-rose-500/20 [.dark_&]:text-rose-300 shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-400 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white"
            }`}
            aria-label="Rate response"
          >
            {userRating === "good" ? (
              <ThumbsUp className="h-4 w-4 fill-current text-slate-900 [.dark_&]:text-cyan" />
            ) : userRating === "bad" ? (
              <ThumbsDown className="h-4 w-4 fill-current text-rose-600 [.dark_&]:text-rose-400" />
            ) : (
              <div className="flex items-center gap-0.5">
                <ThumbsUp className="h-3.5 w-3.5" />
              </div>
            )}
          </button>

          {/* Hover Tooltip: "Rate response" (Image 1) */}
          {showTooltip && !menuOpen && (
            <div className="pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg [.dark_&]:bg-slate-800 z-30">
              Rate response
            </div>
          )}

          {/* Floating Dropdown Dialog (Image 1) */}
          {menuOpen && (
            <div className="absolute left-0 bottom-full mb-2 z-40 w-44 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-xl backdrop-blur-md [.dark_&]:border-white/10 [.dark_&]:bg-slate-900/95 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={handleSelectGood}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-200 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
              >
                <ThumbsUp className={`h-4 w-4 ${userRating === "good" ? "fill-current text-cyan" : ""}`} />
                Good response
              </button>
              <button
                type="button"
                onClick={handleSelectBad}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-200 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
              >
                <ThumbsDown className={`h-4 w-4 ${userRating === "bad" ? "fill-current text-rose-500" : ""}`} />
                Bad response
              </button>
            </div>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-400 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
          title="Share search response"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {/* Regenerate / Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-400 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
            title="Search again"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {/* More Button */}
        <button
          type="button"
          onClick={handleShare}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-400 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
          title="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Modal dialog for Bad response (Image 4) */}
      {modalOpen && (
        <SearchFeedbackModal
          query={query}
          onSubmit={handleModalSubmit}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
