export type Language = 'id' | 'en';

export const translations = {
  id: {
    appTitle: "Smart DMAIC Navigator",
    subtitle: "Asisten AI untuk Praktisi Lean Six Sigma",
    define: "Define (Definisikan)",
    measure: "Measure (Ukur)",
    analyze: "Analyze (Analisis)",
    improve: "Improve (Tingkatkan)",
    control: "Control (Kontrol)",
    generateRoadmap: "Buat Roadmap DMAIC",
    problemStatementPlaceholder: "Masukkan pernyataan masalah (problem statement) Anda di sini...",
    loading: "Memproses analisis...",
    languageToggle: "Ganti Bahasa",
  },
  en: {
    appTitle: "Smart DMAIC Navigator",
    subtitle: "AI Assistant for Lean Six Sigma Practitioners",
    define: "Define",
    measure: "Measure",
    analyze: "Analyze",
    improve: "Improve",
    control: "Control",
    generateRoadmap: "Generate DMAIC Roadmap",
    problemStatementPlaceholder: "Enter your problem statement here...",
    loading: "Processing analysis...",
    languageToggle: "Switch Language",
  },
};

export function getTranslation(lang: Language, key: keyof typeof translations['id']) {
  return translations[lang][key] || translations['en'][key];
}
