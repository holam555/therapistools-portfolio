import { isGrade, isSkill, type GradeId, type SkillId } from "./taxonomy";

/** A reel is known by Instagram's own short code; the video itself is never stored. */
export type Kind = "reel" | "p";
export type Status = "pending" | "published" | "rejected" | "unpublished";

export interface Reel {
  code: string;
  kind: Kind;
  title: string;
  howTo: string;
  creator: string;
  skills: SkillId[];
  grades: GradeId[];
  status: Status;
  source: "owner" | "submission";
  submitterName: string;
  submitterNote: string;
  createdAt: string;
}

const CODE = /^[A-Za-z0-9_-]{5,20}$/;

/**
 * Reads an Instagram reel or post link and keeps only the kind and short code.
 * Everything after the code (the share tracking in "?igsh=...") is dropped.
 */
export function parseInstagramUrl(input: string): { kind: Kind; code: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!/^(www\.|m\.)?instagram\.com$/i.test(url.hostname)) return null;
  // Also accepts /<username>/reel/<code>/ and /reels/<code>/.
  const m = url.pathname.match(/(?:^|\/)(reels?|p|tv)\/([^/]+)\/?/);
  if (!m || !CODE.test(m[2])) return null;
  return { kind: m[1] === "p" ? "p" : "reel", code: m[2] };
}

export const permalink = (r: Pick<Reel, "kind" | "code">) => `https://www.instagram.com/${r.kind}/${r.code}/`;
/** Instagram's own embed page for one post, shown in a frame. */
export const embedUrl = (r: Pick<Reel, "kind" | "code">) => `${permalink(r)}embed/`;

export function blankReel(kind: Kind, code: string): Reel {
  return { code, kind, title: "", howTo: "", creator: "", skills: [], grades: [], status: "published", source: "owner", submitterName: "", submitterNote: "", createdAt: "" };
}

export interface Filter {
  skill?: SkillId;
  grade?: GradeId;
  saved?: boolean;
}

/** Reels with no grade tag fit every grade; reels with no skill tag show only under "All". */
export function applyFilter(reels: Reel[], f: Filter, saved: ReadonlySet<string>): Reel[] {
  return reels.filter(
    (r) => (!f.skill || r.skills.includes(f.skill)) && (!f.grade || r.grades.length === 0 || r.grades.includes(f.grade)) && (!f.saved || saved.has(r.code)),
  );
}

/** The feed's address: filters and the reel to start on live in the URL hash, so a view can be shared. */
export interface Route {
  view: "home" | "feed";
  filter: Filter;
  start?: string;
  review?: boolean;
}

export function parseRoute(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const q = new URLSearchParams(query);
  const skill = q.get("skill") ?? "";
  const grade = q.get("grade") ?? "";
  const start = q.get("start") ?? "";
  return {
    view: path === "feed" ? "feed" : "home",
    filter: { skill: isSkill(skill) ? skill : undefined, grade: isGrade(grade) ? grade : undefined, saved: q.get("saved") === "1" || undefined },
    start: CODE.test(start) ? start : undefined,
    review: q.get("review") === "1" || undefined,
  };
}

export function routeHash(r: Route): string {
  const q = new URLSearchParams();
  if (r.filter.skill) q.set("skill", r.filter.skill);
  if (r.filter.grade) q.set("grade", r.filter.grade);
  if (r.filter.saved) q.set("saved", "1");
  if (r.review) q.set("review", "1");
  if (r.start) q.set("start", r.start);
  const s = q.toString();
  return `#/${r.view === "feed" ? "feed" : ""}${s ? `?${s}` : ""}`;
}

/**
 * Reads a pasted block holding many reels: each Instagram link starts a new
 * reel, and whatever text follows it (a caption, a note) up to the next link
 * belongs to that reel. Links alone work too. Repeats are dropped.
 */
export function parseBulk(text: string): { kind: Kind; code: string; text: string }[] {
  const link = /https?:\/\/(?:www\.|m\.)?instagram\.com\/[^\s<>"']+/gi;
  const hits = [...text.matchAll(link)];
  const out: { kind: Kind; code: string; text: string }[] = [];
  hits.forEach((m, i) => {
    const parsed = parseInstagramUrl(m[0]);
    if (!parsed || out.some((o) => o.code === parsed.code)) return;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    out.push({ ...parsed, text: text.slice(m.index + m[0].length, end).trim() });
  });
  return out;
}
