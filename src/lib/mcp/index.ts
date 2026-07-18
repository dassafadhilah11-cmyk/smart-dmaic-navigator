import { defineMcp } from "@lovable.dev/mcp-js";
import generateDmaicRoadmapTool from "./tools/generate-dmaic-roadmap";

export default defineMcp({
  name: "smart-dmaic-navigator-mcp",
  title: "Smart DMAIC Project Companion",
  version: "0.1.0",
  instructions:
    "Tools for the Smart DMAIC Project Companion. Use `generate_dmaic_roadmap` to produce a tailored Lean Six Sigma DMAIC roadmap (charter, SIPOC, CTQs, root cause analysis, improvement actions, control plan) for a given business or operational problem.",
  tools: [generateDmaicRoadmapTool],
});