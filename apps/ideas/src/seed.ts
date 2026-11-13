import { blankReel, parseInstagramUrl, type Reel } from "./reels";

/**
 * The starter reels the owner picked (2026-11-13), as plain links. They show
 * when the reel list cannot be reached, and the owner's "Add the starter
 * reels" button copies them into the database once. Tags are added by the
 * owner in the app, so none are guessed here.
 */
const LINKS = [
  "https://www.instagram.com/reel/DdY-K3ZhZA4/",
  "https://www.instagram.com/reel/Dd7qvStN1-6/",
  "https://www.instagram.com/reel/Dfp98h0BNMM/",
  "https://www.instagram.com/reel/De0L-C7xgGt/",
  "https://www.instagram.com/reel/DeLa3QAtaRW/",
  "https://www.instagram.com/p/Dfk1KuooD-c/",
  "https://www.instagram.com/reel/DfK-d87toVW/",
  "https://www.instagram.com/reel/DfnsCLOShMz/",
  "https://www.instagram.com/reel/DfUwjeDNeom/",
  "https://www.instagram.com/reel/DfF1ZLUh28l/",
  "https://www.instagram.com/reel/DfhLKTphFwO/",
  "https://www.instagram.com/reel/DcjuWE0oqOG/",
  "https://www.instagram.com/reel/Dfp468SIzUy/",
  "https://www.instagram.com/reel/DbY1Wk5hrMF/",
  "https://www.instagram.com/reel/Dcqkd_xpkZo/",
  "https://www.instagram.com/reel/DeSbwlTS3SR/",
  "https://www.instagram.com/reel/DfNl5NwIpwL/",
  "https://www.instagram.com/reel/DdQ0jt9gmhg/",
  "https://www.instagram.com/reel/Dfp6wETyQHI/",
  "https://www.instagram.com/reel/DdPM2y4xwjO/",
  "https://www.instagram.com/reel/Dd_lZ37uU37/",
  "https://www.instagram.com/reel/DfNL8WZpy9H/",
  "https://www.instagram.com/reel/Dd456uxMJ6k/",
  "https://www.instagram.com/p/DXSLOtBAG0l/",
];

export const SEED_REELS: Reel[] = LINKS.map((link) => {
  const p = parseInstagramUrl(link);
  if (!p) throw new Error(`bad starter link: ${link}`);
  return blankReel(p.kind, p.code);
});
