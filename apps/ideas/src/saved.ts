/**
 * Saved reels live in this browser only, as a list of Instagram short codes.
 * Nothing about what a visitor saves is sent anywhere.
 */
const KEY = "ttideas:saved:v1";
const CODE = /^[A-Za-z0-9_-]{5,20}$/;

export function readSaved(storage: Pick<Storage, "getItem"> = localStorage): string[] {
  try {
    const v: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((c): c is string => typeof c === "string" && CODE.test(c)) : [];
  } catch {
    return [];
  }
}

export function writeSaved(codes: string[], storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(codes));
  } catch {
    // Storage full or blocked: saving just does not stick.
  }
}

/** Newest first. */
export function toggleSaved(codes: string[], code: string): string[] {
  return codes.includes(code) ? codes.filter((c) => c !== code) : [code, ...codes];
}
