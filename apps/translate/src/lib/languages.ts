export interface LanguageOption {
  code: string;
  label: string;
  /** Tarayıcı speechSynthesis/SpeechRecognition için BCP-47 kodu. */
  bcp47: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "tr", label: "Türkçe", bcp47: "tr-TR" },
  { code: "en", label: "İngilizce", bcp47: "en-US" },
  { code: "de", label: "Almanca", bcp47: "de-DE" },
  { code: "fr", label: "Fransızca", bcp47: "fr-FR" },
  { code: "es", label: "İspanyolca", bcp47: "es-ES" },
  { code: "it", label: "İtalyanca", bcp47: "it-IT" },
  { code: "ru", label: "Rusça", bcp47: "ru-RU" },
  { code: "ar", label: "Arapça", bcp47: "ar-SA" },
  { code: "fa", label: "Farsça", bcp47: "fa-IR" },
  { code: "zh", label: "Çince", bcp47: "zh-CN" },
  { code: "ja", label: "Japonca", bcp47: "ja-JP" },
  { code: "ko", label: "Korece", bcp47: "ko-KR" },
  { code: "pt", label: "Portekizce", bcp47: "pt-PT" },
  { code: "nl", label: "Hollandaca", bcp47: "nl-NL" },
  { code: "pl", label: "Lehçe", bcp47: "pl-PL" },
  { code: "uk", label: "Ukraynaca", bcp47: "uk-UA" },
  { code: "el", label: "Yunanca", bcp47: "el-GR" },
  { code: "az", label: "Azerbaycan Türkçesi", bcp47: "az-AZ" },
  { code: "bg", label: "Bulgarca", bcp47: "bg-BG" },
  { code: "ro", label: "Rumence", bcp47: "ro-RO" },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export function bcp47For(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.bcp47 ?? code;
}

export function isKnownLanguage(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code);
}
