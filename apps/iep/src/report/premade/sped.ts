import type { GridDef } from "../grids";
import { blankPack, type PackAssessment, type PackSection, type TemplatePack } from "../pack";

/**
 * A ready-made special education teacher report template: present levels in
 * reading, writing and math, a classroom checklist, work samples, behavior
 * and accommodations. Generic school wording with blanks for everything the
 * writer knows; the examples are fictional and only ever shown to an AI
 * prompt as style samples.
 */

function performanceGrid(): GridDef {
  return {
    id: "performance", title: "Rate each classroom task", layout: "byGroup", blank: "[[ratings for this group]]",
    levels: [
      { value: "independent", label: "Independent", sentence: "{Items} {was} done independently." },
      { value: "prompted", label: "With a prompt", sentence: "A reminder or prompt was needed for {items}." },
      { value: "help", label: "With adult help", sentence: "Adult help was needed for {items}." },
      { value: "notyet", label: "Not yet", sentence: "{Items} {was} not yet seen, even with help." },
    ],
    groups: [
      { id: "work", label: "Work habits", rows: [{ id: "starting", label: "starting assignments" }, { id: "finishing", label: "finishing assignments on time" }, { id: "directions", label: "following written directions" }, { id: "group", label: "working in a group" }] },
      { id: "materials", label: "Materials and organization", rows: [{ id: "bringing", label: "bringing materials to class" }, { id: "binder", label: "keeping a folder or binder organized" }, { id: "homework", label: "turning in homework" }, { id: "planner", label: "writing assignments in a planner" }] },
      { id: "participation", label: "Participation", rows: [{ id: "hand", label: "raising a hand to answer" }, { id: "asking", label: "asking for help when stuck" }, { id: "seat", label: "staying in the work area" }, { id: "transitions", label: "moving between activities" }] },
    ],
  };
}

function reading(): PackAssessment {
  const section = (id: string, grades: PackSection["when"], text: string, examples: string[]): PackSection => ({
    id, title: "Reading", when: grades,
    blocks: [
      { kind: "para", id: "levels", text },
      { kind: "para", id: "comprehension", text: "Comprehension: when text is read to {{them}}, {{they}} [[answers literal questions, inferential questions, or retells]]. When reading on {{their}} own, {{they}} [[what changes]]. {{Their}} strongest reading skills are [[strengths::readingSkills]], and the skills that need instruction are [[needs::readingSkills]]." },
    ],
    examples,
    notesHint: "Benchmark scores and levels, decoding, fluency and comprehension, with strengths and needs.",
  });
  return {
    id: "reading", label: "Reading present levels",
    sections: [
      section("reading-k1", { grades: ["k1"] }, "{{student}} names [[number]] of 26 uppercase and [[number]] of 26 lowercase letters and gives the sounds for [[number]] letters. {{They}} reads [[number]] of the first [[number]] sight words and [[can or cannot]] blend sounds to read a three-letter word. On the [[benchmark assessment]], {{they}} scored [[score]], which is [[at, below or above]] the grade-level benchmark of [[benchmark]].",
        ["[STUDENT] names 24 of 26 uppercase and 19 of 26 lowercase letters and gives the sounds for 12 letters. He reads 8 of the first 25 sight words and cannot yet blend sounds to read a three-letter word. On the fall benchmark assessment, he scored 10 sounds per minute, which is below the grade-level benchmark of 20. Comprehension: when text is read to him, he answers literal questions and retells the main events in order."]),
      section("reading-g25", { grades: ["g25"] }, "{{student}} reads [[number]] words correct per minute with [[percent]]% accuracy on a grade [[grade]] passage, compared with the grade-level benchmark of [[benchmark]] words per minute. {{Their}} instructional reading level is [[level]]. Errors are mostly [[types of errors: vowel sounds, multisyllabic words, skipped words]]. {{They}} reads [[with or without]] expression and [[self-corrects or does not]].",
        ["[STUDENT] reads 62 words correct per minute with 93% accuracy on a grade 3 passage, compared with the grade-level benchmark of 90 words per minute. Her instructional reading level is late second grade. Errors are mostly multisyllabic words and vowel teams. She reads without expression and rarely self-corrects. Comprehension: when text is read to her, she answers literal and inferential questions. When reading on her own, she answers literal questions only."]),
      section("reading-older", { grades: ["g68", "g912"] }, "{{student}} reads [[number]] words correct per minute with [[percent]]% accuracy on a grade [[grade]] passage, and {{their}} instructional reading level is [[level]]. With grade-level text {{they}} [[decodes most words, or which word types are hard]] and [[how the student uses strategies: rereading, context, asking]]. On class reading assignments {{they}} [[finishes with or without text-to-speech, extra time, or a partner]].",
        ["[STUDENT] reads 105 words correct per minute with 96% accuracy on a grade 5 passage, and his instructional reading level is fifth grade. With grade-level text he decodes most words but slows on content vocabulary and reads the passage twice before answering. On class reading assignments he finishes with text-to-speech and extra time. Comprehension: when text is read to him, he answers inferential questions and summarizes well."]),
    ],
  };
}

