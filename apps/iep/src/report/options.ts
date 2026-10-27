/**
 * Ready-made answers for blanks. A blank in the template can name a list:
 *   [[disability category::disability]]
 * The text before "::" is what the writer sees; the list supplies choices.
 * Every list also allows typing your own answer.
 */

export interface OptionList {
  options: string[];
  /** Pick several; they are joined as "a, b, and c". */
  multi?: boolean;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function years(): string[] {
  const y = new Date().getFullYear();
  return [String(y), String(y + 1), String(y + 2)];
}

export const OPTION_LISTS: Record<string, OptionList> = {
  handedness: { options: ["right-handed", "left-handed"] },
  grasp: { options: ["tripod", "dynamic tripod", "static tripod", "lateral tripod", "quadrupod", "thumb wrap", "interdigital", "barrel", "fisted (palmar)"] },
  completedBy: { options: ["general education teacher", "special education teacher", "classroom teacher", "school counselor", "classroom aide"] },
  delayFrequency: {
    options: [
      "fine motor skill delays the majority of the time (80–100%)",
      "significant fine motor delays 80–100% of the time",
      "fine motor skill delays some of the time (51–79%)",
      "occasional fine motor skill delays (21–50%)",
    ],
  },
  disability: {
    options: [
      "Autism",
      "Developmental Delay",
      "Emotional Disturbance",
      "Hearing Impairment",
      "Intellectual Disability",
      "Multiple Disabilities",
      "Orthopedic Impairment",
      "Other Health Impairment",
      "Specific Learning Disability",
      "Speech or Language Impairment",
      "Traumatic Brain Injury",
      "Visual Impairment",
      "Deaf-Blindness",
    ],
  },
  minutes: {
    options: ["15 minutes monthly", "30 minutes monthly", "60 minutes monthly", "120 minutes monthly", "30 minutes weekly", "60 minutes weekly", "90 minutes weekly"],
  },
  location: { options: ["outside the classroom", "inside the classroom", "both inside and outside the classroom"] },
  skillAreas: {
    multi: true,
    options: [
      "fine motor skills",
      "visual motor integration skills",
      "visual perceptual skills",
      "handwriting",
      "bilateral coordination",
      "sensory processing",
      "self help skills",
      "postural control",
      "motor planning",
      "keyboarding",
    ],
  },
  supports: {
    multi: true,
    options: [
      "specialized instruction",
      "visual-spatial support",
      "sensory processing support",
      "assistive technology",
      "adapted paper",
      "a slant board",
      "an adaptive pencil grip",
      "visual prompts",
    ],
  },
  accommodations: {
    multi: true,
    options: [
      "a designated seating spot",
      "alternate seating and work positions",
      "noise-canceling headphones",
      "scheduled movement breaks",
      "adapted paper",
      "a slant board",
      "an adaptive pencil grip",
      "extra time",
      "speech-to-text",
      "word prediction",
    ],
  },
  concernAreas: {
    multi: true,
    options: [
      "pencil grasp",
      "pencil pressure",
      "copying",
      "handwriting legibility",
      "letter formation",
      "line adherence",
      "word spacing",
      "task completion rate",
      "coloring",
      "cutting",
      "desk and floor posture",
      "shoe tying",
      "keyboard and mouse use",
    ],
  },
  month: { options: MONTHS },
  year: { options: years() },
  objectivesMet: { options: ["1", "2", "3", "4"] },
  objectivesTotal: { options: ["2", "3", "4"] },
  percent: { options: ["70", "75", "80", "85", "90"] },
  dataDates: { options: ["3 out of 4", "4 out of 5", "2 out of 3"] },
  beeryDescriptor: { options: ["Very Low", "Low", "Below Average", "Average", "Above Average", "High", "Very High"] },
  functionalOrConcern: { options: ["functional", "an area of concern"] },
};

/** Split a blank's inside into what to show and the list it names, if any. Whether that list exists is for the picker to decide. */
export function parseBlank(inner: string): { label: string; list?: string } {
  const i = inner.lastIndexOf("::");
  if (i < 0) return { label: inner };
  const list = inner.slice(i + 2).trim();
  return { label: inner.slice(0, i).trim(), ...(list ? { list } : {}) };
}

/** "a", "a and b", "a, b, and c". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
