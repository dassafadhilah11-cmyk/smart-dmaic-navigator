import { Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface LanguageToggleProps {
  lang: Language;
  toggleLang: () => void;
}

export function LanguageToggle({ lang, toggleLang }: LanguageToggleProps) {
  return (
    <Button 
      onClick={toggleLang} 
      variant="outline" 
      size="sm"
      className="font-semibold transition-all duration-200"
    >
      {lang === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
    </Button>
  );
}
