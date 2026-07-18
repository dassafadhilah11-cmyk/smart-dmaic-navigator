import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateRoadmap } from "@/lib/dmaic.functions";

export default defineTool({
  name: "generate_dmaic_roadmap",
  title: "Generate DMAIC Roadmap",
  description:
    "Generate a full Lean Six Sigma DMAIC roadmap (Define/Measure/Analyze/Improve/Control) tailored to a specific business or operational problem. Returns the project charter, SIPOC, CTQs, 5 Whys, Fishbone (6M), improvement actions, and control plan in Bahasa Indonesia.",
  inputSchema: {
    problem: z
      .string()
      .min(3)
      .max(2000)
      .describe("The business or operational problem to analyze (Bahasa Indonesia or English)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ problem }) => {
    const result = await generateRoadmap({ data: { problem } });
    if (!result.ok) {
      return { content: [{ type: "text", text: result.error }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result.roadmap, null, 2) }],
      structuredContent: { roadmap: result.roadmap },
    };
  },
});