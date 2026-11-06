const LOCALES = { it: "it-IT", en: "en-GB" } as const;

const byLanguage = {
  it: new Intl.DateTimeFormat(LOCALES.it, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  en: new Intl.DateTimeFormat(LOCALES.en, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
};
let dateTime = byLanguage.it;

/** Called by the I18nProvider when the app language changes. */
export function setDateLocale(language: keyof typeof LOCALES) {
  dateTime = byLanguage[language];
}

function parse(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDateTime(value?: string | Date | null, fallback = "-"): string {
  const date = parse(value);
  return date ? dateTime.format(date) : fallback;
}
