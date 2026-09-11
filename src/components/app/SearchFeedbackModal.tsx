import { useState } from "react";
import { X } from "lucide-react";

export const SEARCH_FEEDBACK_OPTIONS = [
  "Incorrect or incomplete",
  "Not what I asked for",
  "Slow or buggy",
  "Style or tone",
  "Safety or legal concern",
  "Other",
] as const;

interface Props {
  query: string;
  onSubmit: (selectedOptions: string[], comment: string | null) => Promise<void>;
  onCancel: () => void;
}

export function SearchFeedbackModal({ query, onSubmit, onCancel }: Props) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleOption = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedComment = comment.trim();
    if (selectedOptions.length === 0 && !trimmedComment) {
      setError("Please select at least one issue or share details.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(selectedOptions, trimmedComment || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition-all [.dark_&]:bg-slate-900 [.dark_&]:border [.dark_&]:border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-feedback-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 [.dark_&]:text-slate-400 [.dark_&]:hover:bg-white/10 [.dark_&]:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-5 pr-8">
          <h2
            id="search-feedback-modal-title"
            className="text-lg font-semibold tracking-tight text-slate-900 [.dark_&]:text-white"
          >
            Share feedback
          </h2>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Tag Pills Grid */}
          <div className="flex flex-wrap gap-2">
            {SEARCH_FEEDBACK_OPTIONS.map((option) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  disabled={loading}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm [.dark_&]:bg-cyan [.dark_&]:text-slate-950 [.dark_&]:font-semibold"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 [.dark_&]:border-white/10 [.dark_&]:bg-white/5 [.dark_&]:text-slate-300 [.dark_&]:hover:bg-white/10"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <div>
            <textarea
              rows={4}
              maxLength={1000}
              disabled={loading}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setError(null);
              }}
              placeholder="Share details (optional)"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none [.dark_&]:border-white/10 [.dark_&]:bg-white/5 [.dark_&]:text-white [.dark_&]:placeholder:text-slate-500 [.dark_&]:focus:border-cyan/50"
            />
          </div>

          {/* Banner Notice */}
          <div className="rounded-2xl bg-slate-100/80 p-3.5 text-xs text-slate-600 [.dark_&]:bg-white/5 [.dark_&]:text-slate-400">
            <span>
              Your search query and results will be included with your feedback to help improve search response accuracy.{" "}
              <a
                href="#learn-more"
                onClick={(e) => e.preventDefault()}
                className="underline hover:text-slate-900 [.dark_&]:hover:text-white"
              >
                Learn more
              </a>
            </span>
          </div>

          {/* Inline Error */}
          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600 [.dark_&]:border-rose-500/20 [.dark_&]:bg-rose-500/10 [.dark_&]:text-rose-400">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-slate-400 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-900 disabled:opacity-50 [.dark_&]:bg-cyan [.dark_&]:text-slate-950 [.dark_&]:hover:bg-cyan/90"
            >
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
