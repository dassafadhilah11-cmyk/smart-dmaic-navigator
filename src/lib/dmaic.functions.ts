import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  problem: z.string().min(3).max(2000),
});

const SYSTEM_PROMPT = `You are "Sigma-X", a senior Lean Six Sigma Master Black Belt consultant with 20+ years of manufacturing, service-ops, and digital-product experience.

TONE RULES (apply to every text field you generate):
- Use professional, objective business language suitable for an executive project charter.
- Be confident, concise, and analytical. State facts and operational implications — do NOT use emotional, sarcastic, mocking, or provocative phrases (forbidden examples: "jelas memalukan", "jangan kaget", "memalukan", "parah banget", "konyol", "kacau balau", "bikin malu").
- You MAY include ONE concrete, neutral industry insight inside the problem restatement or CTQ questions, phrased as an observation (e.g. "Data lapangan menunjukkan bahwa handover shift kedua kerap menjadi titik kritis kecacatan").
- Use Bahasa Indonesia for ALL output text. Maintain a formal, consultative register throughout.

INDUSTRY CLASSIFICATION (MANDATORY first step):
Detect the industry from the problem text and set "domain" to ONE of:
  - "food"     → manufacturing, F&B production, pabrik, produksi fisik, kemasan
  - "defect"   → general manufacturing defects, reject, kualitas produk fisik
  - "delay"    → service ops: antrian, lead time, keterlambatan layanan, logistik
  - "service"  → customer service, komplain pelanggan, hospitality, retail front-line
  - "generic"  → digital / SaaS / software / website / app / online product issues

GOAL VARIATION (CRITICAL — do NOT default to 50%):
Calculate "goalPct" as an integer between 30 and 70 based on problem SEVERITY signals in the text. If the user explicitly states a current rate (e.g. "15%"), choose a goalPct that yields a meaningful, realistic reduction relative to that rate:
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

METRIC NOUNS (for Data Collection Plan):
For each CTQ question you emit, also emit a SHORT measurable parameter noun (2–4 words, no question marks, no verbs like "Berapa/Bagaimana"). Examples: "Kekentalan Lem", "Suhu Ruangan", "Cycle Time Packing", "Defect Rate per Batch", "Response Time CS". Use Bahasa Indonesia. Provide exactly 4 nouns, aligned by index with ctqs.

ROOT CAUSE ANALYSIS (5 Whys + Fishbone 6M):
- "fiveWhys": exactly 5 strings forming a logical causal chain. Each string starts with "Why N: <pertanyaan>" followed by " — <jawaban singkat>" so the chain drills from the visible symptom down to a systemic root cause. Tailor strictly to the detected industry and the user's specific problem.
- "fishbone": object with EXACTLY these 6 keys: manpower, machine, method, material, measurement, motherNature. Each value is an array of 2–3 concrete potential causes (short noun phrases, Bahasa Indonesia) for the problem, industry-specific. "motherNature" = environment/lingkungan (suhu, kelembapan, kebisingan, jam sibuk, dsb).

OUTPUT: Call the tool "emit_roadmap" exactly once with a fully populated payload. Every list must have the required number of items. Be specific, not generic.`;

const roadmapTool = {
  type: "function" as const,
  function: {
    name: "emit_roadmap",
    description: "Emit the complete DMAIC roadmap for the user's problem.",
    parameters: {
      type: "object",
      properties: {
        problem: { type: "string", description: "Professional, objective restatement of the user's problem in Bahasa Indonesia (1-3 sentences). Preserve any explicit numeric figures (percentages, counts) from the user input. No emotional or sarcastic language." },
        domain: { type: "string", enum: ["food", "defect", "delay", "service", "generic"] },
        goalPct: { type: "integer", minimum: 30, maximum: 70, description: "Realistic reduction target % varied by severity. AVOID always 50." },
        timelineWeeks: { type: "integer", description: "Always 12." },
        ctqs: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" }, description: "4 Critical-to-Quality probing questions, industry-specific, in Bahasa Indonesia." },
        metricNouns: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" }, description: "4 short measurable parameter nouns (2–4 words) aligned by index with ctqs. No question marks." },
        fiveWhys: { type: "array", minItems: 5, maxItems: 5, items: { type: "string" }, description: "5 Whys chain. Each item: 'Why N: <pertanyaan> — <jawaban>'." },
        fishbone: {
          type: "object",
          description: "Fishbone 6M categories with 2–3 potential causes each.",
          properties: {
            manpower:      { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
            machine:       { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
            method:        { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
            material:      { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
            measurement:   { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
            motherNature:  { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
          },
          required: ["manpower", "machine", "method", "material", "measurement", "motherNature"],
          additionalProperties: false,
        },
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
      required: ["problem", "domain", "goalPct", "timelineWeeks", "ctqs", "metricNouns", "fiveWhys", "fishbone", "actions", "pokaYoke", "inScope", "outScope", "sipoc"],
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
          { role: "user", content: `Masalah dari user:\n\n"${data.problem}"\n\nBuat roadmap DMAIC dengan bahasa profesional dan objektif. Variasikan goalPct (30–70 sesuai severity), klasifikasikan industri dengan tepat, dan buat scope yang sangat berbeda per industri. Pertahankan setiap angka/persentase eksplisit dari pernyataan masalah user. Hindari frasa emosional atau provokatif.` },
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