import type { PronounSet } from "../model/types";

/**
 * Report builder types. A template pack describes one discipline's reports;
 * a setup is what the writer chose for this report. Neither ever holds a
 * student's name or any identifying detail.
 *
 * Text in a pack uses three kinds of marks:
 *   {{student}}            the student, written as [STUDENT] (first mention in a section only)
 *   {{They}} {{their}} …   pronouns, filled from the chosen he/she
 *   [[label]]              a blank for the writer to fill, highlighted in Word
 *   [[label::list]]        a blank with ready-made choices (see options.ts)
 */

export type ReportType = "evaluation" | "annual";
export type GradeGroup = "k1" | "g25" | "g68" | "g912";

export const GRADE_GROUPS: { id: GradeGroup; label: string }[] = [
  { id: "k1", label: "K–1" },
  { id: "g25", label: "2–5" },
  { id: "g68", label: "6–8" },
  { id: "g912", label: "9–12" },
];

export type AssessmentId = "teacher" | "screen" | "beery" | "spm2";
export type GoalArea = "writing" | "cutting" | "selfcare";
export type TeacherArea = "fine" | "gross" | "sensory";
export type TeacherAreas = Record<TeacherArea, boolean>;
export const TEACHER_AREAS: { id: TeacherArea; label: string }[] = [
  { id: "fine", label: "Fine motor" },
  { id: "gross", label: "Gross motor" },
  { id: "sensory", label: "Sensory" },
];
export type ServiceType = "direct" | "indirect";

export interface ReportSetup {
  reportType: ReportType;
  /** Evaluation: concerns were found. Annual review: the student qualifies for services. */
  concerns: boolean;
  grade: GradeGroup;
  pronoun: PronounSet;
  /** Which assessments were done, by id (OT's are AssessmentId; a pack's are its own). Missing means done. */
  assessments: Record<string, boolean>;
  /** Which areas the teacher rating checklist reported concerns in; none ticked means no concerns. */
  teacherAreas: TeacherAreas;
  /** How services are delivered when the student qualifies. */
  serviceType: ServiceType;
  /** Fine motor screen items done, by item id. Items for other grades are ignored. */
  screenItems: string[];
  /** Annual review with services: number of objectives under the motor goal. */
  objectives: number;
  /** Related standards to list under the goal. */
  goalAreas: GoalArea[];
  /** Rating grid ratings, by grid id ("spm2" or a pack's own), each keyed "group.row" (see grids.ts). */
  ratings: Record<string, Record<string, string>>;
}

/** Values the writer filled into blanks, keyed "section/block/n". Never holds a student's name by design; the UI warns if text looks like one. */
export type ReportValues = Record<string, string>;

/** One piece of a section. Text may contain the marks described above. */
/** `id` keeps filled values attached when other blocks come and go; `examples` feed that block's sample sentences. */
interface BlockBase {
  text: string;
  id?: string;
  examples?: string[];
  /** Written from setup choices (SPM-2 results, objective count), so not editable as wording. */
  generated?: boolean;
  /** For generated lines written from a rating grid: the grid's id, so edit mode can open its editor. */
  grid?: string;
}
export type Block =
  | ({ kind: "heading" } & BlockBase)
  | ({ kind: "subheading" } & BlockBase)
  | ({ kind: "para"; label?: string } & BlockBase)
  | ({ kind: "bullet"; label?: string } & BlockBase)
  | ({ kind: "numbered" } & BlockBase);

export interface ReportSection {
  id: string;
  title: string;
  blocks: Block[];
  /** Real-style examples from the writer's own reports, used only in the AI prompt to match tone. */
  examples: string[];
  /** What to paste as notes for this section. Absent when the section is fixed wording only. */
  notesHint?: string;
}

export interface ScreenItem {
  id: string;
  label: string;
  group: "classroom" | "supporting" | "paragraph";
  /** Sentence opener with blanks. */
  opener: string;
  examples: string[];
}
