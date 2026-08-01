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
  Copy,
  Check,
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
  FileText,
} from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Beasley-Springer-Moro approximation of NORMSINV (inverse standard normal CDF).
function normSInv(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

type Roadmap = {
  problem: string;
  domain: "food" | "delay" | "defect" | "service" | "generic";
  goalPct: number;
  timelineWeeks: number;
  ctqs: string[];
  metricNouns: string[];
  fiveWhys: string[];
  fishbone: {
    manpower: string[];
    machine: string[];
    method: string[];
    material: string[];
    measurement: string[];
    motherNature: string[];
  };
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
  baseline?: {
    units?: number;
    opportunitiesPerUnit?: number;
    defects?: number;
  };
  hasQuantitativeData?: boolean;
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
  const ctqs = b.ctqs!;
  const metricNouns = ctqs.map((q) =>
    q
      .replace(/^(Berapa|Bagaimana|Apa|Kapan|Siapa|Channel)\s+/i, "")
      .replace(/\?$/, "")
      .split(/\s+/)
      .slice(0, 4)
      .join(" ")
      .replace(/^./, (c) => c.toUpperCase()),
  );
  const fishboneByDomain: Record<Roadmap["domain"], Roadmap["fishbone"]> = {
    food: {
      manpower: ["Operator kurang pelatihan", "Kelelahan shift malam"],
      machine: ["Kalibrasi suhu tidak stabil", "Timer penggorengan aus"],
      method: ["SOP belum standar antar shift", "Setup awal tidak konsisten"],
      material: ["Variasi grade singkong", "Mutu minyak menurun"],
      measurement: ["Sensor suhu tidak terkalibrasi", "Sampling QC terlalu jarang"],
      motherNature: ["Kelembapan ruang produksi tinggi", "Fluktuasi suhu lingkungan"],
    },
    defect: {
      manpower: ["Kompetensi operator beragam", "Handover shift tidak rapi"],
      machine: ["Mesin lama, drift parameter", "Tooling aus"],
      method: ["SOP tidak visual", "Inspeksi end-of-line saja"],
      material: ["Raw material variatif", "Lot supplier campur"],
      measurement: ["Alat ukur tidak diverifikasi", "Definisi defect ambigu"],
      motherNature: ["Debu di area kerja", "Pencahayaan kurang"],
    },
    delay: {
      manpower: ["Beban kerja tidak seimbang", "Skill mix tidak merata"],
      machine: ["Sistem antrian lambat", "Downtime peralatan"],
      method: ["Rute proses berputar", "Tidak ada prioritisasi order"],
      material: ["WIP menumpuk", "Komponen telat datang"],
      measurement: ["Cycle time tidak dipantau", "KPI per stasiun tidak ada"],
      motherNature: ["Jam sibuk berimpit", "Layout sempit"],
    },
    service: {
      manpower: ["Skrip agen tidak konsisten", "Turnover CS tinggi"],
      machine: ["Sistem CRM lambat", "Telepon sering drop"],
      method: ["Eskalasi tidak jelas", "Routing tiket manual"],
      material: ["Knowledge base usang", "Template balasan minim"],
      measurement: ["SLA tidak dipantau real-time", "CSAT jarang diukur"],
      motherNature: ["Lonjakan trafik jam sibuk", "Gangguan jaringan eksternal"],
    },
    generic: {
      manpower: ["Akuntabilitas peran tidak jelas", "Pelatihan kurang"],
      machine: ["Sistem legacy", "Integrasi rapuh"],
      method: ["Proses belum terdokumentasi", "Banyak workaround manual"],
      material: ["Data input tidak bersih", "Dependency eksternal"],
      measurement: ["Metrik tidak terdefinisi", "Logging minim"],
      motherNature: ["Beban puncak tak terduga", "Perubahan regulasi"],
    },
  };
  return {
    problem: problem.trim(),
    domain,
    goalPct: 50,
    timelineWeeks: 12,
    ctqs,
    metricNouns,
    fiveWhys: [
      "Why 1: Mengapa masalah ini muncul? — Karena output proses tidak konsisten terhadap standar.",
      "Why 2: Mengapa output tidak konsisten? — Karena parameter kunci proses bervariasi antar shift.",
      "Why 3: Mengapa parameter bervariasi? — Karena SOP tidak dijalankan secara seragam.",
      "Why 4: Mengapa SOP tidak seragam? — Karena pelatihan dan kontrol visual belum memadai.",
      "Why 5: Mengapa kontrol belum memadai? — Karena sistem monitoring & akuntabilitas belum dirancang formal (root cause).",
    ],
    fishbone: fishboneByDomain[domain],
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

/* ---------- Export to Word (.docx) ---------- */

function p(text: string, opts: { bold?: boolean; size?: number; italic?: boolean; color?: string } = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size, color: opts.color })],
  });
}

function h(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text })],
  });
}

function cell(text: string, opts: { bold?: boolean; shade?: string; width?: number } = {}) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  return new DocxTableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: { top: border, bottom: border, left: border, right: border },
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function docxTable(headers: string[], rows: string[][], colWidths?: number[]) {
  const widths = colWidths ?? headers.map(() => Math.floor(9360 / headers.length));
  return new DocxTable({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new DocxTableRow({
        tableHeader: true,
        children: headers.map((hd, i) => cell(hd, { bold: true, shade: "E8F1FA", width: widths[i] })),
      }),
      ...rows.map(
        (r) =>
          new DocxTableRow({
            children: r.map((c, i) => cell(c, { width: widths[i] })),
          }),
      ),
    ],
  });
}

function normSInvExport(prob: number): number {
  // Reuse the top-level normSInv already defined in this file.
  return normSInv(prob);
}

