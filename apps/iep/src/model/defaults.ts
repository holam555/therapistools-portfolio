import type { Library, Sentence } from "./types";
import type { DisciplineId } from "./disciplines";

/**
 * Starter content so the app is useful on first open. Every sentence was
 * written for this tool and follows no district's form; the standards codes
 * are made up. Every observation is fictional: no real student, names,
 * schools, dates of birth or other identifiers, only the placeholder tokens.
 * The user can wipe all of it with "Clear library" in Settings.
 */

export const DEFAULT_SECTIONS = [
  { id: "sec_present", name: "Present Levels" },
  { id: "sec_impact", name: "Impact of Disability" },
  { id: "sec_service", name: "Service Delivery" },
  { id: "sec_goal", name: "Annual Goal" },
  { id: "sec_objective", name: "Objective" },
  { id: "sec_accommodation", name: "Accommodation" },
  { id: "sec_recommendation", name: "Recommendation" },
  { id: "sec_standards", name: "Related Standards" },
];

export const DEFAULT_GRADE_BANDS = [
  { id: "gb_k2", label: "K–2" },
  { id: "gb_35", label: "3–5" },
  { id: "gb_68", label: "6–8" },
  { id: "gb_912", label: "9–12" },
];

export const DEFAULT_VARIABLES = [
  { name: "accuracy", label: "Accuracy", presets: ["60%", "70%", "80%", "90%", "100%"], allowFreeText: true },
  { name: "percent", label: "Percent", presets: ["60%", "70%", "80%", "90%", "100%"], allowFreeText: true },
  { name: "trials", label: "Trials", presets: ["3 out of 5", "4 out of 5", "5 out of 5", "3 out of 4"], allowFreeText: true },
  { name: "grasp", label: "Pencil grasp", presets: ["tripod", "quadrupod", "lateral tripod", "thumb-wrap", "fisted"], allowFreeText: true },
  { name: "shape", label: "Shape", presets: ["circle", "square", "triangle", "complex shape (star)"], allowFreeText: true },
  { name: "line_type", label: "Line type", presets: ["straight line", "curved line", "zig-zag line", "circle"], allowFreeText: true },
  { name: "tolerance", label: "Tolerance", presets: ["1/8 inch", "1/4 inch", "1/2 inch"], allowFreeText: true },
  { name: "tools", label: "Tools used", presets: ["a glue stick and tape", "a ruler and a hole punch", "a stapler and a pencil sharpener"], allowFreeText: true },
  { name: "word_sample", label: "Copy sample", presets: ["two-sentence (14 words)", "three-sentence (21 words)"], allowFreeText: true },
  { name: "letters_recalled", label: "Letters recalled", presets: [], allowFreeText: true },
  { name: "reversals", label: "Reversed letters", presets: [], allowFreeText: true },
  { name: "behaviors", label: "Observed behaviors", presets: [], allowFreeText: true },
  { name: "rater", label: "Who completed the form", presets: ["teacher", "general education teacher", "special education teacher", "school counselor", "paraprofessional"], allowFreeText: true },
  { name: "typical_areas", label: "Typical areas", presets: [], allowFreeText: true },
  { name: "moderate_areas", label: "Moderate-difficulty areas", presets: [], allowFreeText: true },
  { name: "severe_areas", label: "Severe-difficulty areas", presets: [], allowFreeText: true },
  { name: "frequency", label: "Frequency", presets: ["on a few school days", "on some school days", "on most school days", "every school day"], allowFreeText: true },
  { name: "concerns", label: "Areas of concern", presets: [], allowFreeText: true },
  { name: "sensory_concerns", label: "Sensory concerns", presets: ["chewing on sleeves and covering the ears during assemblies"], allowFreeText: true },
  { name: "accommodations", label: "Accommodations in use", presets: ["a chewable pencil topper, a seat near the door, and a visual schedule"], allowFreeText: true },
  { name: "disability", label: "Disability category", presets: [], allowFreeText: true },
  { name: "minutes", label: "Service minutes", presets: ["30", "60", "90", "120"], allowFreeText: true },
  { name: "goal_date", label: "Goal date", presets: [], allowFreeText: true },
  { name: "objectives_met", label: "Objectives to meet", presets: ["2 out of 3", "3 out of 4", "3 out of 3"], allowFreeText: true },
  { name: "data_dates", label: "Data collection dates", presets: ["3 out of 4", "4 out of 5"], allowFreeText: true },
  { name: "focus_area", label: "Focus area", presets: ["Fine Motor", "Visual Motor", "Sensory Processing", "Self Care"], allowFreeText: true },
];

type S = [text: string, sectionId: string, extra?: Partial<Pick<Sentence, "tags" | "notes" | "gradeBandIds">>];

let counter = 0;
function sentences(items: S[]): Sentence[] {
  return items.map(([text, sectionId, extra]) => ({
    id: `s_starter_${++counter}`,
    text,
    sectionId,
    gradeBandIds: extra?.gradeBandIds ?? [],
    tags: extra?.tags ?? [],
    notes: extra?.notes ?? "",
  }));
}

const PL = "sec_present";

