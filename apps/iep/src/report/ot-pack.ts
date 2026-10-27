import type { Block, GoalArea, ReportSection, ReportSetup } from "./types";
import { screenItemsFor } from "./ot-screen";
import { spmScaleList, spmSummaryPhrase } from "./spm";
import { levelLine } from "./grids";
import { applyBlockOverrides, applyScreenOverrides, gridFor, type TemplateOverrides } from "./overrides";

/**
 * Occupational therapy report template, following the shape of school OT
 * evaluation and annual-review reports. Fixed wording is kept exactly;
 * [[blanks]] mark what the writer fills; the examples are fictional
 * observations written to show the style, and are only fed to the AI prompts
 * to match tone. {{student}} appears once at the start of each section, then
 * pronouns.
 */

// ---------- assessments (shared by both report types; only the screen depends on grade) ----------

function teacherSection(setup: ReportSetup): ReportSection {
  if (!setup.teacherConcerns) {
    return {
      id: "teacher",
      title: "Teacher Rating Checklist",
      blocks: [
        {
          kind: "para", id: "teacher-none",
          text: "Record review and analysis of the teacher rating checklist form indicates {{student}} demonstrates age and grade level motor skills 80-100% as compared to peers for handwriting, manipulating school tools, and managing belongings. Gross motor skills are 80-100% as compared to peers for navigating the school setting. The sensory area is listed as no concerns that interfere with instruction or work production.",
        },
      ],
      examples: [
        "Record review and analysis of the teacher rating checklist form indicates this student demonstrates age and grade level motor skills which support access to the curriculum. Based on information from the classroom teacher, her fine motor, gross motor and sensory skills do not limit her academic success at this time.",
      ],
      notesHint: "Anything the teacher noted, if you want to adjust the wording.",
    };
  }
  return {
    id: "teacher",
    title: "Teacher Rating Checklist",
    blocks: [
      {
        kind: "para", id: "teacher-concerns",
        text: "Based on the Teacher Rating Form completed by the [[who completed it::completedBy]], {{student}} demonstrates [[fine motor delays and how often::delayFrequency]], which [[impact on access to the curriculum and independence]]. Specific areas of concern include [[areas of concern::concernAreas]]. [[Gross motor concerns, or none reported]]. [[Sensory concerns noted by the teacher]]. To support {{their}} needs in the classroom, accommodations such as [[accommodations in use::accommodations]] are used.",
      },
    ],
    examples: [
      "Based on the Teacher Rating Form completed by the special education teacher, [STUDENT] demonstrates fine motor skill delays some of the time (51–79%), which interfere with her ability to keep up with written work and manage her materials. Specific areas of concern include letter sizing, line adherence, coloring, cutting, buttoning, and opening containers. No gross motor concerns were reported, though the teacher noted that she chews on her sleeves and covers her ears during assemblies. To support these needs in the classroom, accommodations such as a chewable pencil topper, a seat near the door, and a visual schedule are used.",
      "Based on the Teacher Rating Form completed by the general education teacher, [STUDENT] demonstrates fine motor delays the majority of the time (80–100%), which interfere with his independence and access to the general education curriculum. Identified areas of concern include pencil grasp, letter formation, copying from the board, coloring, cutting, and zipping his coat. His sensory behaviors are also of concern, specifically rocking in his chair and touching classmates' belongings, which interfere with his functioning in the classroom setting. To support his overall performance and attention, effective classroom accommodations currently in use include a wobble cushion, a fidget kept in his desk, and a checklist for packing up.",
    ],
    notesHint: "What the teacher checked on the rating form: areas of concern, gross motor, sensory, and accommodations in use.",
  };
}