function writing(): PackAssessment {
  return {
    id: "writing", label: "Writing present levels",
    sections: [
      {
        id: "writing", title: "Written Expression",
        blocks: [
          { kind: "para", id: "sample", text: "Given [[a prompt or task]] and [[minutes]] minutes, {{student}} wrote [[number]] sentences. {{Their}} sentences were [[simple, compound, or fragments]] and the ideas were [[on topic and in order, or how they were organized]]. On the [[rubric or benchmark]], the sample scored [[score]] of [[total]]." },
          { kind: "para", id: "conventions", text: "Spelling: {{they}} spells [[grade-level words, sight words, or phonetically]] and misspelled [[number]] of [[number]] words. Capitals and end punctuation were used [[consistently, sometimes, or rarely]]. {{They}} [[writes by hand legibly, types, or uses speech-to-text]]." },
          { kind: "para", id: "process", text: "With a graphic organizer or sentence starters, {{they}} [[what changes]]. {{They}} [[plans, revises and edits on {{their}} own, or needs prompting to]]." },
        ],
        examples: ["Given a picture prompt and 15 minutes, [STUDENT] wrote four sentences. His sentences were simple and the ideas were on topic but out of order. On the district writing rubric, the sample scored 2 of 4. Spelling: he spells sight words correctly and other words phonetically, and misspelled 6 of 30 words. Capitals and end punctuation were used sometimes. With a graphic organizer, he wrote seven sentences in order."],
        notesHint: "What the student wrote, sentence structure, organization, spelling and conventions, and what helps.",
      },
    ],
  };
}

function math(): PackAssessment {
  return {
    id: "math", label: "Math present levels",
    sections: [
      {
        id: "math", title: "Mathematics",
        blocks: [
          { kind: "para", id: "benchmark", text: "On the [[benchmark assessment]], {{student}} scored [[score]], which is [[at, below or above]] the grade-level benchmark of [[benchmark]]. {{Their}} instructional level in math is [[level]]." },
          { kind: "para", id: "computation", text: "Computation: {{they}} solves [[which operations]] with [[percent]]% accuracy and [[knows, or is still learning]] [[which facts]]. Errors are mostly [[regrouping, place value, fact recall, or sign errors]]. The skills that need instruction are [[needs::mathSkills]]." },
          { kind: "para", id: "problems", text: "Problem solving: with a word problem read aloud, {{they}} [[picks the operation, sets up the problem, or needs help to]]. {{They}} uses [[a number line, manipulatives, a calculator, or no tools]]." },
        ],
        examples: ["On the winter benchmark assessment, [STUDENT] scored 18 of 40, which is below the grade-level benchmark of 28. Her instructional level in math is early third grade. Computation: she solves addition and subtraction with regrouping with 80% accuracy and is still learning multiplication facts past the fives. Errors are mostly fact recall. Problem solving: with a word problem read aloud, she picks the operation but needs help to set up two-step problems. She uses a multiplication chart."],
        notesHint: "Benchmark scores, computation accuracy, facts, problem solving and the tools the student uses.",
      },
    ],
  };
}

