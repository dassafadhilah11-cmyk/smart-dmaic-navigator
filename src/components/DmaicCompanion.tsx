import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateRoadmap } from "@/lib/dmaic.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Sparkles,
  Target,
  BarChart3,
  Search,
  Lightbulb,
  ShieldCheck,
  AlertOctagon,
  Crosshair,
  ListChecks,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Pencil,
  Truck,
  Package,
  Cog,
  Boxes,
  Users,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

type Roadmap = {
  problem: string;
  domain: "food" | "delay" | "defect" | "service" | "generic";
  goalPct: number;
  timelineWeeks: number;
  ctqs: string[];
  qualitative: { name: string; desc: string }[];
  quantitative: { name: string; desc: string }[];
  actions: { failure: string; solution: string; method: string }[];
  controls: string[];
  pokaYoke: string[];
  inScope: string[];
  outScope: string[];
  sipoc: {
    suppliers: string[];
    inputs: string[];
    process: string[];
    outputs: string[];
    customers: string[];
  };
};

function detectDomain(input: string): Roadmap["domain"] {
  const t = input.toLowerCase();
  if (/(suhu|temperatur|makan|food|keripik|goreng|oven|panas|dingin|kemasan)/.test(t)) return "food";
  if (/(telat|delay|lambat|antri|waktu tunggu|lead time|keterlambatan)/.test(t)) return "delay";
  if (/(layanan|service|keluhan|customer|pelanggan|komplain)/.test(t)) return "service";
  if (/(cacat|defect|reject|rusak|kualitas|gagal)/.test(t)) return "defect";
  return "generic";
}

