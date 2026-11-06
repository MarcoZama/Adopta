const LOCALES = { it: "it-IT", en: "en-GB" } as const;

function formatters(language: keyof typeof LOCALES) {
  const locale = LOCALES[language];
  return {
    dateTime: new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    dateTimeSeconds: new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

const byLanguage = { it: formatters("it"), en: formatters("en") };
let active = byLanguage.it;

/** Called by the I18nProvider when the app language changes. */
export function setDateLocale(language: keyof typeof LOCALES) {
  active = byLanguage[language];
}

function parse(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDateTime(value?: string | Date | null, fallback = "-"): string {
  const date = parse(value);
  return date ? active.dateTime.format(date) : fallback;
}

export function formatDateTimeSeconds(value?: string | Date | null, fallback = "-"): string {
  const date = parse(value);
  return date ? active.dateTimeSeconds.format(date) : fallback;
}

export function formatTime(value?: Date): string {
  return value ? active.time.format(value) : "-";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-mm-dd in local time, the value format of <input type="date">. */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of an <input type="date"> value. */
export function fromDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function combineLocal(dateValue: string, hour: string, minute: string): Date | undefined {
  const day = fromDateInput(dateValue);
  if (!day) return undefined;
  day.setHours(Number(hour), Number(minute), 0, 0);
  return day;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
export const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
export const twoDigits = pad;

export const HTTPS_LINK = /^https:\/\/\S+$/;