async function exportRoadmapToDocx(roadmap: Roadmap, goalStatement: string) {
  const domainLabel: Record<Roadmap["domain"], string> = {
    food: "Food & Beverage",
    delay: "Lead Time / Delay",
    defect: "Manufacturing / Defect",
    service: "Service / Customer",
    generic: "Generic",
  };

  const children: (Paragraph | DocxTable)[] = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "Smart DMAIC Project Companion", bold: true, size: 36, color: "1E3A8A" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: "Lean Six Sigma Roadmap Report", italics: true, size: 22, color: "475569" })],
    }),
  );

  // ---------- DEFINE ----------
  children.push(h("1. DEFINE", HeadingLevel.HEADING_1));
  children.push(h("Problem Statement", HeadingLevel.HEADING_2));
  children.push(p(roadmap.problem || "—"));
  children.push(h("SMART Goal Statement", HeadingLevel.HEADING_2));
  children.push(p(goalStatement || `Menurunkan tingkat masalah sebesar ${roadmap.goalPct}%.`));
  children.push(
    p(`Domain terdeteksi: ${domainLabel[roadmap.domain]}   |   Target reduksi: ${roadmap.goalPct}%   |   Timeline: ${roadmap.timelineWeeks} minggu`, { italic: true, color: "475569" }),
  );

  children.push(h("Project Scope", HeadingLevel.HEADING_2));
  children.push(
    docxTable(
      ["In-Scope", "Out-of-Scope"],
      Array.from({ length: Math.max(roadmap.inScope.length, roadmap.outScope.length) }).map((_, i) => [
        roadmap.inScope[i] ?? "",
        roadmap.outScope[i] ?? "",
      ]),
      [4680, 4680],
    ),
  );

  children.push(h("SIPOC Diagram", HeadingLevel.HEADING_2));
  const s = roadmap.sipoc;
  const sipocRows = Array.from({ length: 4 }).map((_, i) => [
    s.suppliers[i] ?? "",
    s.inputs[i] ?? "",
    s.process[i] ?? "",
    s.outputs[i] ?? "",
    s.customers[i] ?? "",
  ]);
  const sipocCol = Math.floor(9360 / 5);
  children.push(
    docxTable(
      ["Suppliers", "Inputs", "Process", "Outputs", "Customers"],
      sipocRows,
      [sipocCol, sipocCol, sipocCol, sipocCol, 9360 - sipocCol * 4],
    ),
  );

  // ---------- MEASURE ----------
  children.push(h("2. MEASURE", HeadingLevel.HEADING_1));
  children.push(h("Data Collection Plan (CTQs)", HeadingLevel.HEADING_2));
  const dcpRows = roadmap.ctqs.map((ctq, i) => {
    const metric =
      roadmap.metricNouns?.[i]?.trim() ||
      ctq.replace(/^(Berapa|Bagaimana|Apa|Kapan|Siapa|Channel)\s+/i, "").replace(/\?$/, "");
    const dataType = i % 2 === 0 ? "Continuous" : "Discrete / Attribute";
    const tool =
      roadmap.domain === "food" || roadmap.domain === "defect"
        ? ["Check Sheet", "Sensor Log", "Pareto Tally", "QC Inspection Form"][i % 4]
        : roadmap.domain === "delay"
          ? ["Time Study", "Andon Log", "Throughput Counter", "Cycle Time Sheet"][i % 4]
          : ["CRM Ticket Log", "Survey CSAT", "Audit Form", "System Report"][i % 4];
    const sample = ["30 sampel / shift", "Seluruh batch / hari", "n ≥ 50 / minggu", "Sampling acak 10%"][i % 4];
    return [metric, dataType, tool, sample];
  });
  children.push(
    docxTable(["Metric / CTQ", "Data Type", "Measurement Tool", "Sample Size"], dcpRows, [3000, 1800, 2560, 2000]),
  );

  // DPMO results if baseline present
  const b = roadmap.baseline;
  if (roadmap.hasQuantitativeData !== false && b && b.units && b.opportunitiesPerUnit && b.defects != null) {
    const dpmo = (b.defects / (b.units * b.opportunitiesPerUnit)) * 1_000_000;
    const sigma = normSInvExport(1 - dpmo / 1_000_000) + 1.5;
    children.push(h("DPMO & Sigma Level (Baseline)", HeadingLevel.HEADING_2));
    children.push(
      docxTable(
        ["Parameter", "Value"],
        [
          ["Total Units Inspected", String(b.units)],
          ["Opportunities per Unit", String(b.opportunitiesPerUnit)],
          ["Total Defects Found", String(b.defects)],
          ["DPMO", Math.round(dpmo).toLocaleString("id-ID")],
          ["Sigma Level", isFinite(sigma) ? sigma.toFixed(2) : "—"],
        ],
        [4680, 4680],
      ),
    );
  }

  // ---------- ANALYZE ----------
  children.push(h("3. ANALYZE", HeadingLevel.HEADING_1));
  children.push(h("5 Whys Analysis", HeadingLevel.HEADING_2));
  roadmap.fiveWhys.forEach((w) => children.push(bullet(w)));

  children.push(h("Fishbone Diagram (6M Categories)", HeadingLevel.HEADING_2));
  const fb = roadmap.fishbone;
  const fbLabel: Record<keyof typeof fb, string> = {
    manpower: "Manpower",
    machine: "Machine",
    method: "Method",
    material: "Material",
    measurement: "Measurement",
    motherNature: "Mother Nature (Environment)",
  };
  (Object.keys(fbLabel) as (keyof typeof fb)[]).forEach((k) => {
    children.push(p(fbLabel[k], { bold: true }));
    fb[k].forEach((c) => children.push(bullet(c)));
  });

  // ---------- IMPROVE ----------
  children.push(h("4. IMPROVE", HeadingLevel.HEADING_1));
  children.push(h("Improvement Action Plan (5W+1H)", HeadingLevel.HEADING_2));
  children.push(
    docxTable(
      ["Failure Mode / Root Cause", "Solution", "Method / Lean Tool"],
      roadmap.actions.map((a) => [a.failure, a.solution, a.method]),
      [3120, 3120, 3120],
    ),
  );
  if (roadmap.pokaYoke?.length) {
    children.push(h("Poka-Yoke / Mistake-Proofing", HeadingLevel.HEADING_2));
    roadmap.pokaYoke.forEach((x) => children.push(bullet(x)));
  }

  // ---------- CONTROL ----------
  children.push(h("5. CONTROL", HeadingLevel.HEADING_1));
  children.push(h("Control Plan / SOP Checklist", HeadingLevel.HEADING_2));
  const cp = controlPlanByDomain[roadmap.domain];
  children.push(
    docxTable(
      ["Control Activity", "Frequency", "Owner"],
      cp.map((it) => [it.item, it.frequency, it.owner]),
      [4680, 2340, 2340],
    ),
  );

  children.push(h("Reaction Plan (OCAP)", HeadingLevel.HEADING_2));
  const ocap = [
    "STOP — Hentikan proses pada titik abnormal & isolasi output yang dicurigai.",
    "ALERT — Notifikasi supervisor / process owner sesuai matriks eskalasi.",
    "CONTAIN — Karantina output, identifikasi unit terdampak (containment action).",
    "INVESTIGATE — Jalankan 5 Whys cepat untuk menemukan penyebab spesifik.",
    "CORRECT — Terapkan corrective action dan verifikasi sebelum proses dilanjutkan.",
    "DOCUMENT — Catat kejadian, root cause, & tindakan pada log OCAP untuk review.",
  ];
  ocap.forEach((step) => children.push(bullet(step)));

  const doc = new Document({
    creator: "Smart DMAIC Project Companion",
    title: "DMAIC Roadmap Report",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `DMAIC-Roadmap-${stamp}.docx`);
}