function classroom(): PackAssessment {
  return {
    id: "classroom", label: "Classroom performance checklist", grid: performanceGrid(),
    sections: [
      {
        id: "classroom", title: "Classroom Performance Checklist",
        blocks: [
          { kind: "para", id: "intro", text: "{{student}}'s [[who completed it::completedBy]] rated how {{they}} handles everyday classroom tasks as independent, with a prompt, with adult help, or not yet." },
          { kind: "grid", id: "grid-performance", grid: "performance" },
          { kind: "para", id: "comments", text: "The teacher added that {{they}} [[comments written on the checklist]]." },
        ],
        examples: ["[STUDENT]'s general education teacher rated how he handles everyday classroom tasks. Starting assignments and working in a group were done independently. A reminder or prompt was needed for finishing assignments on time and following written directions. Adult help was needed for keeping a folder or binder organized and turning in homework. The teacher added that he works hard when the task is clear and loses track of multi-page assignments."],
        notesHint: "Who filled in the checklist, the ratings, and any comments they wrote.",
      },
    ],
  };
}

function workSamples(): PackAssessment {
  return {
    id: "samples", label: "Work samples",
    sections: [
      {
        id: "samples", title: "Work Samples",
        blocks: [
          { kind: "para", id: "samples", text: "Work samples from [[subjects]] over [[time span]] were reviewed. {{student}}'s [[type of sample]] showed [[what the work showed: accuracy, completeness, neatness, the kind of errors]]. Compared with the class, {{their}} work was [[how it compared]]. Work done with [[a support or accommodation]] was [[how it differed]]." },
        ],
        examples: ["Work samples from reading and math over six weeks were reviewed. [STUDENT]'s math worksheets showed the first half completed with 90% accuracy and the second half left blank. Compared with the class, her work was neat but took twice as long. Work done with chunked assignments was finished and matched the class average."],
        notesHint: "Which samples you looked at and what they showed, including work done with supports.",
      },
    ],
  };
}

function behavior(): PackAssessment {
  return {
    id: "behavior", label: "Behavior and executive function observation",
    sections: [
      {
        id: "behavior", title: "Behavior and Executive Function",
        blocks: [
          { kind: "para", id: "observation", text: "{{student}} was observed in [[class or setting]] during [[the activity]]. {{They}} was on task for [[on-task percent::percent]]% of the time and [[what the student did when off task]]. {{They}} responded to redirection by [[how]]." },
          { kind: "para", id: "executive", text: "Executive function: {{they}} needs support with [[skills::executiveFunction]]. {{They}} does best when [[the conditions that help: short tasks, a checklist, a timer, a quiet spot]]. Behavior that gets in the way of learning includes [[behaviors, how often, and what sets them off, or none]]." },
        ],
        examples: ["[STUDENT] was observed in science during a lab. He was on task for 65% of the time and wandered to other groups when his group was waiting for materials. He responded to redirection by returning right away. Executive function: he needs support with starting tasks, organizing materials and checking work. He does best when the steps are listed on the board and the task is broken into parts. Behavior that gets in the way of learning includes calling out, about five times per period."],
        notesHint: "What you saw during the observation, executive function needs, what helps, and any interfering behavior.",
      },
    ],
  };
}

function accommodationsInUse(): PackAssessment {
  return {
    id: "accommodations", label: "Accommodations in use",
    sections: [
      {
        id: "accommodations", title: "Accommodations in Use",
        blocks: [
          { kind: "para", id: "inuse", text: "{{student}} currently uses [[accommodations::accommodations]]. The most helpful have been [[which, and what they change]]. [[Any accommodation that has not helped, or that the student does not use]]. {{They}} [[asks for the accommodations, uses them when offered, or needs reminders]]." },
        ],
        examples: ["[STUDENT] currently uses extended time, directions read aloud and a copy of class notes. The most helpful have been the class notes, which let her follow the lesson instead of copying. The calculator has not helped because she does not yet know which operation to use. She uses the accommodations when offered but does not ask for them."],
        notesHint: "The accommodations in place, which ones help, and how the student uses them.",
      },
    ],
  };
}

