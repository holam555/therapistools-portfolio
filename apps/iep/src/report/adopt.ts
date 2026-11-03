import { loadPack, packFromOt, savePack } from "./pack";
import { hasOverrides, loadOverrides } from "./overrides";

/**
 * One-time move, 2026-11-03: the built-in OT template is being replaced by a
 * pack a writer owns, like every other discipline. A browser that has its
 * own OT edits (every browser that used the tool before the rewrite has the
 * whole template as edits) turns them into its own pack, once. Filled
 * blanks, ticks and ratings carry over because the ids are kept.
 */
const FLAG = "easyiep.pack.ot.adopted";

export function adoptOtPackOnce(storage: Storage = localStorage): boolean {
  try {
    if (storage.getItem(FLAG)) return false;
    const o = loadOverrides("ot");
    const adopt = hasOverrides(o) && !loadPack("ot");
    if (adopt) savePack("ot", packFromOt("Occupational Therapy", o));
    storage.setItem(FLAG, "1");
    return adopt;
  } catch {
    return false;
  }
}
