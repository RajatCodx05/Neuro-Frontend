import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/app/admin-shell";

export const Route = createFileRoute("/admin/assistant")({
  head: () => ({ meta: [{ title: "Admin · Assistant — NeuroSearch AI" }] }),
  component: () => null,
});
