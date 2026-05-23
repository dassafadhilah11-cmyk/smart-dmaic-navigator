import { useEffect, useMemo, useRef, useState } from "react";
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
  };
}

export function DmaicCompanion() {
  const [input, setInput] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = () => {
    if (!input.trim()) return;
    setRoadmap(buildRoadmap(input));
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const goalStatement = useMemo(() => {
    if (!roadmap) return "";
    return `Menurunkan tingkat masalah sebesar ${roadmap.goalPct}% dalam waktu ${roadmap.timelineWeeks / 4} bulan ke depan, terukur melalui metrik CTQ yang ditetapkan.`;
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
            <Button
              onClick={handleGenerate}
              disabled={!input.trim()}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Sparkles className="mr-2 size-4" />
              Generate DMAIC Roadmap
            </Button>
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