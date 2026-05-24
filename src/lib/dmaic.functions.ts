import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  problem: z.string().min(3).max(2000),
});

const SYSTEM_PROMPT = `You are "Sigma-X", an aggressive senior Lean Six Sigma Master Black Belt consultant with 20+ years of brutally candid factory-floor, service-ops, and digital-product experience.

PERSONA RULES (apply to every text field you generate):
- Speak like a no-nonsense consultant who CHALLENGES the user. Do not be polite filler.
- Drop one sharp, industry-specific operational insight inside the problem restatement, the SMART goal, or the CTQ questions (e.g. "most plants ignore the second-shift handover — that's where 40% of your defects are born").
- Use Bahasa Indonesia for ALL output text. Keep tone confident, direct, slightly provocative.

INDUSTRY CLASSIFICATION (MANDATORY first step):
Detect the industry from the problem text and set "domain" to ONE of:
  - "food"     → manufacturing, F&B production, pabrik, produksi fisik, kemasan
  - "defect"   → general manufacturing defects, reject, kualitas produk fisik
  - "delay"    → service ops: antrian, lead time, keterlambatan layanan, logistik
  - "service"  → customer service, komplain pelanggan, hospitality, retail front-line
  - "generic"  → digital / SaaS / software / website / app / online product issues

GOAL VARIATION (CRITICAL — do NOT default to 50%):
Calculate "goalPct" as an integer between 30 and 70 based on problem SEVERITY signals in the text:
  - mild wording (sedikit, agak, kecil)               → 30–40%
  - moderate (meningkat, naik, perlu perbaikan)       → 45–55%
  - severe (parah, drastis, krisis, hilang pelanggan) → 60–70%
Pick a non-round number sometimes (e.g. 37, 52, 64) — never always 50.

SCOPE MUST BE INDUSTRY-SPECIFIC AND DRASTICALLY DIFFERENT:
- Manufacturing (food/defect): scope around lines, shifts, raw material, SOP, kalibrasi mesin, supplier; out-of-scope is desain produk, capex, marketing, distribusi retail.
- Service (delay/service): scope around frontline staff, SLA, queue routing, scripts, training, jam sibuk; out-of-scope is product pricing, brand, IT infrastructure, HR policy.
- Digital (generic): scope around UX flow, API latency, conversion funnel, on-call rotation, feature flags, deploy pipeline; out-of-scope is hardware procurement, office layout, physical inventory.
NEVER reuse generic scope items across industries.

SIPOC — STRICT LOGICAL CONTINUITY (CRITICAL):
You MUST emit a SIPOC where every column is causally chained, not a random list:
  1. First decide "process": 4 ordered, end-to-end steps of the ACTUAL workflow the problem lives in (industry-specific verbs).
  2. "inputs" (exactly 4): each input must be a concrete material/data/resource that is CONSUMED by one of the process steps. Order inputs so input[i] feeds into process[i] when possible.
  3. "suppliers" (exactly 4): each supplier MUST be the party that delivers the corresponding inputs[i]. supplier[i] → inputs[i]. Never list a supplier whose input is not in the inputs column.
  4. "outputs" (exactly 4): each output must be a concrete deliverable PRODUCED by one of the process steps. Order outputs so process[i] produces outputs[i] when possible.
  5. "customers" (exactly 4): each customer MUST be the party that RECEIVES the corresponding outputs[i]. customers[i] ← outputs[i]. Never list a customer who does not receive a listed output.
All five columns must stay strictly inside the detected industry (manufacturing vs service vs digital — never mix).

OUTPUT: Call the tool "emit_roadmap" exactly once with a fully populated payload. Every list must have the required number of items. Be specific, not generic.`;

const roadmapTool = {
  type: "function" as const,
  function: {
    name: "emit_roadmap",
    description: "Emit the complete DMAIC roadmap for the user's problem.",
    parameters: {
      type: "object",
      properties: {
        problem: { type: "string", description: "Sharpened, consultant-style restatement of the user's problem in Bahasa Indonesia (1-3 sentences, include one challenging insight)." },
        domain: { type: "string", enum: ["food", "defect", "delay", "service", "generic"] },
        goalPct: { type: "integer", minimum: 30, maximum: 70, description: "Realistic reduction target % varied by severity. AVOID always 50." },
        timelineWeeks: { type: "integer", description: "Always 12." },
        ctqs: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" }, description: "4 Critical-to-Quality probing questions, industry-specific, in Bahasa Indonesia." },
        actions: {
          type: "array", minItems: 3, maxItems: 4,
          items: {
            type: "object",
            properties: {
              failure: { type: "string" },
              solution: { type: "string" },
              method: { type: "string" },
            },
            required: ["failure", "solution", "method"],
            additionalProperties: false,
          },
        },
        pokaYoke: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" }, description: "Industry-specific mistake-proofing mechanisms." },
        inScope: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" }, description: "Industry-specific in-scope items. Manufacturing ≠ Service ≠ Digital." },
        outScope: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" }, description: "Industry-specific out-of-scope items, drastically different per industry." },
        sipoc: {
          type: "object",
          description: "SIPOC with strict row-aligned continuity. suppliers[i] delivers inputs[i] into process[i] which produces outputs[i] consumed by customers[i].",
          properties: {
            suppliers: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
            inputs:    { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
            process:   { type: "array", minItems: 4, maxItems: 4, items: { type: "string" }, description: "4 ordered process steps." },
            outputs:   { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
            customers: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
          },
          required: ["suppliers", "inputs", "process", "outputs", "customers"],
          additionalProperties: false,
        },
      },
      required: ["problem", "domain", "goalPct", "timelineWeeks", "ctqs", "actions", "pokaYoke", "inScope", "outScope", "sipoc"],
    },
  },
};

export const generateRoadmap = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "LOVABLE_API_KEY tidak dikonfigurasi." };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Masalah dari user:\n\n"${data.problem}"\n\nBuat roadmap DMAIC. Ingat: variasikan goalPct (30–70 berdasarkan severity), klasifikasikan industri dengan tepat, dan buat scope yang sangat berbeda per industri. Tantang user dengan insight tajam.` },
          ],
          tools: [roadmapTool],
          tool_choice: { type: "function", function: { name: "emit_roadmap" } },
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Terlalu banyak permintaan. Coba lagi sebentar." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "Kredit Lovable AI habis. Tambahkan kredit di Settings → Workspace → Usage." };
      }
      if (!res.ok) {
        const txt = await res.text();
        console.error("AI gateway error:", res.status, txt);
        return { ok: false as const, error: `AI gateway error (${res.status}): ${txt.slice(0, 300)}` };
      }

      const json = await res.json();
      const call = json?.choices?.[0]?.message?.tool_calls?.[0];
      const argsStr = call?.function?.arguments;
      if (!argsStr) {
        return { ok: false as const, error: "AI tidak mengembalikan struktur yang diharapkan." };
      }
      const roadmap = JSON.parse(argsStr);
      return { ok: true as const, roadmap };
    } catch (e) {
      console.error("generateRoadmap failed:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "Gagal menghasilkan roadmap." };
    }
  });