export function starterLibrary(): Library {
  counter = 0;
  return {
    version: 1,
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    gradeBands: DEFAULT_GRADE_BANDS.map((g) => ({ ...g })),
    variables: DEFAULT_VARIABLES.map((v) => ({ ...v, presets: [...v.presets] })),
    neverAllow: [],
    domains: [
      {
        id: "d_fine_motor",
        name: "Fine Motor",
        tasks: [
          {
            id: "t_fm_screen",
            name: "Screening intro",
            sentences: sentences([
              ["A short hands-on screen looked at how {{they}} manages the fine motor tasks of the school day.", PL],
            ]),
          },
          {
            id: "t_fm_grasp",
            name: "Pencil grasp and bilateral coordination",
            sentences: sentences([
              ["{{They}} uses a functional {{grasp}} grasp when writing.", PL],
              ["{{They}} rested {{their}} helper hand in {{their}} lap at first, but held the paper steady after a verbal cue.", PL],
              ["{{They}} stabilizes {{their}} paper with {{their}} non-dominant hand without cues.", PL],
            ]),
          },
          {
            id: "t_fm_coloring",
            name: "Coloring",
            sentences: sentences([
              ["{{They}} colored a 2-inch star and stayed within the border on all but one point.", PL],
              ["{{They}} colored within the lines with {{accuracy}} accuracy.", PL],
            ]),
          },
          {
            id: "t_fm_cutting",
            name: "Cutting",
            sentences: sentences([
              ["During cutting tasks, {{they}} opened and closed the scissors with a smooth rhythm and turned the paper with {{their}} helper hand.", PL],
              ["{{They}} cut a {{shape}} without deviation.", PL],
              ["{{Student}} cut along a {{line_type}} with {{accuracy}} accuracy in {{trials}} trials.", PL],
              [
                "{{Student}} will improve fine motor cutting skills needed to manage classroom paper tasks by accurately cutting along a {{line_type}} within {{tolerance}} of the boundary line.",
                "sec_objective",
              ],
            ]),
          },
          {
            id: "t_fm_tools",
            name: "Tool use",
            sentences: sentences([
              ["{{They}} managed classroom tools such as {{tools}} without help.", PL],
              [
                "Tool use: M3.4 Uses crayons, pencils, scissors and modelling tools without help.",
                "sec_standards",
              ],
            ]),
          },
          {
            id: "t_fm_handwriting",
            name: "Handwriting",
            sentences: sentences([
              [
                "When given a {{word_sample}} sample to copy, {{they}} spaced {{their}} words evenly, used lowercase letters where expected, and kept letters on the baseline for {{percent}} of words.",
                PL,
              ],
              ["However, {{their}} letters drifted larger toward the end of each line.", PL],
              ["Overall, {{their}} writing is within normal age expectations.", PL],
              ["{{Their}} classroom writing sample showed the same drift in size and a tendency to crowd the right margin.", PL],
              [
                "When asked to recall the alphabet from memory without cues, {{they}} recalled {{letters_recalled}} uppercase and lowercase letters, demonstrating reversals on {{reversals}}.",
                PL,
              ],
              [
                "When provided with cues during letter copying, {{they}} demonstrated the motor skills to copy all uppercase and lowercase letters without letter reversals or incorrect formation, suggesting functional motor skills.",
                PL,
              ],
              ["Overall, {{their}} writing was generally legible, though primarily impacted by letter size.", PL],
              ["{{They}} may benefit from paper with a highlighted writing zone, as well as a visual reminder to leave a margin.", "sec_recommendation"],
              [
                "{{Student}} will improve visual motor skills needed to access written work by legibly copying letters and shapes with slanted lines (i.e. triangle, X, R, K, Q, Y, y).",
                "sec_objective",
              ],
              ["HW.2.1. Prints letters and numbers that can be read on lined paper for the grade.", "sec_standards"],
            ]),
          },
          {
            id: "t_fm_goal",
            name: "Annual goal frame",
            sentences: sentences([
              [
                "By {{goal_date}}, with direct teaching of {{focus_area}} skills, {{student}} will reach {{objectives_met}} objectives below in {{percent}} of tries or on {{data_dates}} days when data is taken:",
                "sec_goal",
                { notes: "Put this first under Annual Goal; the objectives follow it." },
              ],
            ]),
          },
        ],
      },
      {
        id: "d_sensory",
        name: "Sensory",
        tasks: [
          {
            id: "t_se_definition",
            name: "Definition",
            sentences: sentences([
              [
                "Sensory processing is how a person takes in sights, sounds, touch and movement and makes use of them.",
                PL,
              ],
              ["Differences in sensory processing can change how a student attends, moves and joins in at school.", PL],
            ]),
          },
          {
            id: "t_se_observations",
            name: "Clinical observations",
            sentences: sentences([
              [
                "During clinical observations, {{student}} demonstrated difficulty with sustained attention, {{behaviors}}, which impacted {{their}} ability to finish each testing task.",
                PL,
              ],
            ]),
          },
          {
            id: "t_se_spm",
            name: "SPM-2 (School form)",
            sentences: sentences([
              [
                "The SPM-2 school questionnaire was filled in by {{student}}'s {{rater}} to show which kinds of sensory input get in the way of {{their}} day in class.",
                PL,
              ],
              ["It covers these areas: Social Participation, Vision, Hearing, Touch, Taste and Smell, Body Awareness, Balance and Motion, Planning and Ideas.", PL],
              ["Each area is reported as Typical, Moderate Difficulties, or Severe Difficulties.", PL],
              ["{{Student}}'s results are listed here:", PL],
              ["Typical Processing: {{typical_areas}}.", PL],
              ["Moderate Difficulties: {{moderate_areas}}.", PL],
              ["Severe Difficulties: {{severe_areas}}.", PL],
            ]),
          },
          {
            id: "t_se_teacher",
            name: "Teacher checklist",
            sentences: sentences([
              [
                "On a classroom checklist, the {{rater}} marked fine motor tasks as hard for {{student}} {{frequency}}, which gets in the way of {{their}} independence in class.",
                PL,
              ],
              ["The tasks marked were {{concerns}}.", PL],
              ["Legibility, letter formation, staying on the line, and spacing were also marked.", PL],
              [
                "The teacher also noted sensory behaviors, {{sensory_concerns}}, that pull {{them}} away from lessons.",
                PL,
              ],
              [
                "Supports already used in class are {{accommodations}}.",
                "sec_accommodation",
              ],
            ]),
          },
        ],
      },
      {
        id: "d_self_care",
        name: "Self Care",
        tasks: [
          {
            id: "t_sc_dressing",
            name: "Dressing",
            sentences: sentences([
              [
                "{{Student}} will fasten the top button of {{their}} coat and engage the zipper pin, given a visual sequence card and no more than one verbal cue.",
                "sec_objective",
              ],
              ["Daily living skills, intermediate: Dresses and undresses, including buttons and fasteners.", "sec_standards"],
            ]),
          },
        ],
      },
      {
        id: "d_general",
        name: "General",
        tasks: [
          {
            id: "t_ge_impact",
            name: "Impact of disability",
            sentences: sentences([
              ["{{Student}}'s {{disability}} affects {{their}} hand skills, self-care, and sensory processing at school.", "sec_impact"],
              ["Because writing is hard, {{they}} cannot always show what {{they}} knows on paper.", "sec_impact"],
              ["Getting ready for lunch and moving between activities take {{them}} longer, which cuts into lesson time.", "sec_impact"],
              ["{{They}} covers {{their}} ears during loud activities and leaves {{their}} seat to seek movement, so {{they}} misses parts of lessons.", "sec_impact"],
              ["Occupational therapy would help {{them}} build the hand, self-care and sensory skills {{they}} needs to take part in the school day.", "sec_impact"],
              ["As a result {{they}} often finishes classwork late and joins fewer class activities than {{their}} classmates.", "sec_impact"],
            ]),
          },
          {
            id: "t_ge_service",
            name: "Service delivery",
            sentences: sentences([
              ["Occupational therapy will be given by the school occupational therapist, or by a therapy assistant the therapist supervises.", "sec_service"],
              ["{{minutes}} minutes of occupational therapy each week will take place outside the classroom and will work on hand skills, sensory processing and self-care.", "sec_service"],
              ["Sessions may be one to one or in a small group.", "sec_service"],
            ]),
          },
        ],
      },
    ],
  };
}

