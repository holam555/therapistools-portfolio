import type { Block, GoalArea, ReportSection, ReportSetup } from "./types";
import { screenItemsFor } from "./ot-screen";
import { spmScaleList, spmSummaryPhrase } from "./spm";
import { levelLine } from "./grids";
import { applyBlockOverrides, applyScreenOverrides, gridFor, type TemplateOverrides } from "./overrides";

/**
 * Occupational therapy report template: the generic sample that ships with
 * the tool. It has the shape of a school OT evaluation or annual review,
 * written in plain wording with [[blanks]] for what differs per student and
 * fictional sample sentences that only feed the AI prompts for tone. A
 * writer's own wording lives in their template edits and their account,
 * never here. {{student}} appears once at the start of each section, then
 * pronouns.
 */

// ---------- assessments (shared by both report types; only the screen depends on grade) ----------

function teacherSection(setup: ReportSetup): ReportSection {
  const a = setup.teacherAreas;
  const any = a.fine || a.gross || a.sensory;
  if (!any) {
    return {
      id: "teacher",
      title: "Teacher Rating Checklist",
      blocks: [
        {
          kind: "para", id: "teacher-none",
          text: "The teacher rating checklist indicates that {{student}} demonstrates fine motor skills within age and grade expectations for handwriting, using classroom tools and managing belongings. Gross motor skills are within expectations for moving around the school. No sensory concerns that interfere with instruction or work completion were reported.",
          examples: [
            "The teacher rating checklist indicates that this student's fine motor, gross motor and sensory skills are within age and grade expectations. Based on the classroom teacher's report, these skills do not limit her access to the curriculum at this time.",
          ],
        },
      ],
      // Samples sit on the paragraph that defines this version of the section (see otReportSections).
      examples: [],
      notesHint: "Anything the teacher noted, if you want to adjust the wording.",
    };
  }
  // One paragraph per area, so each keeps its own blanks whichever areas are ticked.
  const blocks: Block[] = [];
  const opener = "Based on the teacher rating checklist completed by the [[who completed it::completedBy]], {{student}} demonstrates ";
  if (a.fine)
    blocks.push({
      kind: "para", id: "teacher-concerns",
      text: `${opener}[[fine motor difficulties and how often::delayFrequency]], which [[effect on classroom work and independence]]. Areas of concern include [[areas of concern::concernAreas]].`,
    });
  else
    blocks.push({
      kind: "para", id: "teacher-fine-none",
      text: `${opener}fine motor skills within age and grade expectations for handwriting, using classroom tools and managing belongings.`,
    });
  if (a.gross)
    blocks.push({
      kind: "para", id: "teacher-gross",
      text: "Gross motor concerns were also reported: {{they}} [[gross motor difficulties and how often]], which [[effect on moving around the school and physical education]].",
    });
  else blocks.push({ kind: "para", id: "teacher-gross-none", text: "Gross motor skills are within expectations for moving around the school." });
  if (a.sensory)
    blocks.push({
      kind: "para", id: "teacher-sensory",
      text: "The teacher also reported sensory processing concerns, noting that {{they}} [[sensory behaviors the teacher noted]], which [[effect on instruction or work completion]].",
    });
  else blocks.push({ kind: "para", id: "teacher-sensory-none", text: "No sensory concerns that interfere with instruction or work completion were reported." });
  blocks.push({
    kind: "para", id: "teacher-accommodations",
    text: "To support {{their}} needs in the classroom, accommodations such as [[accommodations in use::accommodations]] are in place.",
    examples: [
      "Based on the teacher rating checklist completed by the classroom teacher, [STUDENT] demonstrates fine motor difficulties most of the time, which slow her written work and make it hard to keep her materials organized. Areas of concern include letter size, spacing, cutting and fastening her coat. No gross motor concerns were reported, though the teacher noted that she covers her ears during fire drills. To support her needs in the classroom, accommodations such as wide-ruled paper, a visual checklist for packing up and a quiet spot during assemblies are in place.",
      "Based on the teacher rating checklist completed by the special education teacher, [STUDENT] demonstrates fine motor difficulties some of the time, which affect how much written work he finishes with his class. Areas of concern include pencil grasp, copying from the board and coloring. The teacher also reported sensory processing concerns, noting that he rocks in his chair and leaves his seat often, which interferes with his attention during lessons. To support his needs in the classroom, accommodations such as a wobble cushion, movement breaks and a seat near the teacher are in place.",
      "Based on the teacher rating checklist completed by the physical education teacher, [STUDENT] demonstrates fine motor skills within age and grade expectations for handwriting and managing belongings. Gross motor concerns were also reported: he avoids running games and loses his balance on uneven ground some of the time, which limits his participation in physical education and recess. To support his needs, accommodations such as a peer partner for playground games and extra time on the stairs are in place.",
    ],
  });
  return {
    id: "teacher",
    title: "Teacher Rating Checklist",
    blocks,
    examples: [],
    notesHint: "What the teacher checked on the rating form for each area ticked, and the accommodations in use.",
  };
}

