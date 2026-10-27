import { WorksheetConfig, EmojiTheme } from '@/lib/shapes';
import { AgeBand } from '@/lib/defaultConfig';

/**
 * Client-side persistence (localStorage), v2. Everything a returning family
 * relies on lives here so it survives refresh — and so a future backend
 * (ROADMAP Phase 4) can sync it. All records are keyed and versioned; all
 * access is try/caught because localStorage throws in private mode / when full,
 * and a worksheet generator must never crash over storage.
 *
 * Privacy rule: a child's name is NEVER stored. Profiles carry a nickname
 * from a fixed list; the name typed on a worksheet (`childName`) lives only in
 * memory for that printout and is stripped from everything written here and
 * from share links (see withoutChildName). Names saved by older versions are
 * removed on first load (purgeStoredNames).
 *
 * Stores:
 *  - profiles         otsheet:profiles:v2       ChildProfile[]
 *  - active profile   otsheet:activeProfile:v2  profile id (string)
 *  - per-child config otsheet:config:v2:<pid>:<templateId>  Partial<WorksheetConfig>
 *  - print history    otsheet:history:v1        HistoryEntry[] (cap 200)
 *
 * The v1 single-name profile (otsheet:profile:v1 = { childName }) is replaced
 * by a nicknamed profile and deleted.
 */

const PROFILES_KEY = 'otsheet:profiles:v2';
const ACTIVE_KEY = 'otsheet:activeProfile:v2';
const HISTORY_KEY = 'otsheet:history:v1';
const LEGACY_PROFILE_KEY = 'otsheet:profile:v1';
const HISTORY_CAP = 200;

/** Config bucket used when no child profile is selected. */
export const ANON_PROFILE_ID = 'anon';

const configKey = (profileId: string, templateId: string) => `otsheet:config:v2:${profileId}:${templateId}`;

/** Nicknames a profile can use. Fixed on purpose: a real name can't be typed in. */
export const NICKNAMES = [
  { label: 'Fox', icon: '🦊' },
  { label: 'Owl', icon: '🦉' },
  { label: 'Bee', icon: '🐝' },
  { label: 'Turtle', icon: '🐢' },
  { label: 'Panda', icon: '🐼' },
  { label: 'Frog', icon: '🐸' },
  { label: 'Otter', icon: '🦦' },
  { label: 'Koala', icon: '🐨' },
  { label: 'Lion', icon: '🦁' },
  { label: 'Whale', icon: '🐳' },
  { label: 'Bunny', icon: '🐰' },
  { label: 'Duck', icon: '🦆' },
] as const;
export type Nickname = (typeof NICKNAMES)[number]['label'];
const isNickname = (v: unknown): v is Nickname => NICKNAMES.some((n) => n.label === v);
export const nicknameIcon = (label: string) => NICKNAMES.find((n) => n.label === label)?.icon ?? '🙂';

/** First nickname not already used by a profile (falls back to the first). */
export function nextNickname(used: string[]): Nickname {
  return (NICKNAMES.find((n) => !used.includes(n.label)) ?? NICKNAMES[0]).label;
}

export interface ChildProfile {
  id: string;
  /** A nickname from NICKNAMES. Never a real name. */
  label: Nickname;
  ageBand: AgeBand;
  /** Preferred emoji themes — the first drives emoji-theme defaults. */
  interests: EmojiTheme[];
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  profileId: string;
  templateId: string;
  /** Config diff vs the template defaults (small); enough to reproduce. */
  diff: Partial<WorksheetConfig>;
  seed: number;
  printedAt: string;
}

// ---- low-level safe storage helpers ----
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* best-effort */
  }
}
function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* best-effort */
  }
}
function readJSON<T>(key: string): T | null {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- removing child names ----

/** A copy without the worksheet's child-name field. Used on every write and every share link. */
export function withoutChildName<T extends object>(config: T): T {
  if (!config || typeof config !== 'object' || !('childName' in config)) return config;
  const copy = { ...config } as Record<string, unknown>;
  delete copy.childName;
  return copy as T;
}

let purged = false;
/**
 * Remove child names that older versions saved: names in per-template
 * settings and in print history. Runs once per page load; cheap and safe.
 */
export function purgeStoredNames(): void {
  if (purged) return;
  purged = true;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('otsheet:config:')) continue;
      const parsed = readJSON<Record<string, unknown>>(key);
      if (parsed && typeof parsed === 'object' && 'childName' in parsed) writeRaw(key, JSON.stringify(withoutChildName(parsed)));
    }
    const history = readJSON<HistoryEntry[]>(HISTORY_KEY);
    if (Array.isArray(history) && history.some((h) => h?.diff && 'childName' in h.diff)) {
      writeRaw(HISTORY_KEY, JSON.stringify(history.map((h) => ({ ...h, diff: withoutChildName(h.diff ?? {}) }))));
    }
  } catch {
    /* storage unavailable: nothing to clean */
  }
}

// ---- profiles ----