function buildRoadmap(problem: string): Roadmap {
  const domain = detectDomain(problem);
  const base: Record<Roadmap["domain"], Partial<Roadmap>> = {
    food: {
      ctqs: [
        "Berapa jumlah produk cacat per batch produksi?",
        "Kapan waktu kecacatan tertinggi terjadi (shift pagi/malam)?",
        "Apakah cacat dominan gosong, hancur, atau ukuran tidak seragam?",
        "Berapa suhu rata-rata dan rentang fluktuasinya saat produksi?",
      ],
      actions: [
        { failure: "Suhu mesin tidak stabil", solution: "Pasang sensor otomatis temperatur dengan alarm batas", method: "Poka-Yoke" },
        { failure: "Operator kurang teliti memantau", solution: "Pelatihan & standardisasi SOP baru", method: "Training" },
        { failure: "Bahan baku tidak konsisten", solution: "Inspeksi penerimaan & supplier scorecard", method: "Quality Gate" },
      ],
      pokaYoke: [
        "Sensor suhu dengan auto-shutoff bila keluar batas kontrol",
        "Timer otomatis untuk durasi penggorengan",
      ],
      inScope: [
        "Proses produksi internal pabrik (penggorengan, pengemasan)",
        "Kualitas bahan baku dari supplier utama",
        "Pelatihan operator shift pagi & malam",
      ],
      outScope: [
        "Distribusi & logistik ke retailer",
        "Aktivitas pemasaran & branding produk",
        "Pengembangan varian rasa baru",
      ],
      sipoc: {
        suppliers: ["Supplier bahan baku singkong", "Supplier minyak goreng", "Supplier kemasan", "Tim Maintenance Mesin"],
        inputs: ["Singkong segar grade A", "Minyak goreng siap pakai", "Kemasan plastik & label", "Mesin penggorengan terkalibrasi"],
        process: ["Sortir & pencucian bahan", "Penggorengan suhu terkontrol", "Penirisan & bumbu", "Pengemasan & sealing"],
        outputs: ["Singkong bersih siap goreng", "Keripik matang seragam", "Keripik berbumbu siap kemas", "Produk jadi terkemas"],
        customers: ["Stasiun penggorengan", "Stasiun bumbu", "Stasiun pengemasan", "Gudang barang jadi / distribusi"],
      },
    },
    delay: {
      ctqs: [
        "Berapa lead time rata-rata vs target?",
        "Pada tahap proses mana waktu tunggu terpanjang?",
        "Berapa frekuensi keterlambatan per minggu?",
        "Apa penyebab utama keterlambatan menurut data historis?",
      ],
      actions: [
        { failure: "Layout kerja tidak efisien", solution: "Optimasi layout dengan prinsip 5S & spaghetti diagram", method: "Lean Layout" },
        { failure: "Bottleneck di satu stasiun", solution: "Penyeimbangan beban kerja (line balancing)", method: "Kaizen" },
        { failure: "Komunikasi antar tim lambat", solution: "Daily huddle & visual management board", method: "Visual Control" },
      ],
      pokaYoke: [
        "Andon system untuk eskalasi keterlambatan otomatis",
        "Kanban visual untuk mencegah penumpukan WIP",
      ],
      inScope: [
        "Alur proses internal end-to-end",
        "Layout & line balancing stasiun kerja",
        "Koordinasi antar shift operasional",
      ],
      outScope: [
        "Lead time pengiriman vendor eksternal",
        "Perubahan ERP / sistem inti",
        "Hiring tambahan headcount",
      ],
      sipoc: {
        suppliers: ["Departemen sebelumnya", "Planning & Scheduling", "Tim Supervisor Shift", "Tim IT / Sistem Internal"],
        inputs: ["Work-in-progress masuk", "Jadwal & prioritas order", "Instruksi kerja harian", "Status sistem real-time"],
        process: ["Penerimaan & antrian order", "Eksekusi pekerjaan utama", "Quality check antar stasiun", "Handover ke proses berikutnya"],
        outputs: ["Order terdaftar & terprioritas", "Pekerjaan selesai sesuai takt", "Output lolos QC", "Order siap diteruskan"],
        customers: ["Stasiun kerja berikutnya", "Supervisor produksi", "Tim QA internal", "Pelanggan akhir / next dept"],
      },
    },
    service: {
      ctqs: [
        "Berapa skor kepuasan pelanggan (CSAT/NPS) saat ini?",
        "Berapa jumlah keluhan per kategori per bulan?",
        "Berapa waktu respons rata-rata terhadap keluhan?",
        "Channel mana yang paling banyak menerima komplain?",
      ],
      actions: [
        { failure: "Respon lambat ke pelanggan", solution: "Implementasi SLA & ticket routing otomatis", method: "Automation" },
        { failure: "Inkonsistensi jawaban staf", solution: "Knowledge base & skrip terstandar", method: "Standardization" },
        { failure: "Eskalasi tidak jelas", solution: "Matriks eskalasi & RACI chart", method: "Process Design" },
      ],
      pokaYoke: [
        "Auto-acknowledgement saat tiket masuk",
        "Mandatory field validation pada form keluhan",
      ],
      inScope: [
        "Channel keluhan utama (email, chat, telepon)",
        "SLA & ticket routing internal",
        "Knowledge base agen customer service",
      ],
      outScope: [
        "Kebijakan refund & komersial",
        "Pengembangan produk baru",
        "Strategi marketing & promosi",
      ],
      sipoc: {
        suppliers: ["Pelanggan", "Tim Knowledge Management", "Sistem CRM / Ticketing", "Tim Supervisor CS"],
        inputs: ["Keluhan & pertanyaan pelanggan", "Knowledge base & skrip", "Tiket terklasifikasi & SLA", "Eskalasi & arahan"],
        process: ["Penerimaan keluhan multi-channel", "Klasifikasi & routing tiket", "Penanganan oleh agen CS", "Closure & follow-up"],
        outputs: ["Tiket tercatat lengkap", "Tiket terarah ke agen tepat", "Solusi diberikan ke pelanggan", "Tiket closed & CSAT terkumpul"],
        customers: ["Tim CS Tier-1", "Agen sesuai skill", "Pelanggan", "Manajemen & tim improvement"],
      },
    },
    defect: {
      ctqs: [
        "Berapa tingkat defect rate per batch?",
        "Jenis defect mana yang paling dominan (Pareto)?",
        "Pada tahap mana defect paling sering terdeteksi?",
        "Berapa biaya kualitas (COPQ) per bulan?",
      ],
      actions: [
        { failure: "Variasi proses tinggi", solution: "Standardisasi parameter & SOP visual", method: "Standardization" },
        { failure: "Inspeksi terlambat", solution: "Pindahkan inspeksi ke sumber (source inspection)", method: "Poka-Yoke" },
        { failure: "Kompetensi operator beragam", solution: "Sertifikasi & cross-training matrix", method: "Training" },
      ],
      pokaYoke: [
        "Jig/fixture mencegah pemasangan terbalik",
        "Checklist digital wajib sebelum proses berikutnya",
      ],
      inScope: [
        "Proses produksi line yang terdampak",
        "Inspeksi kualitas in-process & final",
        "SOP & sertifikasi operator",
      ],
      outScope: [
        "Desain produk & engineering change",
        "Kontrak supplier strategis",
        "Investasi capex mesin baru",
      ],
      sipoc: {
        suppliers: ["Supplier bahan baku", "Tim Engineering / SOP", "Tim Maintenance", "Operator shift sebelumnya"],
        inputs: ["Raw material sesuai spesifikasi", "SOP & parameter proses", "Mesin terkalibrasi & siap pakai", "Setup & handover shift"],
        process: ["Persiapan & setup line", "Produksi sesuai parameter", "Inspeksi in-process", "Final QC & rilis batch"],
        outputs: ["Line siap produksi", "Produk sesuai spesifikasi", "Defect terdeteksi dini", "Batch lolos QC"],
        customers: ["Operator produksi", "Stasiun proses berikutnya", "Tim rework / scrap", "Gudang barang jadi"],
      },
    },
    generic: {
      ctqs: [
        "Apa metrik kunci yang paling terdampak masalah ini?",
        "Berapa baseline performa saat ini?",
        "Siapa stakeholder utama yang terdampak?",
        "Berapa frekuensi & dampak finansial masalah ini?",
      ],
      actions: [
        { failure: "Proses belum terdokumentasi", solution: "Buat process map & SOP", method: "Standardization" },
        { failure: "Data tidak tersedia", solution: "Bangun sistem pengumpulan data sederhana", method: "Data System" },
        { failure: "Akar masalah belum jelas", solution: "Workshop 5 Whys & Fishbone bersama tim", method: "RCA Workshop" },
      ],
      pokaYoke: [
        "Checklist standar di titik kritis proses",
        "Visual indicator status (hijau/kuning/merah)",
      ],
      inScope: [
        "Proses utama yang terdampak masalah",
        "Tim operasional yang menjalankan proses",
        "Data & metrik internal yang tersedia",
      ],
      outScope: [
        "Perubahan strategi bisnis level korporat",
        "Investasi sistem / infrastruktur baru",
        "Faktor eksternal di luar kendali tim",
      ],
      sipoc: {
        suppliers: ["Pengguna / requester", "Tim Product", "Sistem upstream", "Tim On-call"],
        inputs: ["Request / event masuk", "Spesifikasi & acceptance criteria", "Data & API dependency", "Monitoring & alert"],
        process: ["Intake & triage request", "Eksekusi / development", "Verifikasi & testing", "Deploy & monitoring"],
        outputs: ["Request terklasifikasi", "Solusi / fitur siap uji", "Release lolos verifikasi", "Perubahan live & terpantau"],
        customers: ["Tim delivery", "Tim QA", "Tim Release / Ops", "Pengguna akhir"],
      },
    },
  };

  const b = base[domain];
  return {
    problem: problem.trim(),
    domain,
    goalPct: 50,
    timelineWeeks: 12,
    ctqs: b.ctqs!,
    qualitative: [
      { name: "Fishbone Diagram (5M+1E)", desc: "Telusuri penyebab dari Man, Machine, Method, Material, Measurement, Environment." },
      { name: "5 Whys", desc: "Tanyakan 'mengapa' berulang hingga akar masalah ditemukan." },
      { name: "Process Mapping (SIPOC)", desc: "Petakan Supplier-Input-Process-Output-Customer untuk konteks penuh." },
    ],
    quantitative: [
      { name: "Pareto Chart", desc: "Identifikasi 20% penyebab yang menimbulkan 80% masalah." },
      { name: "Control Chart (P-Chart)", desc: "Pantau proporsi cacat secara statistik dari waktu ke waktu." },
      { name: "Histogram & Capability (Cp/Cpk)", desc: "Ukur distribusi dan kapabilitas proses terhadap spesifikasi." },
    ],
    actions: b.actions!,
    controls: [
      "Implementasi & sosialisasi SOP yang telah diperbarui ke seluruh shift.",
      "Control Chart harian diisi operator untuk monitoring real-time.",
      "Audit mingguan oleh supervisor & review bulanan oleh Champion.",
      "Dashboard KPI digital yang transparan untuk seluruh tim.",
    ],
    pokaYoke: b.pokaYoke!,
    inScope: b.inScope!,
    outScope: b.outScope!,
    sipoc: b.sipoc!,
  };
}

