import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setDateLocale } from "../lib/format";
import { MESSAGES, translateFlowText, type Messages } from "./messages";

export type Language = keyof typeof MESSAGES;

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "it", label: "Italiano" },
  { value: "en", label: "English" },
];

const STORAGE_KEY = "adopta.language";

/** "en", "en-US", "EN" -> "en"; anything that is not Italian or English -> undefined. */
export function toLanguage(value?: string | null): Language | undefined {
  const code = value?.trim().toLowerCase().slice(0, 2);
  return code === "it" || code === "en" ? code : undefined;
}

function storedLanguage(): Language | undefined {
  try {
    return toLanguage(localStorage.getItem(STORAGE_KEY));
  } catch {
    return undefined;
  }
}

function browserLanguage(): Language | undefined {
  return typeof navigator === "undefined" ? undefined : toLanguage(navigator.language);
}

// Code outside React (data layer, hooks) reads the texts of the language the provider last rendered.
let current: Language = storedLanguage() ?? browserLanguage() ?? "it";

export function text(): Messages {
  return MESSAGES[current];
}

/** The flows answer in Italian: English for the texts they are known to return. */
export function flowText(message: string): string {
  return translateFlowText(message, current);
}

interface I18n {
  language: Language;
  t: Messages;
  setLanguage: (language: Language) => void;
  flowText: (text: string) => string;
}

const I18nContext = createContext<I18n | undefined>(undefined);

/**
 * Language of the app: the one the user picked (kept in this browser), otherwise the browser's if it
 * is Italian or English, otherwise `fallback` (the default language in Adopta Setting), otherwise Italian.
 */
export function I18nProvider({ fallback, children }: { fallback?: Language; children: ReactNode }) {
  const [chosen, setChosen] = useState<Language | undefined>(storedLanguage);
  const language = chosen ?? browserLanguage() ?? fallback ?? "it";
  current = language;
  setDateLocale(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((value: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage blocked: the choice lasts until the app is closed.
    }
    setChosen(value);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      language,
      t: MESSAGES[language],
      setLanguage,
      flowText: (message: string) => translateFlowText(message, language),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n outside I18nProvider");
  return value;
}