function screenSection(setup: ReportSetup, o?: TemplateOverrides): ReportSection {
  const chosen = applyScreenOverrides(screenItemsFor(setup.grade), setup.grade, o).filter((i) => setup.screenItems.includes(i.id));
  const blocks: Block[] = [{ kind: "para", id: "intro", text: "An informal fine motor screen was administered to assess {{student}}'s fine motor skills." }];
  const classroom = chosen.filter((i) => i.group === "classroom");
  const supporting = chosen.filter((i) => i.group === "supporting");
  const paragraphs = chosen.filter((i) => i.group === "paragraph");
  if (classroom.length) {
    blocks.push({ kind: "subheading", id: "h-classroom", text: "Classroom Skills" });
    for (const i of classroom) blocks.push({ kind: "bullet", id: i.id, label: i.label, text: i.opener, examples: i.examples });
  }
  if (supporting.length) {
    blocks.push({ kind: "subheading", id: "h-supporting", text: "Supporting Skills" });
    for (const i of supporting) blocks.push({ kind: "bullet", id: i.id, label: i.label, text: i.opener, examples: i.examples });
  }
  for (const i of paragraphs) blocks.push({ kind: "para", id: i.id, label: i.label, text: i.opener, examples: i.examples });
  return {
    id: "screen",
    title: "Informal Fine Motor Screen",
    blocks,
    examples: chosen.flatMap((i) => i.examples),
    notesHint: "Your observations for each item you tested, in any order and as rough as you like.",
  };
}

const beerySection: ReportSection = {
  id: "beery",
  title: "Beery-Buktenica Developmental Test of Visual-Motor Integration",
  blocks: [
    {
      kind: "para", id: "intro",
      text: "The Beery-Buktenica Developmental Test of Visual-Motor Integration (6th edition) was administered by [[your name]], OTR/L. This test measures the extent to which individuals can integrate their visual and motor skills. The visual perception subtest measures visual skills alone without fine motor abilities, whereas the motor coordination subtest measures fine motor skills alone without the visual abilities. {{student}} performed as follows:",
    },
    { kind: "para", id: "vmi", label: "Developmental Test of Visual-Motor Integration", text: "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::beeryDescriptor]]." },
    { kind: "para", id: "vp", label: "Test of Visual Perception", text: "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::beeryDescriptor]]." },
    { kind: "para", id: "mc", label: "Test of Motor Coordination", text: "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::beeryDescriptor]]." },
  ],
  examples: [],
};

function spm2Section(setup: ReportSetup, o?: TemplateOverrides): ReportSection {
  const grid = gridFor("spm2", o);
  return {
  id: "spm2",
  title: "Sensory Processing Measure-2: Child School Form",
  blocks: [
    { kind: "subheading", id: "h-sensory", text: "Sensory Processing" },
    {
      kind: "para", id: "definition",
      text: "Sensory Integration is the process by which information from our senses (touch, taste, smell, sight, hearing and balance/movement) is interpreted by the brain so the body can respond to the environment. Sensory responses may also affect a person's ability to adequately engage in the environment as well as affect emotions and behaviors.",
    },
    {
      kind: "para", id: "completed-by",
      text: `The Sensory Processing Measure-2: School form was completed by {{student}}'s teacher to help determine areas of sensory processing that are impacting {{them}} within the classroom. Subtests include: ${spmScaleList(grid)}. In each area, a child can fall under either ${joinOr(grid.levels.map((l) => l.label))}. {{Their}} results are as follows:`,
    },
    ...grid.levels.map(
      (level): Block => ({
        kind: "para", id: `spm-${level.value}`, generated: true, grid: "spm2",
        label: level.label,
        text: levelLine(grid, level, setup.ratings.spm2 ?? {}) ?? grid.blank,
      }),
    ),
    {
      kind: "para", id: "composite",
      text: "The total sensory scale composite score incorporates all of the scales except for social participation and planning and ideas. It assesses sensory processing vulnerabilities and allows a single score to display overall sensory functioning. Each scale is outlined below.",
    },
    { kind: "para", id: "def-social", label: "Social Participation", text: "assesses the child's pragmatic language skills and social interactions with people in the daily environment and ability to interact appropriately in social settings." },
    { kind: "para", id: "def-vision", label: "Vision", text: "assesses the child's visual processing, such as seeking visual input, hyper- or hypo-sensitivity to visual stimulation, and problems with visual tracking or visual perception." },
    { kind: "para", id: "def-hearing", label: "Hearing", text: "assesses the child's auditory processing, hyper- or hypo-sensitivity to auditory input, auditory perceptual difficulties, and sensory seeking behavior for sounds." },
    { kind: "para", id: "def-touch", label: "Touch", text: "assesses the child's ability to tolerate and understand tactile information, including hyper- or hypo-responsivity to touch and texture." },
    { kind: "para", id: "def-body", label: "Body Awareness", text: "assesses the child's awareness of their own body in space and in relation to other people and objects, also known as proprioception, a skill necessary for coordinated movement." },
    { kind: "para", id: "def-planning", label: "Planning and Ideas", text: "assesses a child's ability to plan, conceptualize, and coordinate movements in order to complete unfamiliar motor activities." },
    { kind: "para", id: "def-balance", label: "Balance and Motion", text: "assesses the child's vestibular system and their movements and posture in the school environment." },
  ],
  examples: [],
  };
}