function aroundSections(): PackSection[] {
  return [
    {
      id: "present-levels", title: "Present Levels of Academic Achievement and Functional Performance", place: "before", when: { reportType: "annual" },
      blocks: [
        { kind: "para", id: "reported-by", label: "Special Education", text: "Reported by [[your name and role]]" },
        { kind: "subheading", id: "h-progress", text: "Progress on current goals" },
        { kind: "para", id: "progress", text: "[[Each current goal, the latest data, and whether it was met]]" },
        { kind: "subheading", id: "h-present", text: "Present levels" },
        { kind: "para", id: "present", text: "{{student}} currently receives [[minutes and frequency::minutes]] of specially designed instruction in [[areas::skillAreas]] [[where::location]]. {{They}} now [[what the student can do in each area of need, with data]]." },
      ],
      examples: ["[STUDENT] currently receives 90 minutes weekly of specially designed instruction in reading decoding and reading fluency outside the classroom. He now reads 78 words correct per minute on a grade 3 passage, up from 55 in the fall, and decodes two-syllable words with 85% accuracy."],
      notesHint: "The goals from the current IEP, the data on each, and what the student can do now.",
    },
    {
      id: "summary-concerns", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: true },
      blocks: [
        { kind: "para", id: "summary", text: "The present levels, checklist, work samples and observation show that {{student}} is performing [[below grade level in which areas, by how much]]. [[The main findings in a few lines]]. These needs affect {{their}} ability to [[what is hard at school]]. {{They}} needs specially designed instruction in [[areas of need::skillAreas]]." },
        { kind: "para", id: "strengths", text: "Strengths include [[what the student does well]]." },
      ],
      examples: ["The present levels, checklist, work samples and observation show that [STUDENT] is performing about two grade levels below in reading and one in written expression. His decoding breaks down on multisyllabic words, his fluency is below benchmark, and his writing is short and out of order without an organizer. These needs affect his ability to read grade-level text in every subject. He needs specially designed instruction in reading decoding, reading fluency and written expression. Strengths include his math skills and his listening comprehension."],
      notesHint: "The main findings, the areas of need and strengths.",
    },
    {
      id: "summary-none", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: false },
      blocks: [{ kind: "para", id: "summary", text: "The present levels, checklist, work samples and observation show that {{student}} is performing [[at grade level, or close to it]] and making progress with the supports in general education. [[The main findings in a few lines]]. Specially designed instruction is not recommended at this time. Suggestions for the classroom include [[accommodations::accommodations]]." }],
      examples: ["The present levels, checklist, work samples and observation show that [STUDENT] is performing at grade level in reading and math and making progress with the supports in general education. Her writing is close to grade level with a graphic organizer. Specially designed instruction is not recommended at this time. Suggestions for the classroom include a graphic organizer and frequent checks for understanding."],
      notesHint: "The findings that show the student is at grade level, and suggestions for the classroom.",
    },
    {
      id: "next-steps", title: "Next Steps", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "next-steps", text: "The IEP team will meet to review this report with {{student}}'s family and decide on eligibility under [[disability category::disability]], services and goals. [[Recommendations for the team to consider]]. Please contact the special education teacher with any questions about this report." }],
      examples: ["The IEP team will meet to review this report with [STUDENT]'s family and decide on eligibility under Specific Learning Disability, services and goals. The team may want to consider a structured literacy program and text-to-speech for science and social studies."],
      notesHint: "What the team will decide and your recommendations.",
    },
    {
      id: "impact", title: "Impact of Disability Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "impact", text: "{{student}}'s [[disability or area of difficulty]] affects {{their}} ability to [[what is hard at school: reading grade-level text, writing to show learning, completing math work, staying organized]]. Without specially designed instruction, {{they}} [[what would happen in the general education setting]]." }],
      examples: ["[STUDENT]'s reading disability affects his ability to read grade-level text in every subject and to finish assignments in the time given. Without specially designed instruction, he would continue to fall behind in reading and would miss content in science and social studies."],
      notesHint: "How the disability affects learning and participation.",
    },
    {
      id: "service", title: "Service Delivery Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "service", text: "{{student}} will receive [[minutes and frequency::minutes]] of specially designed instruction in [[areas of need::skillAreas]] [[where::location]]. Instruction will include [[programs, group size and methods]]. Accommodations will include [[accommodations::accommodations]]." }],
      examples: ["[STUDENT] will receive 90 minutes weekly of specially designed instruction in reading decoding and reading fluency outside the classroom. Instruction will include a structured literacy program in a group of three. Accommodations will include extended time, text-to-speech and a copy of class notes."],
      notesHint: "Minutes, frequency, location, areas, programs and accommodations.",
    },
    {
      id: "goal", title: "Academic Goal", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "goal", text: "Area: [[goal area::skillAreas]]. By [[month::month]] [[year::year]], given [[the condition or materials]], {{student}} will [[the skill and the level]] with [[accuracy::percent]]% accuracy in [[data points::dataDates]] data collections, as measured by [[how progress is measured]]." },
        { kind: "subheading", id: "h-objectives", text: "Objectives" },
        { kind: "numbered", id: "objective1", text: "[[objective]]" },
        { kind: "numbered", id: "objective2", text: "[[objective]]" },
        { kind: "numbered", id: "objective3", text: "[[objective]]" },
      ],
      examples: ["Area: reading fluency. By May of next school year, given a grade 3 passage, [STUDENT] will read 90 words correct per minute with 95% accuracy in 3 out of 4 data collections, as measured by curriculum-based measurement. Objectives: he will read 65 words correct per minute; he will read 78 words correct per minute; he will read 90 words correct per minute."],
      notesHint: "The goal area, the condition, the target skill, the level of accuracy, and three steps toward it.",
    },
    {
      id: "ending", title: "Ending", place: "after", when: { reportType: "annual", concerns: false },
      blocks: [{ kind: "para", id: "ending", text: "{{student}} has met {{their}} goals and is performing at grade level with the supports available in general education. Specially designed instruction is no longer needed for {{them}} to make progress. [[Any suggestions for the classroom going forward]]. With the team's agreement, special education services will end. Please contact the special education teacher with any questions about this report." }],
      examples: ["[STUDENT] has met her goals and is performing at grade level with the supports available in general education. Specially designed instruction is no longer needed for her to make progress. Her teachers can keep offering a graphic organizer for longer writing tasks. With the team's agreement, special education services will end."],
      notesHint: "Which goals were met and any suggestions for the classroom.",
    },
  ];
}

