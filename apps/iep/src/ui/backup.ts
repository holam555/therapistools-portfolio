import type { DisciplineId } from "../model/disciplines";
import { makeBackup, serializeBackup } from "../model/storage";
import type { Library, Recipe } from "../model/types";
import { loadPack } from "../report/pack";
import { downloadText, todayStamp } from "./common";

/** Save this discipline's backup file (template, plus the older library and recipes). True when a template was in it. */
export function exportBackup(discipline: DisciplineId, lib: Library, recipes: Recipe[]): boolean {
  const pack = loadPack(discipline);
  downloadText(`therapistools-iep-${discipline}-backup-${todayStamp()}.json`, serializeBackup(makeBackup(lib, recipes, discipline, pack ?? undefined)));
  return !!pack;
}
