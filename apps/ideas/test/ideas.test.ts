import { describe, expect, it } from "vitest";
import { applyFilter, blankReel, embedUrl, parseInstagramUrl, parseRoute, routeHash } from "../src/reels";
import { readSaved, toggleSaved } from "../src/saved";
import { SEED_REELS } from "../src/seed";
import { suggestTags } from "../src/taxonomy";
import { cspFor } from "../vite.config";
import { OEMBED_ORIGIN, readEmbedAnswer } from "../src/embedCheck";

describe("Instagram links", () => {
  it("keeps the kind and short code and drops share tracking", () => {
    expect(parseInstagramUrl("https://www.instagram.com/reel/AbC_d-123/?igsh=xyz")).toEqual({ kind: "reel", code: "AbC_d-123" });
    expect(parseInstagramUrl("https://instagram.com/p/AbCdE12345")).toEqual({ kind: "p", code: "AbCdE12345" });
    expect(parseInstagramUrl("https://www.instagram.com/some.user/reel/AbCdE12345/")).toEqual({ kind: "reel", code: "AbCdE12345" });
  });
  it("refuses anything that is not an Instagram reel or post", () => {
    for (const bad of ["", "not a link", "javascript:alert(1)", "https://evil.example/reel/AbCdE12345/", "https://www.instagram.com.evil.example/reel/AbCdE12345/", "https://www.instagram.com/someuser/", "https://www.instagram.com/reel/<script>/"]) {
      expect(parseInstagramUrl(bad)).toBeNull();
    }
  });
  it("builds the embed address on instagram.com only", () => {
    expect(embedUrl({ kind: "reel", code: "AbCdE12345" })).toBe("https://www.instagram.com/reel/AbCdE12345/embed/");
  });
  it("starter reels are unique", () => {
    expect(new Set(SEED_REELS.map((r) => r.code)).size).toBe(SEED_REELS.length);
  });
});

describe("filters and routes", () => {
  const a = { ...blankReel("reel", "aaaaa1"), skills: ["sensory" as const], grades: ["prek-1" as const] };
  const b = { ...blankReel("reel", "bbbbb2"), skills: ["handwriting" as const] };
  it("filters by skill, grade and saved; untagged grade fits every grade", () => {
    expect(applyFilter([a, b], { skill: "sensory" }, new Set()).map((r) => r.code)).toEqual(["aaaaa1"]);
    expect(applyFilter([a, b], { grade: "2-5" }, new Set()).map((r) => r.code)).toEqual(["bbbbb2"]);
    expect(applyFilter([a, b], { saved: true }, new Set(["bbbbb2"])).map((r) => r.code)).toEqual(["bbbbb2"]);
  });
  it("round-trips a route through the URL hash and ignores junk", () => {
    const r = { view: "feed" as const, filter: { skill: "sensory" as const, grade: "2-5" as const, saved: undefined }, start: "aaaaa1", review: undefined };
    expect(parseRoute(routeHash(r))).toEqual(r);
    expect(parseRoute("#/feed?skill=<b>&grade=9&start=!!")).toEqual({ view: "feed", filter: { skill: undefined, grade: undefined, saved: undefined }, start: undefined, review: undefined });
  });
});

describe("saved ideas", () => {
  it("toggles, newest first, and survives broken storage", () => {
    expect(toggleSaved(["aaaaa1"], "bbbbb2")).toEqual(["bbbbb2", "aaaaa1"]);
    expect(toggleSaved(["bbbbb2", "aaaaa1"], "bbbbb2")).toEqual(["aaaaa1"]);
    expect(readSaved({ getItem: () => "{not json" })).toEqual([]);
    expect(readSaved({ getItem: () => '["aaaaa1", 5, "<x>"]' })).toEqual(["aaaaa1"]);
  });
});

describe("tag suggestions from pasted text", () => {
  it("reads plain words and hashtags", () => {
    const s = suggestTags("Heavy work brain break for kindergarten! #sensoryregulation #finemotor #prewritingskills");
    expect(s.skills).toEqual(expect.arrayContaining(["sensory", "pre-writing"]));
    expect(s.grades).toEqual(["prek-1"]);
  });
  it("suggests nothing for unrelated text", () => {
    expect(suggestTags("Happy Friday everyone")).toEqual({ skills: [], grades: [] });
  });
});

describe("embed check", () => {
  it("reads Meta's answer, and never calls an unclear answer broken", () => {
    expect(readEmbedAnswer(200, { html: "<blockquote></blockquote>" })).toBe("ok");
    expect(readEmbedAnswer(400, { error: { code: 24, error_subcode: 2207045 } })).toBe("blocked");
    expect(readEmbedAnswer(400, { error: { code: 200, error_subcode: 2207046 } })).toBe("blocked");
    expect(readEmbedAnswer(400, { error: { code: 190, message: "An access token is required" } })).toBe("unknown");
    expect(readEmbedAnswer(429, null)).toBe("unknown");
    expect(readEmbedAnswer(200, null)).toBe("unknown");
    expect(cspFor("https://example.supabase.co")).toContain(OEMBED_ORIGIN);
  });
});

describe("page security policy", () => {
  it("lets the page reach its own database and frame Instagram, and nothing else", () => {
    const csp = cspFor("https://example.supabase.co");
    expect(csp).toContain("connect-src https://example.supabase.co https://graph.facebook.com;");
    expect(csp).toContain("frame-src https://www.instagram.com;");
    expect(csp).toContain("script-src 'self';");
    expect(cspFor("")).toContain("connect-src 'none'");
  });
});
