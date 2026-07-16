import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminPageHeader } from "@/components/app/admin-shell";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics — NeuroSearch AI" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.admin.analytics(), // TODO: confirm Node path /admin/analytics
  });

  const kpis = [
    { label: "Total users", value: data?.users ?? "—" },
    { label: "Saved datasets", value: data?.saved ?? "—" },
    { label: "Collections", value: data?.collections ?? "—" },
    { label: "Searches (30d)", value: data?.series.slice(-30).reduce((a, r) => a + r.count, 0) ?? "—" },
  ];

  return (
    <>
      <AdminPageHeader title="Analytics & reports" description="Platform-wide engagement metrics" />
      <div className="space-y-6 px-6 py-6 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Searches over time</div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.series ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: "rgba(20,25,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="count" stroke="oklch(0.82 0.16 210)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Daily activity</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data?.series ?? []).slice(-30)}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: "rgba(20,25,40,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="count" fill="oklch(0.7 0.18 300)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
