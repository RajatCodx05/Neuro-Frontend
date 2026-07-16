import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/assistant")({
  head: () => ({ meta: [{ title: "Admin · Assistant — NeuroSearch AI" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const { data } = useQuery({
    queryKey: ["assistant-oversight"],
    queryFn: async () => {
      const recent = await api.admin.queries.recent(30); // TODO: confirm Node path, limit 30 preserved
      return { recent };
    },
  });

  return (
    <>
      <AdminPageHeader title="AI assistant oversight" description="Recent user queries flowing through the assistant" />
      <div className="space-y-6 px-6 py-6 md:px-8">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-4 w-4 text-cyan" /> Agent pipeline
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The Fallback Agent orchestrates a Search Provider Agent and a Link Verifier Agent. See per-agent
            activity in <a href="/admin/agents" className="text-cyan hover:underline">Agent activity</a> and per-model
            token use in <a href="/admin/tokens" className="text-cyan hover:underline">Token usage</a>.
          </p>
        </div>

        <section>
          <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent queries</div>
          <div className="glass divide-y divide-white/5 rounded-2xl">
            {(data?.recent ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0 flex-1 truncate">{row.query}</div>
                <div className="shrink-0 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</div>
              </div>
            ))}
            {(!data?.recent.length) && <div className="p-6 text-sm text-muted-foreground">No queries yet.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
