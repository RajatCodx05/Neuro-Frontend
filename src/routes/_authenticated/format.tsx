import { createFileRoute } from "@tanstack/react-router";
import { PaperFormatter } from "@/components/format/paper-formatter";

export const Route = createFileRoute("/_authenticated/format")({
  component: PaperFormatter,
});
