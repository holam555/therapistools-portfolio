# Activity Ideas (`/ideas/`)

A library of short Instagram videos that show school OT activities, sorted by
skill area and grade. A visitor picks a skill, swipes through the videos one
per screen, saves the ones they like and can suggest a reel of their own.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Tag lists | `src/taxonomy.ts` | The skill areas and grade bands, and the keyword rules that pre-tick tags from pasted text (no AI) |
| Reel model | `src/reels.ts` | Reads an Instagram link down to its kind and short code, builds the embed address, filters, and the URL-hash route |
| Starter reels | `src/seed.ts` | The owner's first picks as plain links. Shown when the reel list cannot be reached |
| Saved ideas | `src/saved.ts` | Short codes in this browser's storage (`ttideas:saved:v1`). Never sent anywhere |
| Network | `src/api.ts` | The reel list, a suggestion, the owner's edits |
| Embed check | `src/embedCheck.ts` | Asks Meta's official embed service whether Instagram allows a post on other sites. Runs when a reel is suggested or published, and from the owner's "Check all reels". Only the yes or no is read; nothing is kept |
| Database | `supabase/migrations/` | Table `ideas_reels` in the site's Supabase project (the address is in `apps/iep/.env`). Row Level Security: anyone reads published rows and may add a pending suggestion; only owners change anything |
| Screens | `src/Home.tsx`, `src/Feed.tsx`, `src/Dialogs.tsx` | Front page, swipe feed, and the suggest, sign-in and edit sheets |

## Instagram rules (do not weaken)

- Videos are shown only through Instagram's own embed page, in a frame
  (`https://www.instagram.com/<reel|p>/<code>/embed/`). No Instagram script
  runs in our page; the page's CSP (`vite.config.ts`) allows Instagram as a
  frame source and nothing else.
- Nothing is fetched from Instagram by our code: no scraping, no thumbnails,
  no captions. Only the post's short code and what a person typed are stored.
  Instagram's official embed service returns neither a thumbnail nor the
  caption (checked 2026-11-13), which is why the feed shows the embed itself
  and why tags come from text the owner pastes, not from Instagram.
- Nothing loads from Instagram on the front page, only in the feed.
- Nothing is published without the owner: suggestions are stored as pending.
- The feed holds exactly one Instagram frame: the reel on screen, loaded
  after it has stayed there a moment. Leaving a reel removes its frame; that
  is the only way to stop its video, since the page cannot reach inside the
  frame. Every slide carries a "Watch it on Instagram" link for when a frame
  comes up blank (seen in the Claude app's built-in browser, not in Chrome).
- A blocked post (deleted, private, embedding off) is found by asking Meta's
  embed service (`src/embedCheck.ts`); the embed frame itself answers the
  same for every post and the page cannot see inside it. The service is used
  without an access token, which worked on 2026-11-13 though Meta's docs ask
  for one: any unclear answer counts as "unknown", never as broken, so the
  app keeps working if Meta closes that door. A reel that only plays on
  Instagram itself ("Watch on Instagram") cannot be told apart.

Any change to what leaves the device must also update
`apps/home/privacy/index.html` (section "Activity Ideas").

## Setting it up (owner, once)

1. In the Supabase dashboard, open the SQL editor, paste
   `supabase/migrations/20261113000000_ideas.sql` and run it.
2. Make yourself the owner: run the three lines at the bottom of that file
   with your own sign-in email. Do not save the email in the file.
3. Open `/ideas/`, tap "Owner sign-in" at the bottom, and sign in with the
   emailed code (the same account as the IEP Writer).
4. Tap "Add the starter reels". Then open the feed and tap Edit on each reel
   to give it a title and tags.

Until step 1 is done the page shows the starter reels, and suggesting and
owner sign-in stay hidden.

## Owner guide

- **Add a reel from your phone:** in Instagram tap Share, then Copy link.
  Open `/ideas/`, tap "Add a reel", paste the link, give it a title, tick the
  tags, Publish. Pasting the caption into the caption box ticks likely tags
  and fills the creator's handle; the caption itself is not saved.
- **Review suggestions:** "Review suggestions" opens them as a feed. Watch,
  tap Edit, fix the title and tags, then Publish or Reject.
- **Find reels that stopped working:** "Check all reels" asks Instagram
  about each one and lists those it refuses, with a Hide button.
- **Removal request:** open the reel in the feed, tap Edit, then "Hide from
  library" or Delete.

## Not built yet

Comments, per-skill pages for search engines, backup of saved ideas, a
per-visitor limit on suggestions (the database caps the waiting list at 200),
and automatic deletion of rejected suggestions after 90 days (the privacy
page promises it; until it is automated the owner deletes them by hand).