/** Read profiles, converting any old name-bearing record to a nickname and rewriting storage without it. */
export function loadProfiles(): ChildProfile[] {
  purgeStoredNames();
  const raw = readJSON<unknown[]>(PROFILES_KEY);
  if (Array.isArray(raw)) {
    let rewrite = false;
    const used: string[] = [];
    const list: ChildProfile[] = [];
    for (const r of raw) {
      if (!r || typeof r !== 'object' || typeof (r as { id?: unknown }).id !== 'string') {
        rewrite = true;
        continue;
      }
      const rec = r as Record<string, unknown>;
      if ('name' in rec) rewrite = true;
      const label = isNickname(rec.label) && !used.includes(rec.label) ? rec.label : nextNickname(used);
      if (label !== rec.label) rewrite = true;
      used.push(label);
      list.push({
        id: rec.id as string,
        label,
        ageBand: (rec.ageBand as AgeBand) ?? '5-6',
        interests: Array.isArray(rec.interests) ? (rec.interests as EmojiTheme[]) : [],
        createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
      });
    }
    if (rewrite) saveProfiles(list);
    if (readRaw(LEGACY_PROFILE_KEY) !== null) removeRaw(LEGACY_PROFILE_KEY);
    return list;
  }

  // One-time migration from the v1 single-name profile: keep a profile, drop the name.
  const legacy = readJSON<{ childName?: string }>(LEGACY_PROFILE_KEY);
  if (legacy) {
    removeRaw(LEGACY_PROFILE_KEY);
    if (legacy.childName) {
      const migrated: ChildProfile = {
        id: uuid(),
        label: nextNickname([]),
        ageBand: '5-6',
        interests: [],
        createdAt: new Date().toISOString(),
      };
      saveProfiles([migrated]);
      setActiveProfileId(migrated.id);
      return [migrated];
    }
  }
  return [];
}

export function saveProfiles(list: ChildProfile[]): void {
  writeRaw(PROFILES_KEY, JSON.stringify(list));
}

export function getActiveProfileId(): string | null {
  return readRaw(ACTIVE_KEY);
}
export function setActiveProfileId(id: string | null): void {
  if (id) writeRaw(ACTIVE_KEY, id);
  else removeRaw(ACTIVE_KEY);
}

export function getActiveProfile(): ChildProfile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return loadProfiles().find((p) => p.id === id) ?? null;
}

export function addProfile(input: { label?: Nickname; ageBand: AgeBand; interests?: EmojiTheme[] }): ChildProfile {
  const existing = loadProfiles();
  const profile: ChildProfile = {
    id: uuid(),
    label: input.label ?? nextNickname(existing.map((p) => p.label)),
    ageBand: input.ageBand,
    interests: input.interests ?? [],
    createdAt: new Date().toISOString(),
  };
  saveProfiles([...existing, profile]);
  setActiveProfileId(profile.id);
  return profile;
}

export function updateProfile(id: string, patch: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>): void {
  const list = loadProfiles().map((p) => (p.id === id ? { ...p, ...patch } : p));
  saveProfiles(list);
}

export function deleteProfile(id: string): void {
  const list = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(list);
  if (getActiveProfileId() === id) setActiveProfileId(list[0]?.id ?? null);
}

// ---- per-child, per-template config ----
export function loadTemplateConfig(profileId: string, templateId: string): Partial<WorksheetConfig> | null {
  const parsed = readJSON<Partial<WorksheetConfig>>(configKey(profileId, templateId));
  return parsed && typeof parsed === 'object' ? withoutChildName(parsed) : null;
}
/** Saves this child's settings for a template. The child's name is never saved. */
export function saveTemplateConfig(profileId: string, templateId: string, config: WorksheetConfig): void {
  writeRaw(configKey(profileId, templateId), JSON.stringify(withoutChildName(config)));
}
export function clearTemplateConfig(profileId: string, templateId: string): void {
  removeRaw(configKey(profileId, templateId));
}

// ---- print history ----
export function loadHistory(): HistoryEntry[] {
  const list = readJSON<HistoryEntry[]>(HISTORY_KEY);
  return Array.isArray(list) ? list : [];
}
export function addHistory(entry: Omit<HistoryEntry, 'id'>): void {
  const list = loadHistory();
  const next: HistoryEntry[] = [{ id: uuid(), ...entry, diff: withoutChildName(entry.diff) }, ...list].slice(0, HISTORY_CAP);
  writeRaw(HISTORY_KEY, JSON.stringify(next));
}
/** How many times this profile printed this template at a given difficulty. */
export function countPrints(profileId: string, templateId: string, difficulty?: string): number {
  return loadHistory().filter(
    (h) =>
      h.profileId === profileId &&
      h.templateId === templateId &&
      (difficulty === undefined || h.diff.difficulty === difficulty || (!('difficulty' in h.diff) && difficulty === undefined))
  ).length;
}

// ---- config diff codec (shared by history + shareable URLs) ----

/** Keys of `config` whose value differs from `base`, compared structurally. */
export function diffConfig(config: WorksheetConfig, base: WorksheetConfig): Partial<WorksheetConfig> {
  const out: Partial<WorksheetConfig> = {};
  (Object.keys(config) as (keyof WorksheetConfig)[]).forEach((k) => {
    if (JSON.stringify(config[k]) !== JSON.stringify(base[k])) {
      (out as Record<string, unknown>)[k] = config[k];
    }
  });
  return out;
}

// UTF-8 safe base64url so unicode names/instructions survive the round trip.
function toBase64Url(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

/** Encodes settings for a share link. The child's name is left out, so a link never carries it. */
export function encodeConfig(diff: Partial<WorksheetConfig>, seed: number): string {
  return toBase64Url(JSON.stringify({ c: withoutChildName(diff), s: seed }));
}
export function decodeConfig(encoded: string): { diff: Partial<WorksheetConfig>; seed: number } | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || typeof parsed !== 'object' || typeof parsed.c !== 'object') return null;
    // Links made by older versions may still carry a name; ignore it.
    return { diff: withoutChildName(parsed.c as Partial<WorksheetConfig>), seed: typeof parsed.s === 'number' ? parsed.s : 0 };
  } catch {
    return null;
  }
}