function screenSection(setup: ReportSetup, o?: TemplateOverrides): ReportSection {
  const chosen = applyScreenOverrides(screenItemsFor(setup.grade), setup.grade, o).filter((i) => setup.screenItems.includes(i.id));
  const blocks: Block[] = [{ kind: "para", id: "intro", text: "An informal fine motor screen was completed to look at {{student}}'s fine motor skills." }];
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
    examples: [],
    notesHint: "Your observations for each item you tested, in any order and as rough as you like.",
  };
}

const beerySection: ReportSection = {
  id: "beery",
  title: "Beery-Buktenica Developmental Test of Visual-Motor Integration",
  blocks: [
    {
      kind: "para", id: "intro",
      text: "The Beery-Buktenica Developmental Test of Visual-Motor Integration (6th edition) was administered by [[your name and credentials]]. This test looks at how well a student combines visual and motor skills to copy shapes. The visual perception subtest looks at visual skills alone, and the motor coordination subtest looks at fine motor control alone. {{student}} performed as follows:",
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
      text: "Sensory processing is the way the nervous system takes in information from the senses (touch, taste, smell, sight, hearing, body awareness and movement) and organizes it so a person can respond to what is happening around them. Differences in sensory processing can affect attention, behavior, emotions and how a student takes part in school activities.",
    },
    {
      kind: "para", id: "completed-by",
      text: `The Sensory Processing Measure-2: School form was completed by {{student}}'s teacher to find out which areas of sensory processing affect {{them}} in the classroom. Scales include: ${spmScaleList(grid)}. Each scale is rated as ${joinOr(grid.levels.map((l) => l.label))}. {{Their}} results are as follows:`,
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
      text: "The Sensory Total score combines every scale except Social Participation and Planning and Ideas, and gives one overall picture of sensory processing. Each scale is described below.",
    },
    { kind: "para", id: "def-social", label: "Social Participation", text: "looks at how the student interacts with others and takes part in social situations at school." },
    { kind: "para", id: "def-vision", label: "Vision", text: "looks at how the student responds to what they see, such as seeking or avoiding bright light or busy surroundings, and at visual tracking and visual perception." },
    { kind: "para", id: "def-hearing", label: "Hearing", text: "looks at how the student responds to sound, including sensitivity to noise, difficulty picking out speech from background sound, and seeking out sounds." },
    { kind: "para", id: "def-touch", label: "Touch", text: "looks at how the student responds to touch and texture, including avoiding or seeking touch and reacting strongly to messy or unexpected contact." },
    { kind: "para", id: "def-body", label: "Body Awareness", text: "looks at the student's sense of where the body is in space (proprioception), such as using the right amount of force and keeping a comfortable distance from others." },
    { kind: "para", id: "def-planning", label: "Planning and Ideas", text: "looks at how the student plans and carries out new or multi-step movements." },
    { kind: "para", id: "def-balance", label: "Balance and Motion", text: "looks at how the student responds to movement and keeps balance and posture during school activities." },
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
          text: "The evaluation results indicate that {{student}} demonstrates fine motor, gross motor and sensory processing skills within age and grade expectations, which support {{their}} access to the school curriculum. Functionally, {{they}} is able to [[functional skills observed]]. [[Formal assessment results]]. [[Teacher report on sensory processing]]. At this time, there are no motor or sensory concerns that significantly affect {{their}} access to the general education curriculum.",
          examples: [
            "Summary: The evaluation results indicate that [STUDENT] demonstrates fine motor, gross motor and sensory processing skills within age and grade expectations, which support his access to the school curriculum. Functionally, he is able to write his name legibly, copy a sentence from the board, cut out simple shapes and open his lunch containers on his own. Formal assessment placed his visual-motor integration in the average range. His teacher reported typical sensory processing across all areas. At this time, there are no motor or sensory concerns that significantly affect his access to the general education curriculum.",
          ],
        },
      ],
      examples: [],
      notesHint: "The main findings from each assessment, in a few lines.",
    };
  }
  const blocks: Block[] = [];
  blocks.push({
    kind: "para", id: "fine-motor",
    label: "Fine Motor",
    text: "Based on the results of the [[assessments used]], {{student}} demonstrates [[fine motor and visual-motor findings]] that [[effect on access to the curriculum]]. Specifically, {{they}} has difficulty with [[areas of difficulty]]. These challenges [[effect on classroom participation]].",
    examples: [
      "Fine Motor: Based on the results of the informal fine motor screen, [STUDENT] demonstrates fine motor and visual-motor delays that affect her ability to finish written work and craft activities with her class. Specifically, she has difficulty with letter size, spacing between words, cutting curves and holding the paper with her helper hand. These challenges affect her classroom participation, as she completes fewer written responses than her peers and avoids activities that involve scissors.",
      "Sensory: Based on the results of the Sensory Processing Measure-2 School form and teacher report, her sensory processing skills are affected with Moderate Difficulties for Hearing and Touch. In the classroom, she covers her ears during noisy transitions and avoids glue and paint. She would benefit from sensory supports to stay settled during transitions and group work.",
      "Summary: Overall, she shows steady self-regulation, willing participation and functional typing for longer written work. Her letter size has improved, though legibility is still affected by uneven spacing. Continued access to a laptop for assignments longer than a paragraph is recommended, with paper that has a highlighted writing line and a short hand warm-up before writing.",
    ],
  });
  if (setup.assessments.spm2 || setup.assessments.teacher) {
    blocks.push({
      kind: "para", id: "sensory", generated: true, grid: "spm2",
      label: "Sensory",
      text: `Based on the results of the ${setup.assessments.spm2 ? "Sensory Processing Measure-2 School form and teacher report" : "[[sensory assessments used]]"}, {{their}} sensory processing skills are ${(setup.assessments.spm2 && spmSummaryPhrase(setup.ratings.spm2 ?? {}, gridFor("spm2", o))) || "[[results by scale]]"}. In the classroom, {{they}} [[sensory behaviors observed]]. {{They}} would benefit from [[sensory supports]] to [[purpose]].`,
    });
  }
  return {
    id: "summary",
    title: "Evaluation Summary",
    blocks,
    examples: [],
    notesHint: "The main findings from each assessment and how they affect the student in class, in a few lines.",
  };
}