/** "a, b, or c". */
function joinOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function assessmentSections(setup: ReportSetup, o?: TemplateOverrides): ReportSection[] {
  const out: ReportSection[] = [];
  if (setup.assessments.teacher) out.push(teacherSection(setup));
  if (setup.assessments.screen) out.push(screenSection(setup, o));
  if (setup.assessments.beery) out.push(beerySection);
  if (setup.assessments.spm2) out.push(spm2Section(setup, o));
  return out;
}

// ---------- evaluation report ----------

function summarySection(setup: ReportSetup, o?: TemplateOverrides): ReportSection {
  if (!setup.concerns) {
    return {
      id: "summary",
      title: "Evaluation Summary",
      blocks: [
        {
          kind: "para", id: "summary-none",
          label: "Summary",
          text: "The evaluation results indicate that {{student}} demonstrates age- and grade-level motor skills that support {{their}} access to the school curriculum. {{Their}} fine motor, gross motor and sensory processing skills do not significantly limit {{their}} academic success. Functionally, {{they}} is able to [[functional skills observed]]. [[Formal assessment results]]. [[Teacher report on sensory processing]]. At this time, there are no motor or sensory concerns that significantly impact {{their}} ability to access the general education curriculum.",
        },
      ],
      examples: [
        "Summary: The evaluation results indicate that [STUDENT] demonstrates age- and grade-level motor skills that support his access to the school curriculum. His fine motor, gross motor and sensory processing skills do not significantly limit his academic success. Functionally, he is able to write his first and last name, color within a half-inch border, cut along a curved line, draw a person with six body parts, and copy a short sentence from the board. Formal assessment shows that his visual-motor integration falls within the average range and his motor coordination in the above-average range. Additionally, his classroom teacher reported that his sensory processing is within typical ranges across all areas. At this time, there are no motor or sensory concerns that significantly impact his ability to access the general education curriculum.",
      ],
      notesHint: "The main findings from each assessment, in a few lines.",
    };
  }
  const blocks: Block[] = [];
  blocks.push({
    kind: "para", id: "fine-motor",
    label: "Fine Motor",
    text: "Based on the results of the [[assessments used]], {{student}} demonstrates [[fine motor and visual-motor findings]] that [[impact on access to education]]. Specifically, {{they}} demonstrates difficulty with [[areas of difficulty]]. These challenges [[impact on classroom participation]].",
  });
  if (setup.assessments.spm2 || setup.assessments.teacher) {
    blocks.push({
      kind: "para", id: "sensory", generated: true, grid: "spm2",
      label: "Sensory",
      text: `Based on the results of the ${setup.assessments.spm2 ? "Sensory Processing Measure-2 School Form and teacher report" : "[[sensory assessments used]]"}, {{their}} sensorimotor skills are ${(setup.assessments.spm2 && spmSummaryPhrase(setup.ratings.spm2 ?? {}, gridFor("spm2", o))) || "[[results by scale]]"}. Within the classroom environment, {{they}} [[sensory behaviors]]. {{They}} would benefit from [[sensory support]] to [[purpose]].`,
    });
  }
  return {
    id: "summary",
    title: "Evaluation Summary",
    blocks,
    examples: [
      "Fine Motor: Based on the results of the informal fine motor screening, [STUDENT] demonstrates fine motor and visual-motor delays that impact her ability to complete written work and craft activities with her class. Specifically, she demonstrates difficulty with letter sizing, spacing between words, cutting curved lines, and turning the paper with her helper hand. She tires after a few lines of writing and asks to stop. These challenges impact her classroom participation, as she finishes fewer written responses than her peers and avoids art activities that involve scissors.",
      "Sensory: Based on the results of the Sensory Processing Measure-2 School Form and teacher report, her sensorimotor skills are affected with Severe Difficulties for Hearing and Body Awareness and Moderate Difficulties for Touch and Social Participation. Within the classroom environment, she covers her ears during noisy transitions and stands too close to classmates in line. She would benefit from sensory supports to stay regulated during transitions and group work.",
      "Summary: Overall, she demonstrates steady self-regulation, willing participation in class, and functional typing skills for longer written work. She showed improvement in letter sizing during handwriting, though legibility is still affected by uneven spacing between words. Continued access to a laptop for assignments longer than a paragraph is recommended, alongside motor supports including paper with a highlighted writing zone, a slant board, and a short finger warm-up before writing tasks.",
    ],
    notesHint: "The main findings from each assessment and how they affect the student in class, in a few lines.",
  };
}