export function DmaicCompanion() {
  const [input, setInput] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const callGenerate = useServerFn(generateRoadmap);

  const STORAGE_KEY = "smart-dmaic:state:v1";
  const hydratedRef = useRef(false);

  // Restore persisted state on mount.
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const saved = JSON.parse(raw) as { input?: string; roadmap?: Roadmap | null };
        if (typeof saved.input === "string") setInput(saved.input);
        if (saved.roadmap) setRoadmap(saved.roadmap);
      }
    } catch {
      /* ignore corrupt storage */
    }
    hydratedRef.current = true;
  }, []);

  // Persist whenever input or roadmap changes (after hydration).
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, roadmap }));
    } catch {
      /* quota or unavailable */
    }
  }, [input, roadmap]);

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
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
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
              {roadmap && (
                <Button
                  onClick={() => window.print()}
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto sm:ml-auto"
                >
                  <Printer className="mr-2 size-4" />
                  Cetak / Simpan jadi PDF
                </Button>
              )}
              {roadmap && (
                <Button
                  onClick={async () => {
                    try {
                      await exportRoadmapToDocx(roadmap, goalStatement);
                      toast.success("Dokumen Word berhasil diunduh.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Gagal membuat dokumen Word.");
                    }
                  }}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <FileText className="mr-2 size-4" />
                  Export ke Word (.docx)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>


        <div ref={reportRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="define" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto bg-card border border-border p-1">
            <TabsTrigger value="define" className="gap-1.5"><Target className="size-4" />Define</TabsTrigger>
            <TabsTrigger value="measure" className="gap-1.5"><BarChart3 className="size-4" />Measure</TabsTrigger>
            <TabsTrigger value="analyze" className="gap-1.5"><Search className="size-4" />Analyze</TabsTrigger>
            <TabsTrigger value="improve" className="gap-1.5"><Lightbulb className="size-4" />Improve</TabsTrigger>
            <TabsTrigger value="control" className="gap-1.5"><ShieldCheck className="size-4" />Control</TabsTrigger>
          </TabsList>

          <TabsContent value="define" className="mt-6 animate-in fade-in-50 duration-300">
            {roadmap ? (
              <>
                <VisualProjectCharter roadmap={roadmap} initialGoal={goalStatement} />
                <div className="mt-6">
                  <SipocDiagram sipoc={roadmap.sipoc} domain={roadmap.domain} />
                </div>
              </>
            ) : (
              <EmptyPhasePlaceholder label="Tulis masalah Anda di atas, lalu klik Generate untuk membangun Project Charter & SIPOC." />
            )}
          </TabsContent>

          <TabsContent value="measure" className="mt-6 animate-in fade-in-50 duration-300">
            <div className="grid gap-5 md:grid-cols-3">
              <DataCollectionPlanCard roadmap={roadmap} />
              <SigmaCalculatorCard roadmap={roadmap} />
              <ControlChartCard roadmap={roadmap} />
              <XbarRChartCard roadmap={roadmap} />
              <PChartCard roadmap={roadmap} />
            </div>
          </TabsContent>

          <TabsContent value="analyze" className="mt-6 animate-in fade-in-50 duration-300">
            {roadmap ? (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <FiveWhysCard roadmap={roadmap} />
                  <FishboneCard roadmap={roadmap} />
                </div>
                <ParetoFishboneCard roadmap={roadmap} />
              </div>
            ) : (
              <EmptyPhasePlaceholder label="Klik Generate untuk menampilkan 5 Whys & Fishbone 6M." />
            )}
          </TabsContent>
          <TabsContent value="improve" className="mt-6 animate-in fade-in-50 duration-300">
            {roadmap ? (
              <div className="grid gap-5 lg:grid-cols-3">
                <ImproveActionPlanCard roadmap={roadmap} />
                <LeanToolCard roadmap={roadmap} />
              </div>
            ) : (
              <EmptyPhasePlaceholder label="Klik Generate untuk menampilkan Action Plan 5W+1H dan rekomendasi Lean Tool." />
            )}
          </TabsContent>
          <TabsContent value="control" className="mt-6 animate-in fade-in-50 duration-300">
            {roadmap ? (
              <div className="grid gap-5 lg:grid-cols-3">
                <ControlPlanCard roadmap={roadmap} />
                <ReactionPlanCard roadmap={roadmap} />
              </div>
            ) : (
              <EmptyPhasePlaceholder label="Klik Generate untuk menampilkan Control Plan dan Reaction Plan (OCAP)." />
            )}
          </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

/* ---------- Measure phase components ---------- */

function EmptyPhasePlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function DataCollectionPlanCard({ roadmap }: { roadmap: Roadmap | null }) {
  const rows = roadmap
    ? roadmap.ctqs.map((ctq, i) => ({
        metric:
          roadmap.metricNouns?.[i]?.trim() ||
          ctq
            .replace(/^(Berapa|Bagaimana|Apa|Kapan|Siapa|Channel)\s+/i, "")
            .replace(/\?$/, "")
            .split(/\s+/)
            .slice(0, 4)
            .join(" "),
        dataType: i % 2 === 0 ? "Continuous" : "Discrete / Attribute",
        tool:
          roadmap.domain === "food" || roadmap.domain === "defect"
            ? ["Check Sheet", "Sensor Log", "Pareto Tally", "QC Inspection Form"][i % 4]
            : roadmap.domain === "delay"
              ? ["Time Study", "Andon Log", "Throughput Counter", "Cycle Time Sheet"][i % 4]
              : ["CRM Ticket Log", "Survey CSAT", "Audit Form", "System Report"][i % 4],
        sample: ["30 sampel / shift", "Seluruh batch / hari", "n ≥ 50 / minggu", "Sampling acak 10%"][i % 4],
      }))
    : [];

  return (
    <Card className="border border-border shadow-sm md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-5 text-primary" />
          Data Collection Plan
        </CardTitle>
        <CardDescription>
          Rencana pengumpulan data baseline untuk setiap CTQ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Metric / CTQ</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Data Type</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Measurement Tool</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Sample Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j} className="px-3 py-3">
                          <div className="h-3 rounded bg-slate-100" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-3 py-2.5 text-sm text-slate-700 align-top">{r.metric}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">{r.dataType}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">{r.tool}</TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">{r.sample}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
        {rows.length === 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Tabel akan terisi otomatis setelah Generate DMAIC Roadmap.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SigmaCalculatorCard({ roadmap }: { roadmap: Roadmap | null }) {
  const hasQuant = roadmap ? roadmap.hasQuantitativeData !== false : true;
  const prefill = useMemo(() => {
    const b = roadmap?.baseline;
    const oppsFromCtq = roadmap?.metricNouns?.length || roadmap?.ctqs?.length || 1;
    if (roadmap && roadmap.hasQuantitativeData === false) {
      return { units: "", opps: "", defects: "" };
    }
    return {
      units: b?.units && b.units > 0 ? String(b.units) : "1000",
      opps: b?.opportunitiesPerUnit && b.opportunitiesPerUnit > 0
        ? String(b.opportunitiesPerUnit)
        : String(oppsFromCtq),
      defects: typeof b?.defects === "number" && b.defects >= 0 ? String(b.defects) : "50",
    };
  }, [roadmap]);

  const [units, setUnits] = useState<string>(prefill.units);
  const [opps, setOpps] = useState<string>(prefill.opps);
  const [defects, setDefects] = useState<string>(prefill.defects);
  const lastPrefillKey = useRef<string>("");

  useEffect(() => {
    // Re-prefill whenever a new roadmap is generated (identified by problem+domain).
    const key = roadmap ? `${roadmap.problem}::${roadmap.domain}` : "";
    if (key && key !== lastPrefillKey.current) {
      lastPrefillKey.current = key;
      setUnits(prefill.units);
      setOpps(prefill.opps);
      setDefects(prefill.defects);
    }
  }, [roadmap, prefill]);

  const { dpmo, sigma, yieldPct } = useMemo(() => {
    const u = parseFloat(units);
    const o = parseFloat(opps);
    const d = parseFloat(defects);
    if (!u || !o || u <= 0 || o <= 0 || isNaN(d) || d < 0) {
      return { dpmo: null as number | null, sigma: null as number | null, yieldPct: null as number | null };
    }
    const totalOpps = u * o;
    const dpo = d / totalOpps;
    const dpmoVal = dpo * 1_000_000;
    const y = Math.max(0, Math.min(1, 1 - dpo));
    // Six Sigma (with 1.5σ shift): Sigma = NORMSINV(1 - DPMO/1,000,000) + 1.5
    let sig: number | null = null;
    if (y >= 1) {
      sig = 6;
    } else if (y <= 0) {
      sig = null;
    } else {
      sig = +(normSInv(y) + 1.5).toFixed(2);
    }
    return { dpmo: Math.round(dpmoVal), sigma: sig, yieldPct: +(y * 100).toFixed(2) };
  }, [units, opps, defects]);

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crosshair className="size-5 text-primary" />
          DPMO & Sigma Level Calculator
        </CardTitle>
        <CardDescription>Hitung performa proses dari data inspeksi Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {roadmap && !hasQuant && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            Data kuantitatif belum cukup untuk kalkulasi DPMO. Tambahkan angka unit, defect, dan parameter kritis di deskripsi masalah untuk analisis yang lebih akurat — atau isi manual di bawah.
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Total Units Inspected</label>
          <Input type="number" min="1" step="1" value={units} onChange={(e) => setUnits(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Defect Opportunities per Unit</label>
          <Input type="number" min="1" step="1" value={opps} onChange={(e) => setOpps(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Total Defects Found</label>
          <Input type="number" min="0" step="1" value={defects} onChange={(e) => setDefects(e.target.value.replace(/\D/g, ""))} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">DPMO</p>
            <p className="font-display text-2xl font-bold text-slate-800 mt-0.5">
              {dpmo === null ? "Awaiting inputs..." : dpmo.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Sigma Level</p>
            <p className="font-display text-2xl font-bold text-slate-800 mt-0.5">
              {sigma === null ? "Awaiting inputs..." : `${sigma}σ`}
            </p>
          </div>
        </div>
        {yieldPct !== null && (
          <p className="text-xs text-slate-500">
            Process Yield: <span className="font-semibold text-slate-700">{yieldPct}%</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ControlChartCard({ roadmap }: { roadmap: Roadmap | null }) {
  const rec = roadmap ? recommendChart(roadmap) : null;

  return (
    <Card className="border border-border shadow-sm md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-5 text-primary" />
          Control Chart Recommendation
        </CardTitle>
        <CardDescription>
          Rekomendasi SPC chart berdasarkan jenis data dan konteks proses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rec ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="shrink-0 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 ring-1 ring-sky-200 px-5 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">Recommended</p>
              <p className="font-display text-2xl font-bold text-slate-800 mt-1">{rec.chart}</p>
              <p className="text-xs text-slate-500 mt-0.5">{rec.dataType}</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 flex-1">{rec.rationale}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/40 p-6 text-center text-sm text-slate-500">
            Awaiting project generation…
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function recommendChart(roadmap: Roadmap): { chart: string; dataType: string; rationale: string } {
  // Prefer AI-provided recommendation when available.
  const ai = (roadmap as unknown as { controlChart?: { chart?: string; dataType?: string; rationale?: string } }).controlChart;
  if (ai && ai.chart && ai.dataType && ai.rationale) {
    return { chart: ai.chart, dataType: ai.dataType, rationale: ai.rationale };
  }

  // Heuristic fallback based on problem text + metric nouns.
  const text = `${roadmap.problem ?? ""} ${(roadmap.metricNouns ?? []).join(" ")}`.toLowerCase();

  const continuousCue = /(waktu|cycle time|lead time|durasi|menit|detik|jam|suhu|temperatur|berat|gram|kg|ketebalan|panjang|mm|cm|tekanan|viskositas|kekentalan|kadar|ph|kelembapan|voltase|arus|kecepatan|liter|ml)/.test(text);
  const defectCountCue = /(jumlah cacat|banyak cacat|defect per|cacat per (unit|meter|m2|m²|batch)|keluhan per|jumlah keluhan|jumlah komplain)/.test(text);
  const proportionCue = /(proporsi|persentase|%|persen|tingkat cacat|reject rate|defect rate|% keterlambatan|% komplain|% reject)/.test(text);
  const fixedSampleCue = /(ukuran sampel tetap|sampel konstan|selalu \d+\s*(unit|sampel)|per batch \d+|\d+\s*unit per (batch|shift|hari))/.test(text);
  const varyingSampleCue = /(sampel bervariasi|ukuran sampel berbeda|volume harian berbeda|jumlah transaksi berbeda)/.test(text);
  const opportunityVariesCue = /(per (m2|m²|meter|1000 transaksi)|area of opportunity|luas berbeda)/.test(text);

  if (defectCountCue) {
    if (opportunityVariesCue) {
      return {
        chart: "u-Chart",
        dataType: "Attribute · Jumlah cacat per unit (opportunity bervariasi)",
        rationale:
          "Karena data menghitung jumlah cacat per unit dengan area of opportunity yang berbeda antar inspeksi, u-Chart tepat untuk menormalisasi jumlah cacat terhadap ukuran unit.",
      };
    }
    return {
      chart: "c-Chart",
      dataType: "Attribute · Jumlah cacat per unit (opportunity konstan)",
      rationale:
        "Karena tiap unit dapat memiliki lebih dari satu cacat dan area of opportunity konsisten antar inspeksi, c-Chart memantau jumlah cacat per unit secara langsung.",
    };
  }

  if (proportionCue || (!continuousCue && (roadmap.domain === "food" || roadmap.domain === "defect" || roadmap.domain === "service" || roadmap.domain === "delay"))) {
    if (fixedSampleCue && !varyingSampleCue) {
      return {
        chart: "np-Chart",
        dataType: "Attribute · Jumlah unit cacat (n konstan)",
        rationale:
          "Karena ukuran sampel yang diperiksa konstan setiap periode, np-Chart memantau jumlah unit cacat per subgrup secara langsung tanpa perlu konversi ke proporsi.",
      };
    }
    return {
      chart: "p-Chart",
      dataType: "Attribute · Proporsi unit cacat (n bervariasi)",
      rationale:
        "Karena data berupa proporsi unit cacat/defective dan ukuran sampel dapat berbeda antar inspeksi, p-Chart tepat untuk memantau stabilitas tingkat defect dari waktu ke waktu.",
    };
  }

  if (continuousCue) {
    return {
      chart: "X̄-R Chart",
      dataType: "Continuous · Subgrup kecil (n = 2–10)",
      rationale:
        "Metrik utama bersifat kontinu (dapat diukur pada skala) dan dapat dikelompokkan dalam subgrup kecil per shift/batch, sehingga X̄-R Chart memantau rata-rata dan variasi proses secara simultan.",
    };
  }

  return {
    chart: "I-MR Chart",
    dataType: "Continuous · Pengukuran individual",
    rationale:
      "Data dikumpulkan satu observasi per periode tanpa subgrup natural, sehingga I-MR Chart memantau nilai individu beserta moving range untuk mendeteksi pergeseran proses.",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">{title}</h3>
      {children}
    </div>
  );
}

function XbarRChartCard({ roadmap }: { roadmap: Roadmap | null }) {
  const data = useMemo(() => {
    if (!roadmap) return null;
    const rec = recommendChart(roadmap);
    if (rec.chart !== "X̄-R Chart") return null;

    // Seeded pseudo-random from problem text so simulation is stable across renders.
    const seedSrc = (roadmap.problem ?? "xbar") + (roadmap.metricNouns?.join("|") ?? "");
    let seed = 0;
    for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const target = 100;
    const sigma = 5;
    const n = 5; // subgroup size
    const k = 20; // subgroups
    const points: { subgroup: string; xbar: number }[] = [];
    for (let i = 1; i <= k; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        // Box-Muller
        const u1 = Math.max(rand(), 1e-9);
        const u2 = rand();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sum += target + sigma * z;
      }
      points.push({ subgroup: `#${i}`, xbar: +(sum / n).toFixed(2) });
    }
    const mean = points.reduce((s, p) => s + p.xbar, 0) / points.length;
    // 3-sigma limits on subgroup means: σ_xbar = σ/√n
    const sigmaXbar = sigma / Math.sqrt(n);
    const ucl = +(mean + 3 * sigmaXbar).toFixed(2);
    const lcl = +(mean - 3 * sigmaXbar).toFixed(2);
    return { points, mean: +mean.toFixed(2), ucl, lcl };
  }, [roadmap]);

  if (!data) return null;

  const config = {
    xbar: { label: "Rata-rata Subgrup (X̄)", color: "var(--chart-1)" },
  };

  return (
    <Card className="border border-border shadow-sm md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-5 text-primary" />
          X̄-R Chart Simulation
        </CardTitle>
        <CardDescription>
          Simulasi 20 subgrup (n=5) di sekitar rata-rata proses, dengan batas kendali 3σ (UCL/LCL).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[320px] w-full">
          <ComposedChart data={data.points} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="subgroup" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              domain={[Math.floor(data.lcl - 2), Math.ceil(data.ucl + 2)]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={data.ucl}
              stroke="var(--chart-5)"
              strokeDasharray="4 4"
              label={{ value: `UCL ${data.ucl}`, position: "insideTopRight", fill: "var(--chart-5)", fontSize: 11 }}
            />
            <ReferenceLine
              y={data.mean}
              stroke="var(--chart-2)"
              strokeDasharray="6 3"
              label={{ value: `X̿ ${data.mean}`, position: "insideTopRight", fill: "var(--chart-2)", fontSize: 11 }}
            />
            <ReferenceLine
              y={data.lcl}
              stroke="var(--chart-5)"
              strokeDasharray="4 4"
              label={{ value: `LCL ${data.lcl}`, position: "insideBottomRight", fill: "var(--chart-5)", fontSize: 11 }}
            />
            <Line
              type="linear"
              dataKey="xbar"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--chart-1)" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
        <p className="mt-3 text-xs text-slate-500">
          Data disimulasikan untuk ilustrasi pola X̄-R Chart. Ganti dengan pengukuran subgrup aktual saat fase Measure berjalan.
        </p>
      </CardContent>
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  return CopyButtonImpl({ text });
}

function PChartCard({ roadmap }: { roadmap: Roadmap | null }) {
  const data = useMemo(() => {
    if (!roadmap) return null;
    if (roadmap.hasQuantitativeData === false) return null;
    const rec = recommendChart(roadmap);
    if (rec.chart !== "p-Chart") return null;

    const b = roadmap.baseline;
    let pBar = 0.08;
    if (b && b.units && b.defects != null) {
      const denom = b.units * (b.opportunitiesPerUnit || 1);
      if (denom > 0) pBar = Math.min(0.9, Math.max(0.005, b.defects / denom));
    }

    const seedSrc = (roadmap.problem ?? "pchart") + (roadmap.metricNouns?.join("|") ?? "");
    let seed = 0;
    for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const k = 20;
    const baseN = b?.units ? Math.max(30, Math.round(b.units / k)) : 100;
    const points: { sample: string; p: number; n: number; ucl: number; lcl: number }[] = [];
    const raw: { n: number; d: number }[] = [];
    for (let i = 0; i < k; i++) {
      // sample size varies ±25% (p-Chart hallmark)
      const n = Math.max(20, Math.round(baseN * (0.75 + rand() * 0.5)));
      let d = 0;
      for (let j = 0; j < n; j++) if (rand() < pBar) d++;
      raw.push({ n, d });
    }
    const totalN = raw.reduce((s, r) => s + r.n, 0);
    const totalD = raw.reduce((s, r) => s + r.d, 0);
    const pCenter = totalN > 0 ? totalD / totalN : pBar;
    raw.forEach((r, i) => {
      const sd = Math.sqrt((pCenter * (1 - pCenter)) / r.n);
      points.push({
        sample: `Sample ${i + 1}`,
        p: +((r.d / r.n) * 100).toFixed(2),
        n: r.n,
        ucl: +Math.min(100, (pCenter + 3 * sd) * 100).toFixed(2),
        lcl: +Math.max(0, (pCenter - 3 * sd) * 100).toFixed(2),
      });
    });
    const maxUcl = Math.max(...points.map((p) => p.ucl), ...points.map((p) => p.p));
    return { points, center: +(pCenter * 100).toFixed(2), maxUcl };
  }, [roadmap]);

  if (!data) return null;

  const config = {
    p: { label: "Proporsi Cacat (%)", color: "var(--chart-1)" },
    ucl: { label: "UCL (%)", color: "var(--chart-5)" },
    lcl: { label: "LCL (%)", color: "var(--chart-5)" },
  };

  return (
    <Card className="border border-border shadow-sm md:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-5 text-primary" />
          p-Chart Simulation
        </CardTitle>
        <CardDescription>
          Simulasi 20 sampel dengan ukuran sampel bervariasi. Batas kendali dihitung dari rata-rata proporsi cacat (p̄ = {data.center}%).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[320px] w-full">
          <ComposedChart data={data.points} margin={{ top: 16, right: 24, left: 8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="sample"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
              tickFormatter={(v: string) => v.replace("Sample ", "")}
              label={{ value: "Nomor Sampel", position: "insideBottom", offset: -18, fontSize: 11 }}
            />
            <YAxis
              domain={[0, Math.ceil(data.maxUcl + 2)]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(v: number) => `${v}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={data.center}
              stroke="var(--chart-2)"
              strokeDasharray="6 3"
              label={{ value: `p̄ ${data.center}%`, position: "insideTopRight", fill: "var(--chart-2)", fontSize: 11 }}
            />
            <Line
              type="stepAfter"
              dataKey="ucl"
              stroke="var(--chart-5)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="stepAfter"
              dataKey="lcl"
              stroke="var(--chart-5)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="p"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--chart-1)" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
        <p className="mt-3 text-xs text-slate-500">
          Data disimulasikan dari baseline defect rate untuk ilustrasi pola p-Chart. UCL/LCL melangkah karena ukuran sampel bervariasi.
        </p>
      </CardContent>
    </Card>
  );
}

function CopyButtonImpl({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin teks.");
    }
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
      <span className="sr-only">Copy text</span>
    </Button>
  );
}

/* ---------- Analyze phase: 5 Whys + Fishbone ---------- */

function FiveWhysCard({ roadmap }: { roadmap: Roadmap }) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Search className="size-5 text-primary" />
            5 Whys Analysis
          </span>
          <CopyButton text={roadmap.fiveWhys.join("\n")} />
        </CardTitle>
        <CardDescription>Rantai kausal dari gejala ke akar masalah sistemik.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {roadmap.fiveWhys.map((w, i) => {
            const isRoot = i === roadmap.fiveWhys.length - 1;
            return (
              <li key={i} className="flex gap-3">
                <div
                  className={`shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                    isRoot
                      ? "bg-rose-50 text-rose-600 ring-rose-200"
                      : "bg-indigo-50 text-indigo-600 ring-indigo-200"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-slate-700">{w}</p>
                  {isRoot && (
                    <Badge variant="secondary" className="mt-1 bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                      Root Cause
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

const fishboneCategories = [
  { key: "manpower",     label: "Manpower",       tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  { key: "machine",      label: "Machine",        tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  { key: "method",       label: "Method",         tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { key: "material",     label: "Material",       tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { key: "measurement",  label: "Measurement",    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { key: "motherNature", label: "Mother Nature",  tone: "bg-violet-50 text-violet-700 ring-violet-200" },
] as const;

function FishboneCard({ roadmap }: { roadmap: Roadmap }) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertOctagon className="size-5 text-primary" />
          Fishbone Diagram (6M)
        </CardTitle>
        <CardDescription>
          Kategorisasi potensi penyebab: Manpower, Machine, Method, Material, Measurement, Mother Nature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fishboneCategories.map((cat) => (
            <div
              key={cat.key}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ring-1 ${cat.tone}`}>
                  {cat.label}
                </span>
              </div>
              <ul className="space-y-1.5">
                {roadmap.fishbone[cat.key].map((cause, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700 leading-snug">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Pareto (Fishbone counts) ---------- */

function ParetoFishboneCard({ roadmap }: { roadmap: Roadmap }) {
  const data = useMemo(() => {
    const fb = roadmap?.fishbone;
    if (!fb) return [];
    const rows = fishboneCategories
      .map((cat) => ({
        category: cat.label,
        causes: Array.isArray(fb[cat.key]) ? fb[cat.key].length : 0,
      }))
      .filter((r) => r.causes > 0)
      .sort((a, b) => b.causes - a.causes || a.category.localeCompare(b.category));
    const total = rows.reduce((s, r) => s + r.causes, 0);
    if (total === 0) return [];
    let running = 0;
    return rows.map((r) => {
      running += r.causes;
      return { ...r, cumulative: Math.round((running / total) * 100) };
    });
  }, [roadmap]);

  if (data.length === 0) return null;

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-5 text-primary" />
          Pareto Analysis — Fishbone 6M
        </CardTitle>
        <CardDescription>
          Distribusi jumlah penyebab per kategori 6M, diurut menurun dengan garis persentase kumulatif (aturan 80/20).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            causes: { label: "Jumlah Penyebab", color: "var(--chart-1)" },
            cumulative: { label: "Kumulatif %", color: "var(--chart-2)" },
          }}
          className="h-[320px] w-full"
        >
          <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} />
            <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="causes" fill="var(--color-causes)" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="causes" position="top" offset={10} fill="var(--foreground)" fontSize={11} />
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="var(--color-cumulative)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
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

/* ---------- Improve phase: 5W+1H + Lean Tool ---------- */

const ownerByDomain: Record<Roadmap["domain"], string[]> = {
  food: ["Production Supervisor", "QA Engineer", "Maintenance Lead"],
  defect: ["Line Leader", "Quality Engineer", "Process Engineer"],
  delay: ["Operations Manager", "Shift Supervisor", "Continuous Improvement Lead"],
  service: ["CS Team Lead", "Knowledge Manager", "Service Quality Analyst"],
  generic: ["Process Owner", "Tech Lead", "Project Manager"],
};

const leanToolByDomain: Record<Roadmap["domain"], { tool: string; rationale: string }> = {
  food: {
    tool: "Poka-Yoke (Mistake-Proofing)",
    rationale:
      "Karena akar masalah didominasi variasi parameter mesin dan kelalaian operator, mekanisme pencegahan kesalahan otomatis (sensor, interlock, alarm) paling efektif menjaga konsistensi setiap batch.",
  },
  defect: {
    tool: "Poka-Yoke + Standard Work",
    rationale:
      "Kombinasi mistake-proofing pada titik kritis dan standardisasi instruksi kerja visual akan menutup variasi proses serta mempercepat deteksi cacat di sumber.",
  },
  delay: {
    tool: "Kaizen Event + 5S",
    rationale:
      "Bottleneck dan layout yang tidak efisien paling cepat diselesaikan lewat rapid improvement workshop dan penataan area kerja 5S untuk menstabilkan flow.",
  },
  service: {
    tool: "Standard Work + Visual Management",
    rationale:
      "Inkonsistensi respons frontline diatasi dengan skrip terstandar, knowledge base, dan dashboard SLA real-time agar setiap interaksi pelanggan mengikuti standar yang sama.",
  },
  generic: {
    tool: "Kaizen + PDCA",
    rationale:
      "Pendekatan perbaikan iteratif kecil (PDCA) cocok untuk konteks digital/proses yang masih membutuhkan eksperimen cepat sebelum solusi dibakukan.",
  },
};

function ImproveActionPlanCard({ roadmap }: { roadmap: Roadmap }) {
  const owners = ownerByDomain[roadmap.domain];
  const rows = roadmap.actions.slice(0, 3).map((a, i) => ({
    what: a.solution,
    why: `Mengatasi: ${a.failure}`,
    who: owners[i % owners.length],
    how: a.method,
  }));
  return (
    <Card className="border border-border shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-5 text-primary" />
          Improvement Action Plan (5W + 1H)
        </CardTitle>
        <CardDescription>
          Tiga solusi prioritas berbasis akar masalah, lengkap dengan owner dan metode implementasi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">What (Action Item)</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Why (Purpose)</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Who (Owner)</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">How (Method)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="px-3 py-2.5 text-sm font-medium text-slate-800 align-top">{r.what}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">{r.why}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">{r.who}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                      {r.how}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function LeanToolCard({ roadmap }: { roadmap: Roadmap }) {
  const rec = leanToolByDomain[roadmap.domain];
  return (
    <Card className="border border-border shadow-sm bg-gradient-to-br from-amber-50/60 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-5 text-amber-500" />
          Lean Tool Recommendation
        </CardTitle>
        <CardDescription>Tool Lean paling relevan untuk konteks masalah Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl bg-white ring-1 ring-amber-200 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Recommended Tool</p>
          <p className="font-display text-xl font-bold text-slate-800 mt-1">{rec.tool}</p>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{rec.rationale}</p>
        {roadmap.pokaYoke?.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Contoh Implementasi
            </p>
            <ul className="space-y-1.5">
              {roadmap.pokaYoke.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-amber-500" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Control phase: Control Plan + Reaction Plan ---------- */

const controlPlanByDomain: Record<
  Roadmap["domain"],
  { item: string; frequency: string; owner: string }[]
> = {
  food: [
    { item: "Kalibrasi sensor suhu mesin penggorengan", frequency: "Harian (awal shift)", owner: "Maintenance Lead" },
    { item: "Audit kepatuhan SOP operator produksi", frequency: "Mingguan", owner: "Production Supervisor" },
    { item: "Update p-Chart defect rate per batch", frequency: "Per batch", owner: "QA Engineer" },
    { item: "Review kinerja supplier bahan baku", frequency: "Bulanan", owner: "Procurement / QA" },
  ],
  defect: [
    { item: "Verifikasi alat ukur kritis (gauge R&R)", frequency: "Harian", owner: "Quality Engineer" },
    { item: "Inspeksi in-process di titik kontrol", frequency: "Setiap sub-grup", owner: "Line Leader" },
    { item: "Update Control Chart parameter proses", frequency: "Per shift", owner: "Process Engineer" },
    { item: "Audit sertifikasi & kompetensi operator", frequency: "Bulanan", owner: "Training Coordinator" },
  ],
  delay: [
    { item: "Daily huddle & visual management board", frequency: "Harian", owner: "Shift Supervisor" },
    { item: "Monitoring takt time & WIP per stasiun", frequency: "Per shift", owner: "Operations Manager" },
    { item: "Update X̄-R Chart lead time", frequency: "Mingguan", owner: "CI Lead" },
    { item: "Review layout & line balancing", frequency: "Bulanan", owner: "Industrial Engineer" },
  ],
  service: [
    { item: "Monitoring SLA & response time real-time", frequency: "Harian", owner: "CS Team Lead" },
    { item: "Kalibrasi skrip & knowledge base", frequency: "Mingguan", owner: "Knowledge Manager" },
    { item: "Update u-Chart jumlah keluhan", frequency: "Mingguan", owner: "Service Quality Analyst" },
    { item: "Audit kepatuhan agen CS", frequency: "Bulanan", owner: "QA Manager" },
  ],
  generic: [
    { item: "Verifikasi checklist proses di titik kritis", frequency: "Harian", owner: "Process Owner" },
    { item: "Monitoring metrik kunci dashboard", frequency: "Mingguan", owner: "Tech Lead" },
    { item: "Review log error & anomali", frequency: "Mingguan", owner: "On-call Engineer" },
    { item: "Retrospective & continuous improvement", frequency: "Bulanan", owner: "Project Manager" },
  ],
};

function ControlPlanCard({ roadmap }: { roadmap: Roadmap }) {
  const items = controlPlanByDomain[roadmap.domain];
  return (
    <Card className="border border-border shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-5 text-primary" />
          Control Plan / SOP Checklist
        </CardTitle>
        <CardDescription>
          Aktivitas rutin untuk menjaga hasil perbaikan tetap stabil dari waktu ke waktu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="px-3 w-10 text-xs font-semibold uppercase tracking-wider text-slate-600">✓</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Control Activity</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Frequency</TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell className="px-3 py-2.5 align-top">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white" />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm font-medium text-slate-800 align-top">{it.item}</TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      {it.frequency}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-slate-600 align-top">{it.owner}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ReactionPlanCard({ roadmap }: { roadmap: Roadmap }) {
  const steps = [
    "STOP — Hentikan proses pada titik abnormal & isolasi output yang dicurigai.",
    "ALERT — Notifikasi supervisor / process owner sesuai matriks eskalasi.",
    "CONTAIN — Karantina output, identifikasi unit terdampak (containment action).",
    "INVESTIGATE — Jalankan 5 Whys cepat untuk menemukan penyebab spesifik.",
    "CORRECT — Terapkan corrective action dan verifikasi sebelum proses dilanjutkan.",
    "DOCUMENT — Catat kejadian, root cause, & tindakan pada log OCAP untuk review.",
  ];
  void roadmap;
  return (
    <Card className="border border-border shadow-sm bg-gradient-to-br from-rose-50/60 to-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <AlertOctagon className="size-5 text-rose-500" />
            Reaction Plan (OCAP)
          </span>
          <CopyButton text={steps.join("\n")} />
        </CardTitle>
        <CardDescription>
          Out-of-Control Action Plan — langkah yang harus dijalankan saat proses keluar batas kontrol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold ring-1 ring-rose-200">
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed text-slate-700">{s}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}