export function spedPack(): TemplatePack {
  const base = blankPack("Special education");
  return {
    version: 1,
    titles: { evaluation: "Special Education Evaluation Report", annual: "Special Education Annual Review" },
    assessments: [reading(), writing(), math(), classroom(), workSamples(), behavior(), accommodationsInUse()],
    sections: aroundSections(),
    lists: {
      ...base.lists,
      completedBy: { options: ["general education teacher", "classroom teacher", "special education teacher", "co-teacher", "classroom aide"] },
      skillAreas: { multi: true, options: ["reading decoding", "reading fluency", "reading comprehension", "written expression", "spelling", "math calculation", "math problem solving", "organization and work completion", "self-regulation", "social skills"] },
      readingSkills: { multi: true, options: ["letter names and sounds", "phonological awareness", "decoding", "sight words", "reading fluency", "vocabulary", "literal comprehension", "inferential comprehension", "summarizing"] },
      writingSkills: { multi: true, options: ["sentence structure", "organization of ideas", "spelling", "capitals and punctuation", "handwriting", "typing", "planning and revising"] },
      mathSkills: { multi: true, options: ["number sense", "addition and subtraction facts", "multiplication and division facts", "regrouping", "place value", "fractions and decimals", "word problems", "multi-step problems", "measurement and geometry"] },
      instructionalLevel: { options: ["independent level", "instructional level", "frustration level"] },
      executiveFunction: { multi: true, options: ["starting tasks", "staying on task", "organizing materials", "following multi-step directions", "managing time", "shifting between activities", "checking work", "asking for help"] },
      concernAreas: { multi: true, options: ["reading grade-level text", "written output", "math facts", "work completion", "organization", "following directions", "attention during lessons", "homework", "test taking"] },
      supports: { multi: true, options: ["a structured literacy program", "a math intervention", "co-teaching", "a resource period", "a behavior plan", "a check-in routine", "assistive technology"] },
      accommodations: { multi: true, options: ["extended time", "directions read aloud", "a copy of class notes", "chunked assignments", "a graphic organizer", "a calculator", "text-to-speech", "speech-to-text", "preferential seating", "frequent checks for understanding", "a visual schedule", "small group testing", "reduced number of problems"] },
    },
  };
}
