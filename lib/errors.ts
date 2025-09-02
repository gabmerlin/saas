// lib/errors.ts
import type { PostgrestError } from "@supabase/supabase-js";

/** Extrait un message sûr depuis une erreur inconnue, sans any */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  // objets avec "message" sérialisable
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message?: unknown }).message === "string"
  ) {
    return String((err as { message?: unknown }).message);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

/** Type guard : est-ce un PostgREST/PostgrestError ? */
export function isPostgrestError(e: unknown): e is PostgrestError {
  if (typeof e !== "object" || e === null) return false;
  const maybe = e as Partial<PostgrestError>;
  return (
    typeof maybe.message === "string" &&
    typeof maybe.code === "string"
  );
}

/** PostgREST code quand single() ne trouve pas de ligne */
export const NO_ROWS_CODE = "PGRST116";

/** PostgreSQL unique_violation */
export const UNIQUE_VIOLATION = "23505";
