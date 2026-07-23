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

BASELINE MEASUREMENT (for DPMO Calculator prefill):
QUANTITATIVE DATA CHECK (CRITICAL — do NOT invent numbers):
First, inspect the user's problem text. DPMO analysis requires an EXPLICIT defect/failure/error/reject/late/complaint count or an EXPLICIT defect rate/percentage stated by the user. This is a HARD REQUIREMENT — it is the single non-negotiable signal.
  - Qualifying defect signals (must appear explicitly): a countable defect quantity (e.g. "90 cacat", "45 reject", "120 keluhan", "30 keterlambatan") OR an explicit defect/reject/failure/late rate or percentage (e.g. "15% reject", "20% keterlambatan", "cacat 8%", "0.5% komplain").
  - NON-qualifying signals (these DO NOT count as defect data, even if numeric): sample sizes / unit counts / transaction volumes alone (e.g. "1500 unit per hari"), measurement tolerances or specification limits (e.g. "±0.2 mm", "toleransi 5%"), target values, SLA thresholds, time durations, temperatures, weights, or any other process/parameter numbers that are not a count or rate of defects/failures.
  - Decision rule:
      * If the text contains an explicit defect COUNT or defect RATE/PERCENTAGE as defined above → set "hasQuantitativeData": true and emit a "baseline" object populated from the user's stated numbers (use a stated unit/sample count when present; otherwise infer a realistic baseline sample size).
      * If the text has NO explicit defect count and NO explicit defect rate (even if sample sizes, tolerances, or other numbers are present) → set "hasQuantitativeData": false and OMIT the "baseline" field entirely. Do NOT invent a defect count. Do NOT emit baseline just because units or tolerances are mentioned.

When emitted, "baseline" is an object with THREE integers:
  - "units": total units / transactions / samples inspected in the baseline period. If the user states an explicit count (e.g. "1500 unit", "2000 transaksi"), USE THAT NUMBER. Otherwise infer a realistic baseline sample size for a 12-week Six Sigma project (typical range 500–5000 depending on process volume).
  - "opportunitiesPerUnit": number of critical-to-quality parameters (defect opportunities) per unit. MUST equal the number of metricNouns you emit (i.e. 4), unless the problem domain clearly implies a different number of independent defect opportunities per unit — in that case pick an integer 1–10.
  - "defects": total defects / errors / late events / complaints observed in the baseline. If the user states an explicit defect count or defect rate (e.g. "90 cacat", "15% reject"), derive from that (rate × units, rounded). Otherwise pick a realistic integer consistent with the severity described (must be < units × opportunitiesPerUnit).
These three values will pre-fill the DPMO calculator; they must be internally consistent (defects ≤ units × opportunitiesPerUnit) and reflect the user's stated numbers when present. Only emit "baseline" when hasQuantitativeData is true.

ROOT CAUSE ANALYSIS (5 Whys + Fishbone 6M):
- "fiveWhys": exactly 5 strings forming a logical causal chain. Each string starts with "Why N: <pertanyaan>" followed by " — <jawaban singkat>" so the chain drills from the visible symptom down to a systemic root cause. Tailor strictly to the detected industry and the user's specific problem.
- "fishbone": object with EXACTLY these 6 keys: manpower, machine, method, material, measurement, motherNature. Each value is an array of 2–3 concrete potential causes (short noun phrases, Bahasa Indonesia) for the problem, industry-specific. VARY the count per category based on realistic importance (e.g., one category may have 2 causes while another has 3); do NOT default to the same count for every category so the Pareto chart can rank them meaningfully. "motherNature" = environment/lingkungan (suhu, kelembapan, kebisingan, jam sibuk, dsb).

