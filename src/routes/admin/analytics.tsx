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
    queryFn: () => api.admin.analytics(),
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
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    color: "var(--popover-foreground)",
                    borderRadius: 12,
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)"
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--cyan)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold">Daily activity</div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data?.series ?? []).slice(-30)}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    color: "var(--popover-foreground)",
                    borderRadius: 12,
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)"
                  }}
                  itemStyle={{ color: "var(--foreground)" }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Bar dataKey="count" fill="var(--electric)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
