import type { DisciplineId } from "../../model/disciplines";
import type { TemplatePack } from "../pack";
import { otherPack } from "./other";
import { psychPack } from "./psych";
import { ptPack } from "./pt";
import { slpPack } from "./slp";
import { spedPack } from "./sped";

/**
 * Ready-made template packs, one per discipline other than OT (whose template
 * is code). Each call builds a fresh pack, so an edit to one writer's copy
 * never reaches the built-in wording.
 */

export const PREMADE_DISCIPLINES: DisciplineId[] = ["slp", "pt", "psych", "sped", "other"];

const BUILDERS: Partial<Record<DisciplineId, () => TemplatePack>> = {
  slp: slpPack,
  pt: ptPack,
  psych: psychPack,
  sped: spedPack,
  other: otherPack,
};

/** A new copy of the discipline's ready-made pack, or null when it has none (OT). */
export function premadePack(d: DisciplineId): TemplatePack | null {
  const build = BUILDERS[d];
  return build ? build() : null;
}

function collectStrings(data: unknown, out: string[]): void {
  if (typeof data === "string") out.push(data);
  else if (Array.isArray(data)) for (const v of data) collectStrings(v, out);
  else if (data && typeof data === "object") for (const v of Object.values(data as Record<string, unknown>)) collectStrings(v, out);
}

/** Every piece of text in every ready-made pack: titles, labels, wording, examples, list options, grid labels and sentences. For the privacy allow-list. */
export function premadeStrings(): string[] {
  const out: string[] = [];
  for (const d of PREMADE_DISCIPLINES) collectStrings(premadePack(d), out);
  return out;
}
