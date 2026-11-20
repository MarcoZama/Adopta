import profiles from "../deploy/editions.json" with { type: "json" };

declare const __ADOPTA_EDITION__: "it" | "en";

export type Edition = keyof typeof profiles;
export type EditionProfile = Omit<(typeof profiles)[Edition], "language"> & { language: Edition };

export function getEdition(value: string): EditionProfile {
  if (value !== "it" && value !== "en") throw new Error(`Unknown Adopta edition: ${value}`);
  return { ...profiles[value], language: value };
}

export function edition(): EditionProfile {
  return getEdition(__ADOPTA_EDITION__);
}

const tables = ["communication", "communicationgroup", "audiencegroup", "delivery", "setting", "dispatchclaim"];
const names = tables.flatMap((name) => {
  const singular = `vm_adopta${name}`;
  const plural = name === "delivery" ? "vm_adoptadeliveries" : `${singular}s`;
  return [singular, plural, `${singular}id`];
});

export function nativeName(name: string, profile = edition()): string {
  if (profile.language === "it") return name;
  return names.includes(name) ? name.replace("vm_adopta", profile.prefix) : name;
}

export function canonicalName(name: string, profile = edition()): string {
  if (profile.language === "it") return name;
  const canonical = name.replace(/^vm_adoptaen/, "vm_adopta");
  return names.includes(canonical) ? canonical : name;
}

export function bindQuery(query: string, profile = edition()): string {
  // OData string literals are user data, not schema identifiers.
  return query.split(/('(?:[^']|'')*')/g).map((part, index) =>
    index % 2 ? part : part.replace(/\bvm_adopta[a-z]+\b/g, (name) => nativeName(name, profile)),
  ).join("");
}

export function bindRecord(record: Record<string, unknown>, profile = edition()): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [
    nativeName(key, profile),
    key.endsWith("@odata.bind") && typeof value === "string"
      ? value.replace(/^\/([a-z_]+)\(/, (_, name: string) => `/${nativeName(name, profile)}(`)
      : value,
  ]));
}

export function canonicalRecord(value: unknown, profile = edition()): unknown {
  if (Array.isArray(value)) return value.map((row) => canonicalRecord(row, profile));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, field]) => [canonicalName(key, profile), field]));
}