CONTROL CHART SELECTION (CRITICAL — do NOT default to p-Chart):
Analyze the primary metric implied by the problem text and choose exactly ONE Statistical Process Control chart. Base the decision on the actual measurement type described (units of measurement, whether sample size is fixed or varying, defect count vs proportion defective, subgroup structure):
  - "X̄-R Chart" → CONTINUOUS/variable data that can be measured on a scale (waktu, cycle time, lead time, suhu, berat, ketebalan, panjang, tekanan, viskositas, kadar, dsb.) AND subgroups of size 2–10 are natural (e.g., beberapa sampel per shift/batch/jam).
  - "I-MR Chart" → CONTINUOUS data collected one observation at a time with NO natural subgroup (individual measurements per batch/hari).
  - "p-Chart" → ATTRIBUTE data (defective vs not defective — pass/fail, on-time vs late, komplain ya/tidak) where SAMPLE SIZE VARIES between inspections (proporsi cacat, % keterlambatan, % komplain, sampel per hari berbeda).
  - "np-Chart" → ATTRIBUTE data (defective vs not defective) where SAMPLE SIZE IS CONSTANT across inspections (mis. selalu 100 unit per batch/shift).
  - "c-Chart" → COUNT of defects per unit (satu unit dapat memiliki banyak cacat/keluhan; area of opportunity KONSTAN — mis. jumlah cacat per meter kain, jumlah keluhan per hari dengan volume tetap).
  - "u-Chart" → COUNT of defects per unit dengan area of opportunity VARIABEL (mis. defect per m² kain dengan ukuran gulungan berbeda; keluhan per 1000 transaksi dengan volume harian berbeda).
Emit "controlChart" as an object with:
  - "chart": salah satu string persis: "X̄-R Chart" | "I-MR Chart" | "p-Chart" | "np-Chart" | "c-Chart" | "u-Chart".
  - "dataType": deskripsi singkat sifat data (mis. "Continuous · Cycle time", "Attribute · Proporsi cacat (n bervariasi)", "Attribute · Jumlah cacat per unit (opportunity konstan)").
  - "rationale": 1–2 kalimat Bahasa Indonesia profesional yang MENYEBUT petunjuk spesifik dari deskripsi masalah user (mis. satuan pengukuran atau apakah ukuran sampel tetap/berubah) yang mendasari pemilihan chart. Jangan gunakan alasan generik yang bisa dipakai untuk semua chart.
Do NOT default to p-Chart. If cues are ambiguous, pick the chart most consistent with the metricNouns you emitted.

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
        hasQuantitativeData: { type: "boolean", description: "True only if the user's problem text contains enough explicit numeric data (units, defects, opportunities/critical parameters) to support DPMO calculation. False if problem is purely qualitative — in that case OMIT baseline." },
        baseline: {
          type: "object",
          description: "Baseline measurement values used to pre-fill the DPMO calculator. ONLY include when hasQuantitativeData is true. Extract explicit numbers from the user's problem text.",
          properties: {
            units: { type: "integer", minimum: 1, description: "Total units inspected in baseline period." },
            opportunitiesPerUnit: { type: "integer", minimum: 1, maximum: 20, description: "Critical defect opportunities per unit. Typically equals number of metricNouns." },
            defects: { type: "integer", minimum: 0, description: "Total defects observed. Must be <= units * opportunitiesPerUnit." },
          },
          required: ["units", "opportunitiesPerUnit", "defects"],
          additionalProperties: false,
        },
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
        controlChart: {
          type: "object",
          description: "Recommended SPC control chart derived from the metric type implied by the problem text.",
          properties: {
            chart: { type: "string", enum: ["X̄-R Chart", "I-MR Chart", "p-Chart", "np-Chart", "c-Chart", "u-Chart"] },
            dataType: { type: "string", description: "Short data-nature descriptor (continuous vs attribute, subgroup/sample-size behavior)." },
            rationale: { type: "string", description: "1–2 sentence Bahasa Indonesia rationale citing specific cues from the user's problem text." },
          },
          required: ["chart", "dataType", "rationale"],
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
        required: ["problem", "domain", "goalPct", "timelineWeeks", "ctqs", "metricNouns", "hasQuantitativeData", "fiveWhys", "fishbone", "controlChart", "actions", "pokaYoke", "inScope", "outScope", "sipoc"],
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