/** Blanks that suit any discipline; each discipline adds its own as it builds its bank. */
export const GENERIC_VARIABLES = [
  { name: "accuracy", label: "Accuracy", presets: ["60%", "70%", "80%", "90%", "100%"], allowFreeText: true },
  { name: "trials", label: "Trials", presets: ["3 out of 5", "4 out of 5", "5 out of 5", "3 out of 4"], allowFreeText: true },
  { name: "support_level", label: "Support level", presets: ["independently", "with verbal cues", "with visual cues", "with minimal support", "with moderate support", "with maximum support"], allowFreeText: true },
  { name: "frequency", label: "Frequency", presets: ["on a few school days", "on some school days", "on most school days", "every school day"], allowFreeText: true },
  { name: "goal_date", label: "Goal date", presets: [], allowFreeText: true },
  { name: "minutes", label: "Service minutes", presets: ["30", "60", "90", "120"], allowFreeText: true },
  { name: "objectives_met", label: "Objectives to meet", presets: ["2 out of 3", "3 out of 4", "3 out of 3"], allowFreeText: true },
  { name: "data_dates", label: "Data collection dates", presets: ["3 out of 4", "4 out of 5"], allowFreeText: true },
];

/** An empty sentence bank: sections, grade bands and generic blanks, but no domains yet. */
export function emptyLibrary(): Library {
  return {
    version: 1,
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    gradeBands: DEFAULT_GRADE_BANDS.map((g) => ({ ...g })),
    variables: GENERIC_VARIABLES.map((v) => ({ ...v, presets: [...v.presets] })),
    neverAllow: [],
    domains: [],
  };
}

/** The library a discipline starts with: the OT starter, or an empty bank. */
export function libraryFor(discipline: DisciplineId): Library {
  return discipline === "ot" ? starterLibrary() : emptyLibrary();
}
