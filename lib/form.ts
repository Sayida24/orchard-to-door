// Small helpers shared by admin/seller forms and their server actions.

// `values` echoes what was typed: React 19 resets a form after each action,
// so on an error the form refills its inputs from these.
export type FormState = { error?: string; values?: Record<string, string> } | undefined;

/** Return an error and keep the user's input (passwords are never echoed back). */
export function fail(fd: FormData, error: string): FormState {
  const values: Record<string, string> = {};
  for (const [k, v] of fd) if (typeof v === "string" && !k.startsWith("$") && !/password/i.test(k)) values[k] = v;
  return { error, values };
}

export function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

/** Empty string -> null, otherwise the trimmed value. */
export function optStr(fd: FormData, key: string) {
  return str(fd, key) || null;
}

/** Empty -> null; non-numeric -> NaN (caller validates). */
export function optNum(fd: FormData, key: string) {
  const v = str(fd, key);
  return v === "" ? null : Number(v);
}

/** Prisma unique-constraint violation (e.g. duplicate name). */
export function isUniqueError(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