// ---------- annual review ----------

const CLOSING =
  "School-based occupational therapy is a related service. It is provided when a student needs the support of a specialist to take part in and benefit from their education program. Services focus on functional skills and participation within the school setting.";

const STANDARDS: Record<GoalArea, { label: string; text: string }> = {
  writing: { label: "Writing", text: "[[the handwriting or written-expression standard this goal supports]]" },
  cutting: { label: "Cutting", text: "[[the fine motor or tool-use standard this goal supports]]" },
  selfcare: { label: "Self care", text: "[[the self-care or life-skills standard this goal supports]]" },
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
  out.push(...(setup.concerns ? concernSections(setup) : [ENDING]));
  return out;
}

/** Next steps, impact, service delivery and the goal: for any report where the student has concerns or qualifies. */
function concernSections(setup: ReportSetup): ReportSection[] {
  const out: ReportSection[] = [];
  {
    // Kept in one block so the four sections read as a unit.
    out.push({
      id: "next-steps",
      title: "Next Steps",
      blocks: [
        {
          kind: "para", id: "next-steps",
          label: "Next Steps",
          text: "To support {{student}}'s continued progress toward full participation in {{their}} school day, {{they}} requires [[specialized instruction and supports::supports]] to improve {{their}} [[skill areas::skillAreas]]. This will build the foundational skills {{they}} needs for academic activities.",
        },
        { kind: "para", id: "closing", text: CLOSING },
      ],
      examples: [
        "Next Steps: To support her continued progress toward full participation in her school day, she requires specialized instruction and adapted paper to improve her handwriting and self-help skills. This will build the foundational skills she needs for academic activities.",
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
          text: "{{student}}'s [[disability category::disability]] affects {{their}} [[skill areas affected::skillAreas]]. These difficulties affect {{their}} ability to [[classroom tasks affected]]. [[Sensory or self-help effects, if any]]. These effects limit {{their}} timely completion of classwork and full participation in the classroom tasks expected at {{their}} grade.",
        },
      ],
      examples: [
        "Motor: [STUDENT]'s disability affects her written expression and her ability to produce legible work at the pace of her class. She requires specialized support for fine motor and visual-motor skills to take part in classroom writing tasks and to use her laptop for longer assignments.",
        "[STUDENT]'s sensory processing needs show a continued need for indirect occupational therapy services. She requires support for her sensory accommodations, and her fine motor skills are monitored in class.",
        "[STUDENT]'s disability affects his fine motor, self-help and sensory processing skills in the classroom. His fine motor difficulties affect his ability to show what he knows through written work, and slow his set-up for lunch and his transitions between activities, which shortens his instructional time. His sensory processing affects his attention, as he covers his ears during loud activities and leaves his seat to seek movement. These effects limit his timely completion of classwork and full participation in the classroom tasks expected at his grade.",
      ],
      notesHint: "The disability category, the skill areas affected, and the classroom tasks it affects.",
    });
    out.push({
      id: "service",
      title: "Service Delivery Statement",
      blocks: [
        setup.serviceType === "indirect"
          ? {
              kind: "para", id: "service-indirect",
              text: "{{student}} will receive [[minutes and frequency::minutes]] of indirect occupational therapy services to support [[skill areas::skillAreas]]. These services consist of consulting with {{their}} special education team and general education teachers, with direct check-ins as needed to assess or teach new skills.",
            }
          : {
              kind: "para", id: "service",
              text: "Occupational therapy services will be provided by a licensed occupational therapist, or by a certified occupational therapy assistant under the supervision of an occupational therapist. [[minutes and frequency::minutes]] of occupational therapy will be provided [[inside or outside the classroom::location]] to address [[skill areas::skillAreas]]. Services may be individual or in a small group.",
            },
      ],
      examples: [
        "60 minutes monthly of occupational therapy will be provided inside the classroom to address handwriting, cutting and self-help skills. Services may be individual or in a small group.",
        "[STUDENT] will receive 30 minutes quarterly of indirect occupational therapy services to support her handwriting accommodations and keyboarding. These services consist of consulting with her special education team and general education teachers, with direct check-ins as needed to assess or teach new skills.",
      ],
      notesHint: "Minutes and frequency, direct or indirect, where services happen, and the skill areas.",
    });
    const goal: Block[] = [
      {
        kind: "para", id: "goal-frame", generated: true,
        text: `By [[month::month]] of [[year::year]], given direct instruction in fine motor skill development, {{student}} will meet [[number met::objectivesMet]] of the following ${Math.max(1, setup.objectives)} objectives on [[percent::percent]]% of opportunities or across [[data collection dates::dataDates]] data collection dates:`,
      },
    ];
    for (let i = 0; i < Math.max(1, setup.objectives); i++) goal.push({ kind: "numbered", id: `objective${i + 1}`, text: "[[objective]]" });
    if (setup.goalAreas.length) {
      goal.push({ kind: "subheading", id: "h-standards", text: "Related Standards" });
      for (const a of setup.goalAreas) goal.push({ kind: "bullet", id: `standard-${a}`, label: STANDARDS[a].label, text: STANDARDS[a].text });
    }
    out.push({
      id: "goal",
      title: "Motor Goal",
      blocks: goal,
      examples: [
        "[STUDENT] will cut along a curved line within a quarter inch of the line to complete classroom paper tasks.",
        "[STUDENT] will fasten the top button of her coat and start the zipper, given a picture sequence and no more than one verbal cue.",
        "[STUDENT] will legibly copy letters and shapes with diagonal lines (such as a triangle, X, K and Y) to access written work.",
      ],
      notesHint: "The goal date, criteria, and what each objective should target.",
    });
  }
  return out;
}

