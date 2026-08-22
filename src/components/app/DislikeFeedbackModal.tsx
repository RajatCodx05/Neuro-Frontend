import { useState } from "react";
import { X, ThumbsDown } from "lucide-react";

// ponytail: keep reason IDs in sync with backend VALID_REASONS in
// datasetDislikeFeedback.model.js
export const DISLIKE_REASONS = [
  { id: "metadata_incorrect",    label: "Incorrect metadata (species, modality, etc.)" },
  { id: "data_incomplete",       label: "Dataset appears incomplete or missing files" },
  { id: "quality_concern",       label: "Low quality or corrupted data" },
  { id: "duplicate",             label: "Duplicate dataset entry" },
  { id: "broken_link",           label: "Broken or inaccessible source link" },
  { id: "wrong_modality_disease",label: "Wrong modality or disease classification" },
  { id: "irrelevant",            label: "Irrelevant to neuroscience research" },
  { id: "other",                 label: "Other issue" },
] as const;

export type DislikeReasonId = typeof DISLIKE_REASONS[number]["id"];

interface Props {
  datasetName: string;
  onSubmit: (reason: DislikeReasonId, comment: string | null) => Promise<void>;
  onCancel: () => void;
}

export function DislikeFeedbackModal({ datasetName, onSubmit, onCancel }: Props) {
  const [reason, setReason] = useState<DislikeReasonId | "">("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const commentRequired = reason === "other";
  const trimmedComment = comment.trim();

  const validate = (): string | null => {
    if (!reason) return "Please select a reason.";
    if (commentRequired && !trimmedComment) return "Please describe the issue when selecting \"Other issue\".";
    if (trimmedComment.length > 1000) return "Additional details must not exceed 1000 characters.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(reason as DislikeReasonId, trimmedComment || null);
      // parent closes modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div
        className="glass card-elevated w-full max-w-md rounded-2xl p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dislike-modal-title"
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ThumbsDown className="h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <h2 id="dislike-modal-title" className="text-sm font-semibold text-foreground">
                What's the issue with this dataset?
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1" title={datasetName}>
                {datasetName}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 [.light_&]:border-black/15 text-muted-foreground hover:bg-white/10 [.light_&]:hover:bg-black/5 disabled:opacity-40 transition-colors"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Reason radio list */}
          <fieldset className="space-y-1.5" disabled={loading}>
            <legend className="sr-only">Select a reason</legend>
            {DISLIKE_REASONS.map(({ id, label }) => (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  reason === id
                    ? "border-rose-500/50 bg-rose-500/10 text-foreground"
                    : "border-white/5 [.light_&]:border-black/10 bg-white/[0.02] text-muted-foreground hover:border-white/10 hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="dislike-reason"
                  value={id}
                  checked={reason === id}
                  onChange={() => { setReason(id); setError(null); }}
                  className="accent-rose-400"
                />
                {label}
              </label>
            ))}
          </fieldset>

          {/* Comment textarea */}
          <div className="mt-4">
            <label
              htmlFor="dislike-comment"
              className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground font-mono"
            >
              Additional details
              {commentRequired ? <span className="ml-1 text-rose-400">*</span> : <span className="ml-1 opacity-50">(optional)</span>}
            </label>
            <textarea
              id="dislike-comment"
              rows={3}
              maxLength={1001}
              disabled={loading}
              value={comment}
              onChange={(e) => { setComment(e.target.value); setError(null); }}
              placeholder={
                commentRequired
                  ? "Describe the issue in detail…"
                  : "Any additional context for our team… (optional)"
              }
              className="w-full resize-none rounded-xl border border-white/10 [.light_&]:border-black/15 bg-white/[0.03] [.light_&]:bg-black/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-500/40 focus:outline-none disabled:opacity-50"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
              <span>{comment.length > 900 ? `${comment.length}/1000` : ""}</span>
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-full border border-white/10 [.light_&]:border-black/15 bg-white/5 [.light_&]:bg-black/[0.04] px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-white/10 [.light_&]:hover:bg-black/[0.08] disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 border border-rose-500/30 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/25 disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
