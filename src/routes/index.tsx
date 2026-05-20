import { createFileRoute } from "@tanstack/react-router";
import { DmaicCompanion } from "@/components/DmaicCompanion";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Smart DMAIC Project Companion" },
      { name: "description", content: "Generate a tailored Lean Six Sigma DMAIC roadmap from your business problem." },
    ],
  }),
});

function Index() {
  return <DmaicCompanion />;
}
