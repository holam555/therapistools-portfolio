import { permalink, type Reel } from "./reels";

/**
 * Can Instagram show this post on another site? Asks Meta's official embed
 * service (oEmbed), which answers for one public link at a time and returns
 * nothing we keep. Only the answer's status is read.
 *
 *   ok       the post can be embedded
 *   blocked  Instagram refuses: deleted, private, age-restricted, or the
 *            creator turned embedding off
 *   unknown  no clear answer (offline, the service changed, a network filter).
 *            Never treated as broken.
 *
 * It cannot tell a reel that only plays on Instagram ("Watch on Instagram")
 * from one that plays in place; Instagram reports both as fine.
 */
export type EmbedAnswer = "ok" | "blocked" | "unknown";

export const OEMBED_ORIGIN = "https://graph.facebook.com";
/** Meta's codes for "does not exist or cannot be embedded" and "private media". */
const REFUSED = new Set([2207045, 2207046]);

export function readEmbedAnswer(status: number, body: unknown): EmbedAnswer {
  if (status === 200 && typeof body === "object" && body !== null && "html" in body) return "ok";
  const sub = (body as { error?: { error_subcode?: unknown } } | null)?.error?.error_subcode;
  return status === 400 && typeof sub === "number" && REFUSED.has(sub) ? "blocked" : "unknown";
}

export async function checkEmbed(reel: Pick<Reel, "kind" | "code">): Promise<EmbedAnswer> {
  try {
    const res = await fetch(`${OEMBED_ORIGIN}/instagram_oembed?omitscript=true&url=${encodeURIComponent(permalink(reel))}`, { credentials: "omit", referrerPolicy: "no-referrer" });
    return readEmbedAnswer(res.status, await res.json().catch(() => null));
  } catch {
    return "unknown";
  }
}

export const BLOCKED_MESSAGE = "Instagram doesn't let this one be shown on other sites (it may be private, removed, or have embedding turned off), so it can't join the library.";
