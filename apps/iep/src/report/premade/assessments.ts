import type { DisciplineId } from "../../model/disciplines";
import type { GridDef } from "../grids";
import type { PackAssessment } from "../pack";
import { premadePack } from "./index";

/**
 * Ready-made assessments a writer can add to the template they already have
 * (Edit template → Add an assessment). Each call builds a fresh copy. Generic
 * wording and fictional examples, like the sample packs.
 */

/**
 * A school activities-of-daily-living checklist: self-care tasks and the
 * handling of personal belongings, each rated on a five-level assistance
 * scale and written up one paragraph per group. Not part of the OT sample
 * (the owner took it out of that template on 2026-10-27); offered here so a
 * writer whose district uses one can add it.
 */
export function adlChecklist(): PackAssessment {
  const grid: GridDef = {
    id: "adl",
    title: "Rate each task",
    layout: "byGroup",
    blank: "[[levels for this group]]",
    levels: [
      { value: "5", label: "5 Independent", sentence: "{Items} {was} independent (Level 5)." },
      { value: "4", label: "4 Minimal assistance", sentence: "Minimal assistance (Level 4) was needed for {items}." },
      { value: "3", label: "3 Moderate assistance", sentence: "Moderate assistance (Level 3) was needed for {items}." },
      { value: "2", label: "2 Maximum assistance", sentence: "Maximum assistance (Level 2) was needed for {items}." },
      { value: "1", label: "1 Total assistance", sentence: "{Items} required total assistance (Level 1)." },
      { value: "na", label: "Not rated", sentence: "{Items} {was} not rated." },
    ],
    groups: [
      {
        id: "school",
        label: "School tasks",
        rows: [
          { id: "scissors", label: "using scissors" },
          { id: "glue", label: "using glue" },
          { id: "backpack-zip", label: "zipping and unzipping a backpack" },
          { id: "backpack-cubby", label: "putting a backpack in a cubby" },
          { id: "backpack-pack", label: "packing and unpacking a backpack" },
          { id: "mouse", label: "using a mouse" },
          { id: "keyboard", label: "using a keyboard" },
        ],
      },
      {
        id: "lunch",
        label: "Lunchroom tasks",
        rows: [
          { id: "tray", label: "carrying a tray" },
          { id: "utensils", label: "using utensils", plural: true },
          { id: "cup", label: "drinking from an open cup" },
          { id: "fountain", label: "using the drinking fountain" },
          { id: "packages", label: "opening packages" },
          { id: "napkin", label: "using a napkin" },
          { id: "cleanup", label: "cleaning up the eating area" },
        ],
      },
      {
        id: "mobility",
        label: "Mobility and posture",
        rows: [
          { id: "floor", label: "getting down to and up from the floor" },
          { id: "classroom", label: "moving around the classroom" },
          { id: "hallways", label: "moving through hallways" },
          { id: "stairs", label: "stairs", plural: true },
          { id: "doors", label: "opening doors" },
          { id: "playground", label: "getting onto the playground" },
          { id: "pe", label: "taking part in physical education" },
        ],
      },
      {
        id: "dressing",
        label: "Dressing",
        rows: [
          { id: "coat-on", label: "putting on and taking off a coat" },
          { id: "coat-hang", label: "hanging a coat in a cubby" },
          { id: "zip-start", label: "starting a zipper" },
          { id: "zip-up", label: "zipping up a coat" },
          { id: "unzip", label: "unzipping a coat" },
          { id: "buttons", label: "buttons", plural: true },
          { id: "snaps", label: "snaps", plural: true },
          { id: "shoes", label: "tying shoes" },
        ],
      },
      {
        id: "toileting",
        label: "Toileting and hygiene",
        rows: [
          { id: "pants", label: "pulling pants up and down" },
          { id: "pant-fasteners", label: "pant fasteners", plural: true },
          { id: "hygiene", label: "toilet hygiene" },
          { id: "soap", label: "using the soap dispenser" },
          { id: "wash", label: "washing hands" },
          { id: "towel", label: "using the paper towel dispenser" },
        ],
      },
    ],
  };
  return {
    id: "adl",
    label: "Activities of daily living checklist",
    grid,
    sections: [
      {
        id: "adl",
        title: "Activities of Daily Living Checklist",
        blocks: [
          {
            kind: "para",
            id: "intro",
            text: "The [[checklist name]] compares {{student}}'s basic self-care skills and handling of personal belongings with what classmates of the same age and grade usually manage at school. It was completed by [[who completed it::completedBy]]. Each task is rated from 1 to 5: total assistance (1), maximum assistance (2), moderate assistance (3), minimal assistance (4), or independent with no more than a verbal cue (5).",
          },
          { kind: "grid", id: "grid-adl", grid: "adl" },
          { kind: "para", id: "comments", text: "Across the checklist, {{they}} [[the pattern: where support is needed most, and what is managed alone]]." },
        ],
        examples: [
          "The daily living checklist compares [STUDENT]'s basic self-care skills and handling of personal belongings with what classmates of the same age and grade usually manage at school. It was completed by the classroom aide. School tasks: Zipping and unzipping a backpack, putting a backpack in a cubby, and packing and unpacking a backpack were independent (Level 5). Moderate assistance (Level 3) was needed for using glue. Using scissors required total assistance (Level 1). Using a mouse and using a keyboard were not rated. Dressing: Unzipping a coat was independent (Level 5). Minimal assistance (Level 4) was needed for putting on and taking off a coat and hanging a coat in a cubby. Moderate assistance (Level 3) was needed for starting a zipper and zipping up a coat. Tying shoes required total assistance (Level 1). Across the checklist, he manages his belongings and moves around the school on his own, and needs the most help with fasteners, shoes and toileting routines.",
        ],
        notesHint: "Who completed the checklist, the level for each task, and the overall pattern.",
      },
    ],
  };
}

export interface ReadyMadeAssessment {
  label: string;
  hint: string;
  build: () => PackAssessment;
}

/** What "Add an assessment" offers besides a blank one: the daily living checklist, then every assessment of the discipline's sample pack. */
export function readyMadeAssessments(d: DisciplineId): ReadyMadeAssessment[] {
  const out: ReadyMadeAssessment[] = [
    { label: "Activities of daily living checklist", hint: "Self-care and personal belongings at school, each task rated 1 to 5 and written up by group.", build: adlChecklist },
  ];
  const sample = premadePack(d);
  for (const a of sample.assessments)
    out.push({
      label: a.label,
      hint: `From the sample template: ${a.sections.map((s) => s.title).join(", ")}.`,
      build: () => premadePack(d).assessments.find((x) => x.id === a.id)!,
    });
  return out;
}
