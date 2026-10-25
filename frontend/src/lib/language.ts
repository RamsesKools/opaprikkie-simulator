import { createContext, useContext } from "react";
import type { Strings } from "./strings.ts";
import { en } from "./strings_en.ts";
import { nl } from "./strings_nl.ts";

export const languages = ["nl", "en"] as const;
export type Language = (typeof languages)[number];

export const DEFAULT_LANGUAGE: Language = "nl";
export const STORAGE_KEY = "opaprikkie.language";

export const dictionaries: Record<Language, Strings> = { nl, en };

const isLanguage = (value: unknown): value is Language =>
  languages.some((language) => language === value);

export function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(value)) return value;
  } catch {
    // Storage can be blocked; the default does fine.
  }
  return DEFAULT_LANGUAGE;
}

export function storeLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The choice then lasts until the page reloads.
  }
}

type Value = { language: Language; strings: Strings; setLanguage: (language: Language) => void };

export const LanguageContext = createContext<Value | null>(null);

export function useLanguage(): Value {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage needs a LanguageProvider");
  return value;
}

export const useStrings = (): Strings => useLanguage().strings;