export function DmaicCompanion() {
  const [input, setInput] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const callGenerate = useServerFn(generateRoadmap);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const result = await callGenerate({ data: { problem: input.trim() } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Merge AI output with static method/tool catalogs the UI still needs.
      const fallback = buildRoadmap(input);
      const ai = result.roadmap as Partial<Roadmap>;
      setRoadmap({
        ...fallback,
        ...ai,
        qualitative: fallback.qualitative,
        quantitative: fallback.quantitative,
        controls: fallback.controls,
      } as Roadmap);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghasilkan roadmap.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInput("");
    setRoadmap(null);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goalStatement = useMemo(() => {
    if (!roadmap) return "";
    const months = roadmap.timelineWeeks / 4;
    // Detect explicit current rate (e.g. "15%", "15 persen", "15 %") in the original problem text.
    const match = roadmap.problem.match(/(\d+(?:[.,]\d+)?)\s*(?:%|persen)/i);
    if (match) {
      const current = parseFloat(match[1].replace(",", "."));
      const target = Math.max(0, +(current * (1 - roadmap.goalPct / 100)).toFixed(current < 10 ? 1 : 0));
      return `Menurunkan tingkat masalah dari ${current}% menjadi di bawah ${target}% dalam waktu ${months} bulan ke depan, terukur melalui metrik CTQ yang ditetapkan.`;
    }
    return `Menurunkan tingkat masalah sebesar ${roadmap.goalPct}% dalam waktu ${months} bulan ke depan, terukur melalui metrik CTQ yang ditetapkan.`;
  }, [roadmap]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-accent/30">
      <header className="border-b border-border bg-card/70 backdrop-blur print:hidden">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary text-primary-foreground p-2.5 shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Smart DMAIC Project Companion
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-assisted Lean Six Sigma roadmap generator
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <Card className="border-primary/20 shadow-lg print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">Deskripsikan Masalah Anda</CardTitle>
            <CardDescription>
              Tuliskan masalah bisnis atau operasional secara spesifik. Contoh: "Angka kecacatan produk keripik singkong meningkat 15% bulan ini."
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis masalah Anda di sini..."
              className="min-h-32 resize-none text-base"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleGenerate}
                disabled={!input.trim() || loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                <Sparkles className="mr-2 size-4" />
                {loading ? "Menganalisis…" : "Generate DMAIC Roadmap"}
              </Button>
              <Button
                onClick={handleReset}
                disabled={loading || (!input && !roadmap)}
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <RotateCcw className="mr-2 size-4" />
                Reset Project
              </Button>
            </div>
          </CardContent>
        </Card>

        {roadmap && (
          <div ref={reportRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs defaultValue="define" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto bg-card border border-border p-1">
                <TabsTrigger value="define" className="gap-1.5"><Target className="size-4" />Define</TabsTrigger>
                <TabsTrigger value="measure" className="gap-1.5"><BarChart3 className="size-4" />Measure</TabsTrigger>
                <TabsTrigger value="analyze" className="gap-1.5"><Search className="size-4" />Analyze</TabsTrigger>
                <TabsTrigger value="improve" className="gap-1.5"><Lightbulb className="size-4" />Improve</TabsTrigger>
                <TabsTrigger value="control" className="gap-1.5"><ShieldCheck className="size-4" />Control</TabsTrigger>
              </TabsList>

              <TabsContent value="define" className="mt-6 animate-in fade-in-50 duration-300">
                <VisualProjectCharter roadmap={roadmap} initialGoal={goalStatement} />
                <div className="mt-6">
                  <SipocDiagram sipoc={roadmap.sipoc} domain={roadmap.domain} />
                </div>
              </TabsContent>

              <TabsContent value="measure" className="mt-6 animate-in fade-in-50 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Data Collection Plan</CardTitle>
                    <CardDescription>Mengukur performa proses saat ini sebelum melakukan perbaikan.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Section title="Pertanyaan Kunci CTQ (Critical to Quality)">
                      <ul className="space-y-2">
                        {roadmap.ctqs.map((q, i) => (
                          <li key={i} className="flex gap-3 p-3 rounded-md bg-secondary/50 border border-border">
                            <span className="text-primary font-semibold">{i + 1}.</span>
                            <span className="text-foreground/90">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </Section>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analyze" className="mt-6 animate-in fade-in-50 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>🔍 Root Cause Analysis Tools</CardTitle>
                    <CardDescription>Rekomendasi alat analisis untuk mencari akar penyebab masalah.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Badge variant="secondary">Kualitatif</Badge>
                      </h4>
                      <ul className="space-y-3">
                        {roadmap.qualitative.map((t) => (
                          <li key={t.name} className="p-3 rounded-md border border-border bg-card">
                            <p className="font-medium text-foreground">{t.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Badge>Kuantitatif / Statistik</Badge>
                      </h4>
                      <ul className="space-y-3">
                        {roadmap.quantitative.map((t) => (
                          <li key={t.name} className="p-3 rounded-md border border-border bg-card">
                            <p className="font-medium text-foreground">{t.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="improve" className="mt-6 animate-in fade-in-50 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>💡 Kaizen & Action Plan</CardTitle>
                    <CardDescription>Strategi solusi perbaikan berdasarkan pola masalah Anda.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary text-foreground">
                          <tr>
                            <th className="text-left p-3 font-semibold">Potensi Kegagalan</th>
                            <th className="text-left p-3 font-semibold">Solusi Perbaikan</th>
                            <th className="text-left p-3 font-semibold">Metode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roadmap.actions.map((a, i) => (
                            <tr key={i} className="border-t border-border hover:bg-secondary/40 transition-colors">
                              <td className="p-3 text-foreground/90">{a.failure}</td>
                              <td className="p-3 text-foreground/90">{a.solution}</td>
                              <td className="p-3"><Badge variant="outline">{a.method}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="control" className="mt-6 animate-in fade-in-50 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle>🛡️ Control & Monitoring Plan</CardTitle>
                    <CardDescription>Mengunci perbaikan agar kualitas tetap terjaga jangka panjang.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Section title="Mistake-Proofing (Poka-Yoke)">
                      <ul className="space-y-2">
                        {roadmap.pokaYoke.map((p, i) => (
                          <li key={i} className="flex gap-2 text-foreground/90">
                            <span className="text-primary">✓</span>{p}
                          </li>
                        ))}
                      </ul>
                    </Section>
                    <Section title="SPC & Monitoring">
                      <ul className="space-y-2">
                        {roadmap.controls.map((c, i) => (
                          <li key={i} className="flex gap-2 text-foreground/90">
                            <span className="text-primary">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center pt-4 print:hidden">
              <Button onClick={() => window.print()} variant="outline" size="lg">
                <Printer className="mr-2 size-4" />
                Cetak / Simpan jadi PDF
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">{title}</h3>
      {children}
    </div>
  );
}

/* ---------- SIPOC Diagram ---------- */

const domainLabel: Record<Roadmap["domain"], string> = {
  food: "Manufacturing · F&B",
  defect: "Manufacturing",
  delay: "Service Operations",
  service: "Customer Service",
  generic: "Digital / SaaS",
};

const sipocCols = [
  { key: "suppliers", label: "Suppliers", icon: Truck, tone: "bg-rose-50 text-rose-600 ring-rose-200" },
  { key: "inputs", label: "Inputs", icon: Package, tone: "bg-amber-50 text-amber-600 ring-amber-200" },
  { key: "process", label: "Process", icon: Cog, tone: "bg-indigo-50 text-indigo-600 ring-indigo-200" },
  { key: "outputs", label: "Outputs", icon: Boxes, tone: "bg-sky-50 text-sky-600 ring-sky-200" },
  { key: "customers", label: "Customers", icon: Users, tone: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
] as const;

function SipocDiagram({
  sipoc,
  domain,
}: {
  sipoc: Roadmap["sipoc"];
  domain: Roadmap["domain"];
}) {
  const rows = 4;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Define · Process Map
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
            SIPOC Diagram
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Setiap baris terhubung: Supplier → Input → Process → Output → Customer.
          </p>
        </div>
        <Badge variant="secondary" className="bg-sky-50 text-sky-700 ring-1 ring-sky-200">
          Industri: {domainLabel[domain]}
        </Badge>
      </div>

      <div
        className="-mx-2 overflow-x-auto pb-2"
        style={{ overflowY: "visible" }}
      >
        <div className="min-w-[920px] grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-y-3 px-2">
          {sipocCols.map((c, ci) => (
            <div key={c.key} className="contents">
              <div
                className="sticky top-0 z-20 flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
                style={{ gridRow: 1, gridColumn: ci * 2 + 1 }}
              >
                <div className={`rounded-lg p-1.5 ring-1 ${c.tone}`}>
                  <c.icon className="size-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {c.label}
                </span>
              </div>
              {ci < sipocCols.length - 1 && (
                <div
                  className="sticky top-0 z-20 flex items-center justify-center text-slate-300 px-1 py-2 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200"
                  style={{ gridRow: 1, gridColumn: ci * 2 + 2 }}
                >
                  <ArrowRight className="size-4" />
                </div>
              )}
            </div>
          ))}

          {Array.from({ length: rows }).map((_, ri) =>
            sipocCols.map((c, ci) => (
              <div key={`${c.key}-${ri}`} className="contents">
                <div
                  className="m-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-700 leading-snug"
                  style={{ gridRow: ri + 2, gridColumn: ci * 2 + 1 }}
                >
                  {sipoc[c.key]?.[ri] ?? "—"}
                </div>
                {ci < sipocCols.length - 1 && (
                  <div
                    className="flex items-center justify-center text-slate-300"
                    style={{ gridRow: ri + 2, gridColumn: ci * 2 + 2 }}
                  >
                    <ArrowRight className="size-3.5" />
                  </div>
                )}
              </div>
            )),
          )}
        </div>
        <p className="lg:hidden mt-2 px-2 text-[11px] text-slate-400">
          Geser ke samping untuk melihat seluruh kolom →
        </p>
      </div>
    </div>
  );
}

/* ---------- Visual Project Charter Dashboard ---------- */

type Accent = "danger" | "success" | "info" | "primary";

const accentMap: Record<Accent, { border: string; chip: string; ring: string }> = {
  danger: {
    border: "border-l-rose-500",
    chip: "bg-rose-50 text-rose-600 ring-rose-200",
    ring: "ring-rose-100",
  },
  success: {
    border: "border-l-emerald-500",
    chip: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    ring: "ring-emerald-100",
  },
  info: {
    border: "border-l-sky-500",
    chip: "bg-sky-50 text-sky-600 ring-sky-200",
    ring: "ring-sky-100",
  },
  primary: {
    border: "border-l-indigo-500",
    chip: "bg-indigo-50 text-indigo-600 ring-indigo-200",
    ring: "ring-indigo-100",
  },
};

function CharterCard({
  accent,
  icon,
  eyebrow,
  title,
  children,
}: {
  accent: Accent;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const a = accentMap[accent];
  return (
    <div
      className={`group relative bg-white rounded-2xl border border-slate-200/80 ${a.border} border-l-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(15,23,42,0.18)] transition-shadow p-6`}
    >
      <div className="flex items-start gap-4">
        <div className={`shrink-0 rounded-xl p-2.5 ring-1 ${a.chip}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
          <h3 className="font-display text-lg font-700 font-bold text-slate-800 mt-0.5">{title}</h3>
          <div className="mt-3 text-slate-700">{children}</div>
        </div>
        <Pencil className="size-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function Editable({
  value,
  onChange,
  multiline = false,
  className = "",
  placeholder = "Klik untuk edit…",
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);
  return (
    <div
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e) => onChange((e.target as HTMLDivElement).innerText.trim())}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLDivElement).blur();
        }
      }}
      className={`outline-none rounded-md px-1.5 -mx-1.5 py-0.5 focus:bg-sky-50/70 focus:ring-2 focus:ring-sky-200 hover:bg-slate-50 transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 ${className}`}
    />
  );
}

function VisualProjectCharter({
  roadmap,
  initialGoal,
}: {
  roadmap: Roadmap;
  initialGoal: string;
}) {
  const [problem, setProblem] = useState(roadmap.problem);
  const [goal, setGoal] = useState(initialGoal);
  const [inScope, setInScope] = useState<string[]>(roadmap.inScope);
  const [outScope, setOutScope] = useState<string[]>(roadmap.outScope);

  const timeline = useMemo(
    () => [
      { weeks: "Minggu 1", phase: "Define", label: "Kick-off & penyusunan project charter" },
      { weeks: "Minggu 2", phase: "Define", label: "Identifikasi stakeholder & sign-off charter" },
      { weeks: "Minggu 3", phase: "Measure", label: "Pemetaan proses (SIPOC) & rencana pengumpulan data" },
      { weeks: "Minggu 4", phase: "Measure", label: "Pengumpulan baseline data CTQ" },
      { weeks: "Minggu 5", phase: "Measure", label: "Validasi sistem pengukuran (MSA)" },
      { weeks: "Minggu 6", phase: "Analyze", label: "Analisis root cause (Fishbone & 5 Why)" },
      { weeks: "Minggu 7", phase: "Analyze", label: "Verifikasi akar masalah dengan data" },
      { weeks: "Minggu 8", phase: "Improve", label: "Brainstorming & pemilihan solusi (FMEA)" },
      { weeks: "Minggu 9", phase: "Improve", label: "Implementasi pilot solusi di lapangan" },
      { weeks: "Minggu 10", phase: "Improve", label: "Evaluasi hasil pilot & penyempurnaan" },
      { weeks: "Minggu 11", phase: "Control", label: "Standardisasi: update SOP & control plan" },
      { weeks: "Minggu 12", phase: "Control", label: "Handover ke process owner & sign-off project" },
    ],
    [],
  );
  const [steps, setSteps] = useState(timeline);

  const updateList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    i: number,
    v: string,
  ) =>
    setter((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Define · Project Charter
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">
            Visual Project Charter Dashboard
          </h2>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex gap-1.5 bg-sky-50 text-sky-700 ring-1 ring-sky-200">
          <Sparkles className="size-3" /> AI-generated · Editable
        </Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CharterCard
          accent="danger"
          icon={<AlertOctagon className="size-5" />}
          eyebrow="Problem Statement"
          title="Masalah yang Diidentifikasi"
        >
          <Editable
            value={problem}
            onChange={setProblem}
            multiline
            className="leading-relaxed text-[15px]"
          />
        </CharterCard>

        <CharterCard
          accent="success"
          icon={<Crosshair className="size-5" />}
          eyebrow="SMART Goal"
          title="Target Perbaikan Terukur"
        >
          <Editable
            value={goal}
            onChange={setGoal}
            multiline
            className="leading-relaxed text-[15px]"
          />
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-emerald-100 overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-emerald-600">{roadmap.goalPct}%</span>
          </div>
        </CharterCard>

        <CharterCard
          accent="info"
          icon={<ListChecks className="size-5" />}
          eyebrow="Project Scope"
          title="Batasan Ruang Lingkup"
        >
          <div className="grid sm:grid-cols-2 gap-5 mt-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">
                In-Scope
              </p>
              <ul className="space-y-2">
                {inScope.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-500" />
                    <Editable
                      value={s}
                      onChange={(v) => updateList(setInScope, i, v)}
                      className="flex-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-2">
                Out-of-Scope
              </p>
              <ul className="space-y-2">
                {outScope.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <XCircle className="size-4 mt-0.5 shrink-0 text-rose-500" />
                    <Editable
                      value={s}
                      onChange={(v) => updateList(setOutScope, i, v)}
                      className="flex-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CharterCard>

        <CharterCard
          accent="primary"
          icon={<CalendarClock className="size-5" />}
          eyebrow="Project Timeline"
          title="Roadmap 12 Minggu"
        >
          <ol className="relative mt-1">
            <span className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-indigo-200 via-sky-200 to-emerald-200" />
            {steps.map((step, i) => (
              <li key={i} className="relative pl-9 pb-4 last:pb-0">
                <span className="absolute left-0 top-0.5 flex items-center justify-center size-6 rounded-full bg-white ring-2 ring-indigo-300 text-[11px] font-bold text-indigo-600 shadow-sm">
                  {i + 1}
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                    {step.phase}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <Editable
                    value={step.weeks}
                    onChange={(v) =>
                      setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, weeks: v } : s)))
                    }
                    className="text-xs text-slate-500"
                  />
                </div>
                <Editable
                  value={step.label}
                  onChange={(v) =>
                    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, label: v } : s)))
                  }
                  className="text-sm font-medium text-slate-700 mt-0.5"
                />
              </li>
            ))}
          </ol>
        </CharterCard>
      </div>
    </div>
  );
}