const ENDING: ReportSection = {
  id: "ending",
  title: "Ending",
  blocks: [
    {
      kind: "para", id: "ending",
      text: "The teacher rating checklist and record review indicate that {{student}} demonstrates motor skills within age and grade expectations, which support {{their}} access to the curriculum. {{Their}} fine and gross motor skills do not significantly limit {{their}} academic success. At this time, there are no motor concerns that significantly affect {{their}} access to the general education curriculum.",
    },
    { kind: "para", id: "closing", text: CLOSING },
  ],
  examples: [],
};

/** The sections of a report, in order, for this setup, with the writer's own template edits laid over. */
export function otReportSections(setup: ReportSetup, o?: TemplateOverrides): ReportSection[] {
  const built =
    setup.reportType === "annual"
      ? annualSections(setup, o)
      : [...assessmentSections(setup, o), summarySection(setup, o), ...(setup.concerns ? concernSections(setup) : [])];
  // A section with no samples of its own uses its paragraphs' samples, after the writer's edits to each one. The screen's,
  // the teacher checklist's and the summary's samples live on their paragraphs, so each version of those sections keeps its own.
  return applyBlockOverrides(built, o).map((s) => (s.examples.length ? s : { ...s, examples: s.blocks.flatMap((b) => b.examples ?? []) }));
}

export const OT_REPORT_TITLE: Record<ReportSetup["reportType"], string> = {
  evaluation: "Occupational Therapy Evaluation Report",
  annual: "Occupational Therapy Annual Review",
};
