import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  dictionaries,
  LanguageContext,
  storedLanguage,
  storeLanguage,
  type Language,
} from "./language.ts";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setCurrent] = useState<Language>(storedLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setCurrent(next);
    storeLanguage(next);
  }, []);

  const value = useMemo(
    () => ({ language, strings: dictionaries[language], setLanguage }),
    [language, setLanguage],
  );
  return <LanguageContext value={value}>{children}</LanguageContext>;
}
