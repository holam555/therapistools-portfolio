import type { Library, Sentence } from "./types";
import type { DisciplineId } from "./disciplines";

/**
 * Starter content so the app is useful on first open. The wording follows
 * the shape of school OT reports, but every observation here is fictional:
 * no real student, names, schools, dates of birth or other identifiers,
 * only the placeholder tokens.
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
  { name: "frequency", label: "Frequency", presets: ["0–20%", "21–50%", "51–79%", "80–100%"], allowFreeText: true },
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
              ["An informal fine motor screen was administered to assess {{their}} overall fine motor skills.", PL],
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
              ["{{They}} was able to functionally use fine motor tools including {{tools}}.", PL],
              [
                "Fine motor skills: F2.2 Apply movement concepts to specific movement situations. Uses crayons, markers, pencils independently; uses dough/clay tools; uses scissors.",
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
              ["WLP.1.1. Independently print legible letters, numerals, and punctuation on grade-level appropriate lined paper.", "sec_standards"],
            ]),
          },
          {
            id: "t_fm_goal",
            name: "Annual goal frame",
            sentences: sentences([
              [
                "By {{goal_date}}, after given direct instruction in {{focus_area}} skill development, {{student}} will meet the following {{objectives_met}} objectives on {{percent}} of opportunities OR over {{data_dates}} data collection dates:",
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
                "Sensory Integration is the process by which information from our senses (touch, taste, smell, sight, hearing and balance/movement) is interpreted by the brain so the body can respond to the environment.",
                PL,
              ],
              ["Sensory responses may also affect a person's ability to adequately engage in the environment as well as affect emotions and behaviors.", PL],
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
                "The Sensory Processing Measure-2: School form was completed by {{student}}'s {{rater}} to help determine areas of sensory processing that are impacting {{student}} within the classroom.",
                PL,
              ],
              ["Subtests include: Social Participation, Vision, Hearing, Touch, Taste and Smell, Body Awareness, Balance and Motion, Planning and Ideas.", PL],
              ["In each area, a child can fall under either Typical, Moderate Difficulties, or Severe Difficulties.", PL],
              ["{{Student}}'s results are as follows:", PL],
              ["Typical Processing: {{typical_areas}}.", PL],
              ["Moderate Difficulties: {{moderate_areas}}.", PL],
              ["Severe Difficulties: {{severe_areas}}.", PL],
            ]),
          },
          {
            id: "t_se_teacher",
            name: "Teacher rating form",
            sentences: sentences([
              [
                "Based on the Teacher Rating Form completed by the {{rater}}, {{student}} demonstrates fine motor delays {{frequency}} of the time, which interfere with {{their}} independence and access to the general education curriculum.",
                PL,
              ],
              ["Identified areas of concern include {{concerns}}.", PL],
              ["Additionally, handwriting mechanics such as legibility, letter formation, line anchoring, and spacing are challenging.", PL],
              [
                "{{Their}} sensory behaviors are also of concern, specifically {{sensory_concerns}}, which interfere with {{their}} functioning in the classroom setting.",
                PL,
              ],
              [
                "To support {{their}} overall performance and attention, effective classroom accommodations currently in use include {{accommodations}}.",
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
              ["Standards Based Life Skill Curriculum Intermediate: Undress and dress self, including buttons and fasteners.", "sec_standards"],
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
              ["{{Student}}'s {{disability}} impacts {{their}} fine motor skills, self-help skills, and sensory processing skills in the classroom.", "sec_impact"],
              ["{{Their}} fine motor deficits impact {{their}} ability to show what {{they}} knows through written work.", "sec_impact"],
              [
                "These fine motor and self-care limitations slow {{their}} transitions between activities and {{their}} set-up for lunch, which shortens {{their}} instructional time.",
                "sec_impact",
              ],
              [
                "{{Their}} sensory processing skills affect {{their}} attention when participating within the classroom environment, as {{they}} covers {{their}} ears during loud activities and leaves {{their}} seat to seek movement.",
                "sec_impact",
              ],
              [
                "{{They}} would benefit from occupational therapy services to address fine motor, visual-motor, self-help, and sensory-motor skill development to facilitate {{their}} ability to access the educational environment.",
                "sec_impact",
              ],
              ["These impacts limit {{their}} timely completion of classwork and full participation in age-appropriate classroom tasks.", "sec_impact"],
            ]),
          },
          {
            id: "t_ge_service",
            name: "Service delivery",
            sentences: sentences([
              [
                "Occupational Therapy services will be provided by a licensed Registered Occupational Therapist or by a Certified Occupational Therapy Assistant under the supervision of a Registered Occupational Therapist.",
                "sec_service",
              ],
              [
                "{{minutes}} minutes of occupational therapy will be provided outside the classroom to address fine motor and visual motor integration skills, sensory processing and self help skills.",
                "sec_service",
              ],
              ["Services may be 1:1 or within a small group.", "sec_service"],
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
  { name: "frequency", label: "Frequency", presets: ["0–20%", "21–50%", "51–79%", "80–100%"], allowFreeText: true },
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
