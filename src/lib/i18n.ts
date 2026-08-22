// src/lib/i18n.ts
import { useState, useEffect } from 'react';

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

// Custom hook langsung di file i18n agar tidak perlu buat folder context
export function useLanguageState() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('dmaic_lang');
    return (saved === 'id' || saved === 'en') ? saved : 'id';
  });

  useEffect(() => {
    localStorage.setItem('dmaic_lang', lang);
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => (prev === 'id' ? 'en' : 'id'));
  };

  const t = (key: keyof typeof translations['id']) => {
    return translations[lang][key] || translations['en'][key];
  };

  return { lang, toggleLang, t };
}
