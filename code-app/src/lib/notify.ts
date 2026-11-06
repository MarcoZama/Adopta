export type NotifyIntent = "success" | "error" | "warning" | "info";

export type Notify = (message: string, intent: NotifyIntent) => void;

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