// ---------- annual review ----------

const CLOSING =
  "Occupational Therapy in the school environment is a related service. A related service is provided when a student demonstrates a level of impairment to such a degree that they require the support of a specialist in order to access their education program. School-based OT must be educationally relevant with the focus on promoting functional independence or participation within the school environment.";

const STANDARDS: Record<GoalArea, { label: string; text: string }> = {
  writing: { label: "Writing", text: "WLP.1.1. Independently print legible letters, numerals, and punctuation on grade-level appropriate lined paper." },
  cutting: {
    label: "Cutting",
    text: "Fine motor skills: F2.2 Apply movement concepts to specific movement situations. Uses crayons, markers, pencils independently; uses dough/clay tools; uses scissors.",
  },
  selfcare: { label: "Self care", text: "Standards Based Life Skill Curriculum Intermediate: Undress and dress self, including buttons and fasteners." },
};

function annualSections(setup: ReportSetup, o?: TemplateOverrides): ReportSection[] {
  const out: ReportSection[] = [];
  out.push({
    id: "plop-header",
    title: "Present Level of Performance",
    blocks: [
      { kind: "para", id: "reported-by", label: "Occupational Therapy", text: "Reported by [[your name and credentials]]" },
      { kind: "subheading", id: "h-record", text: "Record review including goals and progress" },
      { kind: "para", id: "record-review", text: "[[Paste the record review and progress toward goals from last year's review, then update it]]" },
      { kind: "subheading", id: "h-present", text: "Present Levels of Performance" },
    ],
    examples: [],
  });
  out.push(...assessmentSections(setup, o));
  if (setup.concerns) {
    out.push({
      id: "next-steps",
      title: "Next Steps",
      blocks: [
        {
          kind: "para", id: "next-steps",
          label: "Next Steps",
          text: "To support {{student}}'s continued progress toward full academic participation, {{they}} requires [[specialized instruction and supports::supports]] to improve {{their}} [[skill areas::skillAreas]]. This will build {{their}} foundational skills to participate in academic activities.",
        },
        { kind: "para", id: "closing", text: CLOSING },
      ],
      examples: [
        "Next Steps: To support her continued progress toward full academic participation, she requires specialized instruction and adapted paper to improve her handwriting, self help and sensory processing skills. This will build her foundational skills to participate in academic activities.",
      ],
      notesHint: "The supports the student needs next and the skill areas they target.",
    });
    out.push({
      id: "impact",
      title: "Impact of Disability Statement",
      blocks: [
        {
          kind: "para", id: "impact",
          label: "Motor",
          text: "{{student}}'s [[disability category::disability]] impacts {{their}} [[skill areas affected::skillAreas]]. These deficits affect {{their}} ability to [[classroom tasks affected]]. [[Sensory or self-help impact, if any]]. These impacts limit {{their}} timely completion of classwork and full participation in age-appropriate classroom tasks.",
        },
      ],
      examples: [
        "Motor: [STUDENT]'s disability affects her written expression and her ability to produce legible written work at the pace of her class. She requires specialized support for fine motor and visual-motor skills to take part in classroom writing tasks and to use her laptop for longer assignments.",
        "[STUDENT]'s sensory processing skills indicate a continued need for indirect Occupational Therapy services. She requires support for her sensory processing needs and accommodations, and for her fine motor skills to be monitored in class.",
        "[STUDENT]'s disability impacts his fine motor skills, self-help skills, and sensory processing skills in the classroom. His fine motor deficits impact his ability to show what he knows through written work. These fine motor and self-care limitations slow his transitions between activities and his set-up for lunch, which shortens his instructional time. His sensory processing skills affect his attention when participating within the classroom environment, as he covers his ears during loud activities and leaves his seat to seek movement. These impacts limit his timely completion of classwork and full participation in age-appropriate classroom tasks.",
        "In the area of motor skills, [STUDENT]'s Developmental Delay impacts her fine motor skills, bilateral coordination, visual-spatial organization and postural control. These deficits affect her ability to complete written work legibly and efficiently, including keeping letters on the line, leaving space between words, and copying diagonal shapes, to turn the paper smoothly during cutting tasks, and to keep an upright seated posture. These impacts limit her timely completion of classwork and full participation in age-appropriate classroom tasks.",
      ],
      notesHint: "The disability category, the skill areas affected, and the classroom tasks it affects.",
    });
    out.push({
      id: "service",
      title: "Service Delivery Statement",
      blocks: [
        {
          kind: "para", id: "service",
          text: "Occupational Therapy services will be provided by a licensed Registered Occupational Therapist or by a Certified Occupational Therapy Assistant under the supervision of a Registered Occupational Therapist. [[minutes and frequency::minutes]] of occupational therapy will be provided [[inside or outside the classroom::location]] to address [[skill areas::skillAreas]]. Services may be 1:1 or within a small group.",
        },
      ],
      examples: [
        "60 minutes monthly of occupational therapy will be provided inside the classroom to address handwriting, cutting and self help skills. Services may be 1:1 or within a small group.",
      ],
      notesHint: "Minutes and frequency, where services happen, and the skill areas.",
    });
    const goal: Block[] = [
      {
        kind: "para", id: "goal-frame", generated: true,
        text: `By [[month::month]] of [[year::year]], after given direct instruction in Fine Motor skill development, {{student}} will meet the following [[number met::objectivesMet]] out of ${Math.max(1, setup.objectives)} objectives on [[percent::percent]]% of opportunities OR over [[data collection dates::dataDates]] data collection dates:`,
      },
    ];
    for (let i = 0; i < Math.max(1, setup.objectives); i++) goal.push({ kind: "numbered", id: `objective${i + 1}`, text: "[[objective]]" });
    if (setup.goalAreas.length) {
      goal.push({ kind: "subheading", id: "h-standards", text: "Related Standards" });
      for (const a of setup.goalAreas) goal.push({ kind: "bullet", id: `standard-${a}`, label: STANDARDS[a].label, text: STANDARDS[a].text });
    }
    out.push({
      id: "goal",
      title: "Physical Motor Goal",
      blocks: goal,
      examples: [
        "[STUDENT] will improve fine motor cutting skills needed to manage classroom paper tasks by accurately cutting along a curved line within 1/4 inch of the boundary line.",
        "[STUDENT] will fasten the top button of her coat and engage the zipper pin, given a visual sequence card and no more than one verbal cue.",
        "[STUDENT] will improve visual motor skills needed to access written work by legibly copying letters and shapes with slanted lines (i.e. triangle, X, R, K, Q, Y, y).",
      ],
      notesHint: "The goal date, criteria, and what each objective should target.",
    });
  } else {
    out.push({
      id: "ending",
      title: "Ending",
      blocks: [
        {
          kind: "para", id: "ending",
          text: "Record review and analysis of the teacher rating checklist form indicates that {{student}} demonstrates age/grade level motor skills which supports access to the curriculum. {{Their}} fine and gross motor skills do not significantly limit {{their}} academic success. At this time, there are no motor concerns that significantly impact {{their}} ability to access the general education curriculum.",
        },
        { kind: "para", id: "closing", text: CLOSING },
      ],
      examples: [],
    });
  }
  return out;
}

/** The sections of a report, in order, for this setup, with the writer's own template edits laid over. */
export function otReportSections(setup: ReportSetup, o?: TemplateOverrides): ReportSection[] {
  const built = setup.reportType === "annual" ? annualSections(setup, o) : [...assessmentSections(setup, o), summarySection(setup, o)];
  return applyBlockOverrides(built, o);
}

export const OT_REPORT_TITLE: Record<ReportSetup["reportType"], string> = {
  evaluation: "Occupational Therapy Evaluation Report",
  annual: "Occupational Therapy Annual Review",
};
