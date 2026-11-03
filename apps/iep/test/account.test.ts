import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { libraryFor } from "../src/model/defaults";
import { canon, checkTemplate, decide, rowFor, templateStrings } from "../src/account/sync";
import { blankPack } from "../src/report/pack";
import { accountOrigin, cspFor, SUPABASE_ORIGIN } from "../vite.config";

// An account holds the writer's template and nothing else. These tests pin
// what moves, which way it moves, and what the privacy gate refuses.

describe("account sync: comparing copies", () => {
  it("reads the same template the same whatever the key order", () => {
    const a = { version: 1, sections: [{ id: "s", blocks: [{ text: "x", label: "y" }] }], titles: {} };
    const b = { titles: {}, sections: [{ blocks: [{ label: "y", text: "x" }], id: "s" }], version: 1 };
    expect(canon(a)).toBe(canon(b));
    expect(canon(null)).toBe("");
  });

  it("moves the side that changed, and asks when both did", () => {
    expect(decide("same", "same", null)).toBe("none");
    expect(decide("same", "same", "old")).toBe("none");
    // first meeting
    expect(decide("", "remote", null)).toBe("download");
    expect(decide("local", "", null)).toBe("upload");
    expect(decide("local", "remote", null)).toBe("conflict");
    // after a sync
    expect(decide("agreed", "newer", "agreed")).toBe("download");
    expect(decide("newer", "agreed", "agreed")).toBe("upload");
    expect(decide("mine", "theirs", "agreed")).toBe("conflict");
    // a reset here (template gone) travels too
    expect(decide("", "agreed", "agreed")).toBe("upload");
    expect(decide("agreed", "", "agreed")).toBe("download");
  });
});

describe("account sync: what is sent", () => {
  it("sends only the template columns", () => {
    const row = rowFor("user-1", "ot", "pack", { version: 1 });
    expect(Object.keys(row).sort()).toEqual(["data", "discipline", "kind", "user_id"]);
  });

  it("the sync module never touches drafts, values, ratings, recipes or the library", () => {
    const src = readFileSync(join(__dirname, "..", "src", "account", "sync.ts"), "utf8");
    for (const banned of ["loadDraft", "loadValues", "loadSetup", "loadRecipes", "loadLibrary", "reportValues", "easyiep.draft", "easyiep.report"])
      expect(src, banned).not.toContain(banned);
  });
});

describe("account sync: privacy gate", () => {
  const lib = libraryFor("ot");
  const withText = (text: string) => ({ ...blankPack("X"), sections: [{ id: "summary", title: "Summary", blocks: [{ kind: "para", id: "b1", text }], examples: [] }] });

  it("collects every string in a template", () => {
    expect(templateStrings({ a: "one", b: ["two", { c: "three" }], d: 4 })).toEqual(["one", "two", "three"]);
  });

  it("lets ordinary template wording through", () => {
    const check = checkTemplate(withText("{{student}} completed the Beery VMI with [[score::scores]] and [[a sample sentence]]."), lib);
    expect(check.blocking).toEqual([]);
  });

  it("holds back a full date, a phone number, an email and a never-allow word", () => {
    expect(checkTemplate(withText("Seen on 3/14/2019 in class."), lib).blocking.map((w) => w.kind)).toEqual(["date"]);
    expect(checkTemplate(withText("Call 555-123-4567."), lib).blocking.map((w) => w.kind)).toEqual(["phone"]);
    expect(checkTemplate(withText("Write to someone@example.org."), lib).blocking.map((w) => w.kind)).toEqual(["email"]);
    const never = { ...lib, neverAllow: ["Maple Grove Elementary"] };
    expect(checkTemplate(withText("Attends Maple Grove Elementary."), never).blocking.map((w) => w.kind)).toEqual(["never-allow"]);
  });

  it("only lists unknown capitalised words; it does not block on them", () => {
    const check = checkTemplate(withText("Uses the Zorbly pencil grip."), lib);
    expect(check.blocking).toEqual([]);
    expect(check.names.map((w) => w.text)).toEqual(["Zorbly"]);
  });
});

describe("build: content security policy", () => {
  it("is closed with no account server and open to exactly one Supabase origin with one", () => {
    expect(cspFor("")).toContain("connect-src 'none'");
    expect(cspFor("https://abc.supabase.co")).toContain("connect-src https://abc.supabase.co;");
    expect(accountOrigin({}, false)).toBe("");
    expect(accountOrigin({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" }, false)).toBe("https://abc.supabase.co");
    expect(accountOrigin({ VITE_SUPABASE_URL: "https://abc.supabase.co/", VITE_SUPABASE_PUBLISHABLE_KEY: "k" }, true)).toBe("");
    expect(() => accountOrigin({ VITE_SUPABASE_URL: "https://abc.supabase.co" }, false)).toThrow(/both/);
    expect(() => accountOrigin({ VITE_SUPABASE_URL: "https://evil.example.com", VITE_SUPABASE_PUBLISHABLE_KEY: "k" }, false)).toThrow(/supabase\.co/);
    expect(SUPABASE_ORIGIN.test("https://abc.supabase.co.evil.com")).toBe(false);
  });
});

describe("database migration", () => {
  const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "20261102000000_templates.sql"), "utf8").toLowerCase();

  it("locks the templates table to each writer's own rows", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("force row level security");
    expect(sql).toContain("revoke all on table public.templates from public, anon");
    expect(sql).not.toMatch(/grant[^;]*\bto\s+anon\b/);
    for (const op of ["select", "insert", "update", "delete"]) expect(sql).toMatch(new RegExp(`for ${op} to authenticated`));
    expect(sql.match(/\(select auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("stores only the template columns", () => {
    const cols = sql.slice(sql.indexOf("create table"), sql.indexOf("primary key")).match(/^\s+(\w+)\s+(uuid|text|jsonb|timestamptz)/gm)?.map((l) => l.trim().split(/\s+/)[0]);
    expect(cols).toEqual(["user_id", "discipline", "kind", "data", "updated_at"]);
  });
});
