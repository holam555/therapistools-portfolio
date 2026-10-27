export function newId(prefix = "x"): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return `${prefix}_${c.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
