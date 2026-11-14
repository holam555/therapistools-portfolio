/** The fixed lists a reel is tagged with. Ids are stored; labels are shown. */
export const SKILL_AREAS = [
  { id: "handwriting", label: "Handwriting", emoji: "✏️" },
  { id: "pre-writing", label: "Pre-writing", emoji: "〰️" },
  { id: "visual-perception", label: "Visual perception", emoji: "👀" },
  { id: "visual-motor", label: "Visual motor integration", emoji: "🎯" },
  { id: "motor-planning", label: "Motor planning", emoji: "🤸" },
  { id: "sensory", label: "Sensory", emoji: "🌀" },
  { id: "self-care", label: "Self care", emoji: "👟" },
  { id: "classroom-support", label: "Classroom support", emoji: "🏫" },
] as const;

export const GRADE_BANDS = [
  { id: "prek-1", label: "Preschool to 1st" },
  { id: "2-5", label: "2nd to 5th" },
] as const;

export type SkillId = (typeof SKILL_AREAS)[number]["id"];
export type GradeId = (typeof GRADE_BANDS)[number]["id"];

export const isSkill = (v: string): v is SkillId => SKILL_AREAS.some((s) => s.id === v);
export const isGrade = (v: string): v is GradeId => GRADE_BANDS.some((g) => g.id === v);
export const skillLabel = (id: string) => SKILL_AREAS.find((s) => s.id === id)?.label ?? id;
export const gradeLabel = (id: string) => GRADE_BANDS.find((g) => g.id === id)?.label ?? id;

/**
 * Plain keyword rules, no AI: words and hashtags that point to a skill area or
 * grade. Used to pre-tick tags from text a person typed or pasted (a caption
 * pasted by the owner, a contributor's sentence). The text itself is never
 * saved by this function.
 */
const SKILL_WORDS: Record<SkillId, string[]> = {
  handwriting: ["handwriting", "letterformation", "letter formation", "writing", "pencil grasp", "pencilgrasp", "letters", "spacing", "sizing"],
  "pre-writing": ["prewriting", "pre-writing", "pre writing", "tracing", "strokes", "prewritingskills", "scribble", "shapes", "coloring", "colouring", "crayon"],
  "visual-perception": ["visualperception", "visual perception", "figure ground", "figureground", "visual discrimination", "visual memory", "scanning", "puzzle", "matching", "i spy"],
  "visual-motor": ["visualmotor", "visual motor", "vmi", "eye hand", "eyehand", "hand eye", "handeye", "copying", "cutting", "scissor", "catching", "lacing", "bilateral"],
  "motor-planning": ["motorplanning", "motor planning", "praxis", "obstacle", "gross motor", "grossmotor", "crossing midline", "midline", "coordination", "animal walk", "yoga", "balance", "core strength"],
  sensory: ["sensory", "regulation", "proprioception", "proprioceptive", "vestibular", "heavy work", "heavywork", "calming", "sensorybin", "tactile", "fidget", "movement break", "brain break"],
  "self-care": ["selfcare", "self care", "self-care", "adl", "dressing", "buttons", "button", "zipper", "shoe", "shoelace", "feeding", "utensil", "toileting", "handwashing"],
  "classroom-support": ["classroom", "teacher", "push in", "pushin", "whole class", "accommodation", "seating", "attention", "executive function", "executivefunction", "desk", "centers", "transitions"],
};
const GRADE_WORDS: Record<GradeId, string[]> = {
  "prek-1": ["preschool", "prek", "pre-k", "toddler", "kindergarten", "kinder", "first grade", "1st grade", "early childhood", "ecse", "tk"],
  "2-5": ["2nd grade", "second grade", "3rd grade", "third grade", "4th grade", "fourth grade", "5th grade", "fifth grade", "elementary", "upper elementary", "cursive"],
};

export function suggestTags(text: string): { skills: SkillId[]; grades: GradeId[] } {
  const t = ` ${text.toLowerCase().replace(/[#_]/g, " ").replace(/\s+/g, " ")} `;
  const squashed = text.toLowerCase().replace(/[^a-z0-9#]/g, "");
  const hit = (words: string[]) => words.some((w) => (w.includes(" ") || w.includes("-") ? t.includes(w) : new RegExp(`\\b${w}`).test(t)) || squashed.includes(`#${w.replace(/[^a-z0-9]/g, "")}`));
  return {
    skills: SKILL_AREAS.map((s) => s.id).filter((id) => hit(SKILL_WORDS[id])),
    grades: GRADE_BANDS.map((g) => g.id).filter((id) => hit(GRADE_WORDS[id])),
  };
}

/**
 * Reads the text pasted under a link in "Add in bulk". Lines that start with
 * "title:", "tags:", "by:" or "plays: instagram" set those fields outright; anything else is
 * treated as a caption and only used to suggest tags.
 */
export function readPastedDetails(text: string): { title: string; creator: string; skills: SkillId[]; grades: GradeId[]; instagramOnly: boolean } {
  let title = "";
  let creator = "";
  let named: SkillId[] | null = null;
  let instagramOnly = false;
  const rest: string[] = [];
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z]/g, "");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(title|tags?|by|plays)\s*:\s*(.*)$/i);
    if (!m) rest.push(line);
    else if (m[1].toLowerCase() === "title") title = m[2].trim().slice(0, 80);
    else if (m[1].toLowerCase() === "plays") instagramOnly = /instagram/i.test(m[2]);
    else if (m[1].toLowerCase() === "by") creator = m[2].trim().replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
    else {
      const wanted = m[2].split(",").map(norm).filter(Boolean);
      named = SKILL_AREAS.filter((s) => wanted.some((w) => w === norm(s.id) || w === norm(s.label) || norm(s.label).startsWith(w))).map((s) => s.id);
    }
  }
  const guess = suggestTags(rest.join("\n"));
  return { title, creator, skills: named ?? guess.skills, grades: guess.grades, instagramOnly };
}
