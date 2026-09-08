import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type AdminSearchItem, type AdminSearchDetail, type AdminAgentItem, type AdminTokenItem, type AdminExternalLog } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Search, X, Copy, Check,
  Clock, Database, Zap, DollarSign, AlertTriangle, Inbox,
  ExternalLink, Activity, FileText, BarChart3, TriangleAlert,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/admin/searches")({
  head: () => ({ meta: [{ title: "Admin · Search logs — NeuroSearch AI" }] }),
  component: SearchLogsPage,
});

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function fmtCost(cost: number | null | undefined, costAvailable: boolean | undefined): string {
  if (!costAvailable || cost == null) return "Pricing unavailable";
  if (cost === 0) return "$0.00";
  return `$${cost.toFixed(6)}`;
}

function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function SourceBadge({ source }: { source: AdminSearchItem["resultSource"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    cache: { label: "cache", cls: "bg-emerald-400/10 text-emerald-400" },
    merged: { label: "merged", cls: "bg-cyan/10 text-cyan" },
    fallback: { label: "fallback", cls: "bg-amber-400/10 text-amber-400" },
    out_of_domain: { label: "out-of-domain", cls: "bg-slate-400/10 text-slate-400" },
  };
  const { label, cls } = map[source] ?? { label: source, cls: "bg-white/10 text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono ${cls}`}>
      {label}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);
  return (
    <button
      onClick={copy}
      title={label ?? "Copy"}
      className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── Timing section ───────────────────────────────────────────────────────────

const TIMING_STAGES: Array<{ key: keyof NonNullable<AdminSearchItem["timings"]>; label: string; note?: string }> = [
  { key: "totalMs", label: "Total" },
  { key: "queryParsingMs", label: "Query parsing" },
  { key: "datasetRetrievalMs", label: "Dataset retrieval (MongoDB)" },
  { key: "catalogRetrievalMs", label: "Catalog retrieval (MongoDB)" },
  { key: "repositoryMs", label: "Repository (wall-clock)", note: "Wall-clock time — repository calls run in parallel, not summed" },
  { key: "discoveryMs", label: "Discovery / fallback" },
  { key: "rankingMs", label: "Ranking" },
];

function TimingsSection({ timings }: { timings: AdminSearchItem["timings"] }) {
  const totalMs = timings?.totalMs ?? null;
  // Build bar data: for each stage except total, compute contribution vs total for visual cue
  return (
    <div className="space-y-1">
      {TIMING_STAGES.map(({ key, label, note }) => {
        const val = timings?.[key];
        const isTotal = key === "totalMs";
        const showBar = !isTotal && val != null && totalMs != null && totalMs > 0;
        const pct = showBar ? Math.min(100, (val! / totalMs!) * 100) : 0;
        return (
          <div key={key} className="space-y-1 border-b border-border/40 py-2 last:border-0 text-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-muted-foreground">{label}</span>
                {note && <div className="text-[10px] text-muted-foreground/60 mt-0.5 leading-snug max-w-[260px]">{note}</div>}
              </div>
              <span className={`shrink-0 font-mono tabular-nums ${val == null ? "italic text-muted-foreground/60" : "text-foreground"}`}>
                {val == null ? "Skipped" : fmtMs(val)}
              </span>
            </div>
            {showBar && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5 [.light_&]:bg-black/5">
                <div className="h-full rounded-full bg-cyan/60" style={{ width: `${pct}%` }} />
              </div>
            )}
            {showBar && (
              <div className="text-[10px] text-muted-foreground/50 tabular-nums text-right">{pct.toFixed(1)}% of total</div>
            )}
          </div>
        );
      })}
      {totalMs == null && (
        <p className="text-[10px] text-muted-foreground/60 italic pt-1">Total time not recorded — stage bars unavailable.</p>
      )}
    </div>
  );
}

// ─── Provenance section ───────────────────────────────────────────────────────

const PROVENANCE_KEYS: Array<{ key: string; label: string; color: string; desc: string }> = [
  { key: "mongodb_dataset", label: "mongodb_dataset", color: "bg-emerald-400", desc: "MongoDB datasets" },
  { key: "mongodb_catalog", label: "mongodb_catalog", color: "bg-cyan", desc: "MongoDB catalog" },
  { key: "repository", label: "repository", color: "bg-violet-400", desc: "Live repository" },
  { key: "discovery", label: "discovery", color: "bg-amber-400", desc: "Discovery / fallback" },
];

function ProvenanceSection({ provenance, resultSource }: { provenance: AdminSearchItem["provenance"]; resultSource?: string }) {
  if (!provenance || Object.keys(provenance).length === 0) {
    return <p className="text-xs text-muted-foreground italic">No provenance recorded for this request.</p>;
  }
  const total = Object.values(provenance).reduce((a, v) => a + (v ?? 0), 0);
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground/70 italic">
        Four-way retrieval provenance — distinct from resultSource. <code className="font-mono">resultSource</code> describes the final delivery path; provenance counts how many hits came from each retrieval tier.
      </p>
      {resultSource && (
        <p className="text-[10px] text-muted-foreground/60">resultSource for this request: <span className="font-mono font-semibold text-foreground">{resultSource}</span></p>
      )}
      {PROVENANCE_KEYS.map(({ key, label, color, desc }) => {
        const count = (provenance as Record<string, number | undefined>)[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${color}`} />
                <code className="font-mono">{label}</code>
                <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">· {desc}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">{count} {total > 0 ? `(${pct.toFixed(0)}%)` : ""}</span>
            </div>
            {total > 0 && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5 [.light_&]:bg-black/5">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      })}
      {total > 0 && <p className="text-[10px] text-muted-foreground/60 tabular-nums pt-1">Total hits counted: {total}</p>}
    </div>
  );
}

// ─── Agent section ────────────────────────────────────────────────────────────

function AgentSection({ agents }: { agents: AdminAgentItem[] }) {
  if (agents.length === 0) return <p className="text-xs text-muted-foreground italic">No agent logs for this request.</p>;
  const failed = agents.filter((a) => a.status === "error").length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{agents.length} run{agents.length !== 1 ? "s" : ""}{failed > 0 ? ` · ${failed} failed` : ""}</span>
        <span className="text-[10px] text-muted-foreground/60 italic">Ordered by timestamp — not a workflow sequence</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/50">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 text-left whitespace-nowrap">Agent</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Provider / Model</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Query ID</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Duration</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Results</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {agents.map((a) => (
                <tr key={a._id} className={a.status === "error" ? "bg-rose-500/[0.04]" : ""}>
                  <td className="px-3 py-2 font-mono text-cyan whitespace-nowrap">{a.agent}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {a.provider ?? "—"}{a.model ? ` / ${a.model}` : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground/80 max-w-[120px] truncate" title={a.queryId ?? undefined}>
                    {a.queryId ? shortId(a.queryId) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtMs(a.durationMs)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.resultCount}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={a.status === "success" ? "inline-flex items-center rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400" : "inline-flex items-center rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400"}>{a.status}</span>
                    {a.errorMessage && <div className="text-[10px] text-rose-400/80 mt-0.5 max-w-[160px] break-words whitespace-normal">{a.errorMessage}</div>}
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {a.createdAt ? new Date(a.createdAt).toLocaleTimeString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Token section ────────────────────────────────────────────────────────────

function TokenSection({ tokens }: { tokens: AdminTokenItem[] }) {
  if (tokens.length === 0) return <p className="text-xs text-muted-foreground italic">No token usage for this request.</p>;
  const estimatedCount = tokens.filter((t) => t.usageType === "estimated").length;
  const actualCount = tokens.filter((t) => t.usageType === "actual").length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{tokens.length} record{tokens.length !== 1 ? "s" : ""} · {actualCount} actual · {estimatedCount} estimated</span>
        <span className="text-[10px] text-muted-foreground/60 italic">actual = provider-reported · estimated = heuristic</span>
      </div>
      <p className="text-[10px] text-muted-foreground/70 italic">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-emerald-400 font-semibold">actual</span>{" "}
        = provider-reported usage.{" "}
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-amber-400 font-semibold">estimated</span>{" "}
        = heuristic fallback — not provider-reported.
      </p>
      <div className="overflow-hidden rounded-xl border border-border/50">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 text-left whitespace-nowrap">Agent</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Provider</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Model</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Type</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">In</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Out</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Duration</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tokens.map((t) => {
                const duration = (t as unknown as { durationMs?: number }).durationMs;
                return (
                  <tr key={t._id} className={t.usageType === "estimated" ? "bg-amber-500/[0.03]" : ""}>
                    <td className="px-3 py-2 font-mono text-cyan whitespace-nowrap">{t.agent}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{t.provider ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[120px] truncate" title={t.model}>{t.model ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.usageType === "actual" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">actual</span>
                      ) : t.usageType === "estimated" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">estimated</span>
                      ) : (
                        <span className="text-muted-foreground/50 italic">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.inputTokens ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.outputTokens ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.totalTokens ?? (t as unknown as { tokens: number }).tokens ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{duration != null ? fmtMs(duration) : "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={(t as unknown as { status?: string }).status === "error" ? "text-rose-400" : "text-emerald-400"}>{(t as unknown as { status?: string }).status ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground whitespace-nowrap">
                      {t.cost?.costAvailable && t.cost?.totalCost != null
                        ? `$${t.cost.totalCost.toFixed(6)}`
                        : <span className="italic text-[11px]">Pricing unavailable</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── External API section ─────────────────────────────────────────────────────

function ExternalApiSection({ logs }: { logs: AdminExternalLog[] }) {
  if (logs.length === 0) return <p className="text-xs text-muted-foreground italic">No external API calls for this request.</p>;
  const total = logs.length;
  const success = logs.filter((l) => l.status === "success").length;
  const failed = total - success;
  const slowest = logs.reduce((max, l) => (l.durationMs > max.durationMs ? l : max), logs[0]);
  const avgMs = Math.round(logs.reduce((a, l) => a + l.durationMs, 0) / total);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Total calls", value: String(total) },
          { label: "Successful", value: String(success), cls: "text-emerald-400" },
          { label: "Failed", value: String(failed), cls: failed > 0 ? "text-rose-400" : "text-muted-foreground" },
          { label: "Slowest", value: fmtMs(slowest.durationMs), sub: `${slowest.service}/${slowest.operation}` },
        ].map(({ label, value, cls, sub }) => (
          <div key={label} className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className={`text-sm font-semibold tabular-nums ${cls ?? "text-foreground"}`}>{value}</div>
            {sub && <div className="text-[10px] text-muted-foreground/60 truncate">{sub}</div>}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Avg duration: {fmtMs(avgMs)}</span>
        <span className="text-[10px] text-muted-foreground/60 italic">Calls may have run in parallel — do not sum durations as latency</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/50">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2 text-left whitespace-nowrap">Service</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Operation</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Endpoint</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">Duration</th>
                <th className="px-3 py-2 text-center whitespace-nowrap">HTTP</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-right whitespace-nowrap">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {logs.map((l) => (
                <tr key={l._id} className={l.status === "error" ? "bg-rose-500/[0.04]" : ""}>
                  <td className="px-3 py-2 font-mono text-cyan whitespace-nowrap">{l.service}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{l.operation}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground/70 max-w-[140px] truncate" title={l.endpoint ?? undefined}>{l.endpoint ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{fmtMs(l.durationMs)}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{l.httpStatus ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={l.status === "success" ? "inline-flex items-center rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400" : "inline-flex items-center rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400"}>{l.status}</span>
                    {l.error && <div className="text-[10px] text-rose-400/80 max-w-[160px] break-words whitespace-normal">{l.error}</div>}
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    {l.createdAt ? new Date(l.createdAt).toLocaleTimeString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cost section ─────────────────────────────────────────────────────────────

function CostSection({ cost }: { cost: AdminSearchDetail["cost"] }) {
  if (!cost) return <p className="text-xs text-muted-foreground italic">Cost data not available for this request.</p>;
  if (!cost.costAvailable) {
    return (
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-400">
        <AlertTriangle className="mb-1 h-3.5 w-3.5 inline mr-1" />
        Pricing unavailable — cost cannot be calculated. This is not the same as zero cost.
        {(cost as unknown as { pricingAvailable?: boolean }).pricingAvailable === false && " No pricing configuration is set for this provider."}
      </div>
    );
  }
  const isEstimated = (cost as unknown as { isEstimated?: boolean }).isEstimated;
  return (
    <div className="space-y-2">
      {isEstimated && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-400">
          <TriangleAlert className="inline h-3 w-3 mr-1" /> Includes estimated token usage — cost is approximate.
        </div>
      )}
      <div className="space-y-1">
        {[
          { label: "Total cost", value: fmtCost(cost.totalCost, cost.costAvailable) },
          { label: "LLM cost", value: fmtCost(cost.llmCost, cost.costAvailable) },
          { label: "External API cost", value: fmtCost(cost.externalCost, cost.costAvailable) },
          { label: "Currency", value: (cost as unknown as { currency?: string }).currency ?? "USD" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between border-b border-border/40 py-2 last:border-0 text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 italic">null/unavailable → Pricing unavailable · $0 only when backend explicitly calculated zero</p>
    </div>
  );
}

// ─── Errors / Warnings aggregation ───────────────────────────────────────────

function ErrorsWarningsSection({ data }: { data: AdminSearchDetail }) {
  const warnings: Array<{ icon: string; text: string; tone: "error" | "warn" | "info" }> = [];
  const timings = data.timings;
  const skippedCount = timings ? Object.entries(timings).filter(([k, v]) => k !== "totalMs" && v == null).length : 0;

  const failedAgents = data.agentLogs.filter((a) => a.status === "error");
  if (failedAgents.length > 0) warnings.push({ icon: "agent", text: `${failedAgents.length} agent execution(s) failed`, tone: "error" });

  const failedExternal = data.externalLogs.filter((l) => l.status === "error");
  if (failedExternal.length > 0) warnings.push({ icon: "external", text: `${failedExternal.length} external API call(s) failed`, tone: "error" });

  const estimatedTokens = data.tokenUsages.filter((t) => (t as unknown as { usageType?: string }).usageType === "estimated");
  if (estimatedTokens.length > 0) warnings.push({ icon: "token", text: `${estimatedTokens.length} token record(s) use estimated usage — not provider-reported`, tone: "warn" });

  if (data.cost && !data.cost.costAvailable) warnings.push({ icon: "cost", text: "Pricing unavailable — cost cannot be calculated", tone: "warn" });

  if (data.queryLog?.resultSource === "out_of_domain") warnings.push({ icon: "domain", text: "Out-of-domain request — no dataset search performed", tone: "info" });

  if (skippedCount > 0) warnings.push({ icon: "timing", text: `${skippedCount} retrieval stage(s) skipped (cache/policy)`, tone: "info" });

  if (data.queryLog && data.queryLog.resultCount === 0) warnings.push({ icon: "results", text: "No results returned for this query", tone: "info" });

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-400">
        <Check className="h-4 w-4 shrink-0" />
        No errors or warnings detected for this request.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            w.tone === "error"
              ? "border-rose-500/20 bg-rose-500/5 text-rose-400"
              : w.tone === "warn"
                ? "border-amber-400/20 bg-amber-400/5 text-amber-400"
                : "border-border/50 bg-secondary/20 text-muted-foreground"
          }`}
        >
          {w.tone === "error" ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : w.tone === "warn" ? <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <Activity className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          <span>{w.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Result context ───────────────────────────────────────────────────────────

function ResultContextSection({ data }: { data: AdminSearchDetail }) {
  const q = data.queryLog;
  if (!q) return <p className="text-xs text-muted-foreground italic">No query log available for this request.</p>;
  const provenance = data.provenance;
  const totalProv = provenance ? Object.values(provenance).reduce((a, v) => a + (v ?? 0), 0) : 0;
  const hasProvenance = provenance && Object.keys(provenance).length > 0 && totalProv > 0;
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-3 space-y-2">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Result source</div>
          <div className="mt-1"><SourceBadge source={q.resultSource} /></div>
          <div className="text-[10px] text-muted-foreground/60 mt-1">Distinct from retrieval provenance</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Result count</div>
          <div className="mt-1 font-mono text-sm font-semibold tabular-nums">{q.resultCount}</div>
          <div className="text-[10px] text-muted-foreground/60 mt-1">{q.resultCount === 0 ? "No results" : `${q.resultCount} dataset(s)`}</div>
        </div>
      </div>
      {hasProvenance && (
        <div className="pt-2 border-t border-border/40">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Provenance distribution</div>
          <div className="flex gap-1 h-2 w-full overflow-hidden rounded-full">
            {PROVENANCE_KEYS.map(({ key, color }) => {
              const count = (provenance as Record<string, number>)[key] ?? 0;
              const pct = totalProv > 0 ? (count / totalProv) * 100 : 0;
              if (pct === 0) return null;
              return <div key={key} className={color} style={{ width: `${pct}%` }} title={`${key}: ${count}`} />;
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {PROVENANCE_KEYS.map(({ key, label, color }) => {
              const count = (provenance as Record<string, number>)[key] ?? 0;
              if (count === 0) return null;
              return (
                <span key={key} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  <code className="font-mono">{label}</code> {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared section wrapper ───────────────────────────────────────────────────

function DetailSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-cyan shrink-0" />
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Request Detail Drawer ────────────────────────────────────────────────────

function RequestDetailDrawer({ requestId, open, onClose }: {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search-detail", requestId],
    queryFn: () => api.admin.searches.detail(requestId!),
    enabled: open && !!requestId,
    staleTime: 30_000,
  });

  const navigateToFiltered = useCallback((path: string, rid: string) => {
    // Persist requestId for target page filter via sessionStorage + navigation
    try { sessionStorage.setItem("admin_requestId_filter", rid); } catch {}
    window.location.href = `${path}?requestId=${encodeURIComponent(rid)}`;
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            <Search className="h-4 w-4 text-cyan shrink-0" />
            <span>Request detail</span>
            {requestId && (
              <span className="flex items-center gap-1 rounded-lg bg-white/5 [.light_&]:bg-black/5 px-2 py-0.5 font-mono text-xs text-muted-foreground break-all">
                {requestId}
                <CopyButton value={requestId} label="Copy request ID" />
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-1 pb-4">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertTriangle className="h-6 w-6 text-rose-400" />
              <p className="text-sm text-muted-foreground">Failed to load request detail.</p>
              <p className="text-xs text-muted-foreground/60">The detail endpoint may be unavailable or the request ID was not found.</p>
            </div>
          ) : data ? (
            <div className="space-y-6 pt-2">
              {/* ── Request Summary ───────────────────────────────────── */}
              <DetailSection title="Request Summary" icon={FileText}>
                <div className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 space-y-3">
                  {/* Query */}
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Query</div>
                    <div className="mt-1 text-sm font-medium break-words whitespace-pre-wrap">{data.queryLog?.rawQuery ?? "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.queryLog && <SourceBadge source={data.queryLog.resultSource} />}
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {data.queryLog?.resultCount ?? 0} results
                    </span>
                    {data.queryLog?.resultSource === "out_of_domain" && (
                      <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">out-of-domain</span>
                    )}
                  </div>
                  {/* Meta row */}
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Request ID</div>
                      <div className="flex items-center gap-1 font-mono text-foreground break-all">
                        {data.requestId}
                        <CopyButton value={data.requestId} label="Copy request ID" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Timestamp</div>
                      <div className="text-foreground tabular-nums">{data.queryLog?.createdAt ? new Date(data.queryLog.createdAt).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                  {/* Filters */}
                  {(data.queryLog as unknown as { filters?: Record<string, unknown> })?.filters &&
                    Object.keys((data.queryLog as unknown as { filters: Record<string, unknown> }).filters).length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Filters</div>
                        <pre className="max-w-full overflow-x-auto rounded-lg bg-white/5 [.light_&]:bg-black/5 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                          {JSON.stringify((data.queryLog as unknown as { filters: Record<string, unknown> }).filters, null, 2)}
                        </pre>
                      </div>
                    )}
                  {(!(data.queryLog as unknown as { filters?: Record<string, unknown> })?.filters ||
                    Object.keys((data.queryLog as unknown as { filters: Record<string, unknown> }).filters ?? {}).length === 0) && (
                      <p className="text-xs italic text-muted-foreground/60">No filters applied for this request.</p>
                    )}
                </div>
              </DetailSection>

              {/* ── Performance Timeline ───────────────────────────────── */}
              <DetailSection title="Performance" icon={Clock}>
                <div className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-2">
                  <TimingsSection timings={data.timings ?? null} />
                </div>
              </DetailSection>

              {/* ── Retrieval & Provenance ─────────────────────────────── */}
              <DetailSection title="Retrieval & Provenance" icon={Database}>
                <div className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-3">
                  <ProvenanceSection provenance={data.provenance ?? null} resultSource={data.queryLog?.resultSource} />
                </div>
              </DetailSection>

              {/* ── Result Context ─────────────────────────────────────── */}
              <DetailSection title="Results" icon={Layers}>
                <ResultContextSection data={data} />
              </DetailSection>

              {/* ── Errors / Warnings ──────────────────────────────────── */}
              <DetailSection title="Errors & Warnings" icon={TriangleAlert}>
                <ErrorsWarningsSection data={data} />
              </DetailSection>

              {/* ── Agents ─────────────────────────────────────────────── */}
              <DetailSection title="Agents" icon={Zap}>
                <AgentSection agents={data.agentLogs} />
              </DetailSection>

              {/* ── External APIs ──────────────────────────────────────── */}
              <DetailSection title="External APIs" icon={ExternalLink}>
                <ExternalApiSection logs={data.externalLogs} />
              </DetailSection>

              {/* ── Tokens ─────────────────────────────────────────────── */}
              <DetailSection title="Token Usage" icon={BarChart3}>
                <TokenSection tokens={data.tokenUsages as unknown as AdminTokenItem[]} />
              </DetailSection>

              {/* ── Cost ───────────────────────────────────────────────── */}
              <DetailSection title="Cost" icon={DollarSign}>
                <CostSection cost={data.cost} />
              </DetailSection>

              {/* ── Investigation workflow ─────────────────────────────── */}
              <div className="rounded-xl border border-border/50 bg-secondary/10 px-4 py-3 space-y-2">
                <div className="text-xs font-semibold">Investigate further</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(data.requestId).catch(() => {}); }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
                  >
                    <Copy className="h-3 w-3" /> Copy request ID
                  </button>
                  <button
                    onClick={() => navigateToFiltered("/admin/agents", data.requestId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
                  >
                    <Zap className="h-3 w-3" /> View agents by this ID
                  </button>
                  <button
                    onClick={() => navigateToFiltered("/admin/tokens", data.requestId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
                  >
                    <BarChart3 className="h-3 w-3" /> View tokens by this ID
                  </button>
                  <button
                    onClick={() => navigateToFiltered("/admin/infrastructure", data.requestId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
                  >
                    <Activity className="h-3 w-3" /> View external logs
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/60">Uses GET /admin/searches/:requestId as the authoritative source — no duplicate telemetry fetches.</p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SearchLogsPage() {
  const [page, setPage] = useState(1);
  const [resultSource, setResultSource] = useState("");
  const [queryText, setQueryText] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const offset = (page - 1) * PAGE_SIZE;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-searches", resultSource, queryText, page],
    queryFn: () => api.admin.searches.list({
      resultSource: resultSource || undefined,
      q: queryText || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    staleTime: 15_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openDetail = useCallback((requestId: string | null) => {
    if (!requestId) return;
    setSelectedId(requestId);
    setDrawerOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const applyQuery = useCallback(() => {
    setQueryText(inputText);
    setPage(1);
  }, [inputText]);

  return (
    <>
      <AdminPageHeader
        title="Search logs"
        description={isLoading ? "Loading…" : `${total.toLocaleString()} requests`}
      />
      <div className="space-y-4 px-6 py-6 md:px-8">
        {/* Filters */}
        <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 min-w-48">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyQuery()}
              placeholder="Filter by query text…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {inputText && (
              <button onClick={() => { setInputText(""); setQueryText(""); setPage(1); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground shrink-0">Source:</span>
            <select
              value={resultSource}
              onChange={(e) => { setResultSource(e.target.value); setPage(1); }}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-foreground outline-none focus:border-cyan/50 cursor-pointer"
            >
              <option value="" className="bg-[oklch(0.18_0.02_258)]">All sources</option>
              <option value="cache" className="bg-[oklch(0.18_0.02_258)]">cache</option>
              <option value="merged" className="bg-[oklch(0.18_0.02_258)]">merged</option>
              <option value="fallback" className="bg-[oklch(0.18_0.02_258)]">fallback</option>
              <option value="out_of_domain" className="bg-[oklch(0.18_0.02_258)]">out_of_domain</option>
            </select>
          </div>
          <button
            onClick={applyQuery}
            className="rounded-xl bg-cyan/10 px-3 py-1.5 text-sm font-medium text-cyan hover:bg-cyan/20 transition"
          >
            Apply
          </button>
        </div>

        {/* Table */}
        <div className="glass overflow-hidden rounded-2xl">
          {/* Pagination header */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-b border-white/5 [.light_&]:border-black/5 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 [.light_&]:hover:bg-black/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-white/5 [.light_&]:border-black/5">
                  <th className="px-4 py-3 text-left whitespace-nowrap">When</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Request ID</th>
                  <th className="px-4 py-3 text-left">Query</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Source</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Results</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 [.light_&]:divide-black/5">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded font-mono" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-48 rounded" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-8 rounded" /></div></td>
                      <td className="px-4 py-3"><div className="flex justify-end"><Skeleton className="h-4 w-14 rounded" /></div></td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                      <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-rose-400" />
                      Failed to load search logs. Please try again.
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center">
                      <Inbox className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No search logs recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => openDetail(item.requestId)}
                      className="cursor-pointer hover:bg-white/[0.025] [.light_&]:hover:bg-black/[0.025] transition"
                      title={item.requestId ? `Request ID: ${item.requestId}` : undefined}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {item.requestId ? (
                          <span className="flex items-center gap-0.5 font-mono text-xs text-muted-foreground">
                            {shortId(item.requestId)}
                            <span onClick={(e) => e.stopPropagation()}>
                              <CopyButton value={item.requestId} label="Copy request ID" />
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="line-clamp-1 text-sm break-words">{item.rawQuery}</span>
                      </td>
                      <td className="px-4 py-3">
                        <SourceBadge source={item.resultSource} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {item.resultCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {fmtMs(item.timings?.totalMs)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestDetailDrawer
        requestId={selectedId}
        open={drawerOpen}
        onClose={closeDetail}
      />
    </>
  );
}
