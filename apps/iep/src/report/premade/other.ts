import type { GridDef } from "../grids";
import { blankPack, type PackAssessment, type PackSection, type TemplatePack } from "../pack";

/**
 * A lean, general K-12 report template for any other educator: background, a
 * teacher checklist, an observation, and the usual closing sections. Generic
 * school wording with blanks for everything the writer knows; the examples
 * are fictional and only ever shown to an AI prompt as style samples.
 */

function checklistGrid(): GridDef {
  return {
    id: "checklist", title: "Rate each item", layout: "byLevel", blank: "[[items at this level, or none]]", none: "None", allClear: "typical for every item on the checklist",
    levels: [
      { value: "typical", label: "Typical for grade", sentence: "{items}" },
      { value: "sometimes", label: "Sometimes a concern", sentence: "{items}", concern: true },
      { value: "often", label: "Often a concern", sentence: "{items}", concern: true },
    ],
    groups: [
      { id: "academic", label: "Class work", rows: [{ id: "keeping", label: "keeping up with class work" }, { id: "directions", label: "following directions" }, { id: "finishing", label: "finishing work on time" }, { id: "participating", label: "taking part in lessons" }] },
      { id: "behavior", label: "Behavior", rows: [{ id: "rules", label: "following classroom rules" }, { id: "peers", label: "getting along with peers" }, { id: "frustration", label: "handling frustration" }, { id: "attention", label: "staying focused" }] },
      { id: "independence", label: "Independence", rows: [{ id: "materials", label: "organizing materials" }, { id: "help", label: "asking for help when needed" }, { id: "moving", label: "moving around the school safely" }, { id: "selfcare", label: "managing personal needs" }] },
    ],
  };
}

function background(): PackAssessment {
  return {
    id: "background", label: "Background and records",
    sections: [
      {
        id: "background", title: "Background",
        blocks: [
          { kind: "para", id: "referral", text: "{{student}} was referred by [[who]] because of [[the concern]]. {{They}} is in grade [[grade]] in [[placement]]. Records show [[attendance, grades, benchmark scores, and supports already tried, with nothing identifying]]." },
          { kind: "para", id: "strengths", text: "Teachers and family describe {{their}} strengths as [[strengths and interests]]." },
        ],
        examples: ["[STUDENT] was referred by his classroom teacher because of slow progress in reading and difficulty staying focused. He is in grade 4 in general education. Records show regular attendance, grades in the C range, and a reading intervention group since the fall with small gains. Teachers and family describe his strengths as a good memory for facts, kindness to younger students and an interest in building things."],
        notesHint: "Why the student was referred, grade and placement, what the records show, and strengths.",
      },
    ],
  };
}

function teacherChecklist(): PackAssessment {
  return {
    id: "checklist", label: "Teacher checklist", grid: checklistGrid(),
    sections: [
      {
        id: "checklist", title: "Teacher Checklist",
        blocks: [
          { kind: "para", id: "intro", text: "{{student}}'s [[who completed it::completedBy]] completed a checklist rating each item as typical for grade, sometimes a concern, or often a concern." },
          { kind: "grid", id: "grid-checklist", grid: "checklist" },
          { kind: "para", id: "comments", text: "The teacher added that {{they}} [[comments written on the checklist]]." },
        ],
        examples: ["[STUDENT]'s classroom teacher completed a checklist rating each item as typical for grade, sometimes a concern, or often a concern. Keeping up with class work and finishing work on time were often a concern, and staying focused was sometimes a concern; the rest were typical for grade. The teacher added that she does her best work in the morning and needs a reminder to start after each transition."],
        notesHint: "Who filled in the checklist, the ratings, and any comments they wrote.",
      },
    ],
  };
}

function observation(): PackAssessment {
  const section = (id: string, grades: PackSection["when"], text: string, examples: string[]): PackSection => ({
    id, title: "Observation", when: grades,
    blocks: [
      { kind: "para", id: "observation", text },
      { kind: "para", id: "summary", text: "Compared with classmates, {{they}} [[how the student compared]]. What helped most was [[the support or condition that made a difference]]." },
    ],
    examples,
    notesHint: "Where and when you observed, what the student did, and what helped.",
  });
  return {
    id: "observation", label: "Observation",
    sections: [
      section("observation-k1", { grades: ["k1"] }, "{{student}} was observed during [[circle time, centers, or a lesson]] for [[number]] minutes. {{They}} [[how the student joined in, followed the routine, and played or worked with others]]. During the teacher's directions {{they}} [[listened, needed a repeat, or needed a hand-over-hand start]].",
        ["[STUDENT] was observed during centers for 20 minutes. He chose the block center, built with two classmates and moved to the next center when the bell rang with one reminder. During the teacher's directions he watched the other children and started after they did. Compared with classmates, he needed one extra prompt at each change. What helped most was a picture of the next center."]),
      section("observation-g25", { grades: ["g25"] }, "{{student}} was observed in [[subject]] for [[number]] minutes during [[the activity]]. {{They}} was on task for [[on-task percent::percent]]% of the time and [[what the student did when off task]]. {{They}} [[how the student took part: answering, asking for help, working with a partner]].",
        ["[STUDENT] was observed in math for 30 minutes during independent practice. She was on task for 70% of the time and looked around the room or sorted her pencils when off task. She asked a neighbor for help twice rather than raising her hand. Compared with classmates, she finished about half of the problems. What helped most was the teacher checking in after the first two problems."]),
      section("observation-older", { grades: ["g68", "g912"] }, "{{student}} was observed in [[class]] for [[number]] minutes during [[the activity]], and during the transition to the next class. {{They}} was on task for [[on-task percent::percent]]% of the time, [[had or did not have]] the materials needed, and [[how the student took part and worked with others]]. During the transition {{they}} [[arrived on time, or what happened]].",
        ["[STUDENT] was observed in science for 45 minutes during a group lab, and during the transition to the next class. He was on task for 80% of the time, had his notebook but not the lab sheet, and let his group do most of the recording while he handled the materials. During the transition he stopped at his locker and arrived two minutes late. Compared with classmates, he took part well when the task was hands-on. What helped most was a clear role in the group."]),
    ],
  };
}

function aroundSections(): PackSection[] {
  return [
    {
      id: "present-levels", title: "Present Levels of Performance", place: "before", when: { reportType: "annual" },
      blocks: [
        { kind: "para", id: "reported-by", text: "Reported by [[your name and role]]" },
        { kind: "subheading", id: "h-progress", text: "Progress on current goals" },
        { kind: "para", id: "progress", text: "[[Each current goal, the latest data, and whether it was met]]" },
        { kind: "subheading", id: "h-present", text: "Present levels" },
        { kind: "para", id: "present", text: "{{student}} currently receives [[minutes and frequency::minutes]] of [[the service]] [[where::location]]. {{They}} now [[what the student can do in each area of need, with data]]." },
      ],
      examples: ["[STUDENT] currently receives 30 minutes weekly of organizational support inside the classroom. He now writes his assignments in a planner on 4 out of 5 days without a reminder and turns in homework about 80% of the time, up from 50% in the fall."],
      notesHint: "The goals from the current IEP, the data on each, and what the student can do now.",
    },
    {
      id: "summary-concerns", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: true },
      blocks: [
        { kind: "para", id: "summary", text: "The records, checklist and observation show that {{student}} has difficulty with [[areas of need::skillAreas]]. [[The main findings in a few lines]]. These difficulties affect {{their}} ability to [[what is hard at school]]." },
        { kind: "para", id: "strengths", text: "Strengths include [[what the student does well]]." },
      ],
      examples: ["The records, checklist and observation show that [STUDENT] has difficulty with attention and organization. He starts tasks late after every transition, finishes about half of his independent work, and often arrives without the materials he needs. These difficulties affect his ability to keep up with class work and show what he knows. Strengths include his memory for facts and his effort on hands-on tasks."],
      notesHint: "The main findings and what they mean for the student at school.",
    },
    {
      id: "summary-none", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: false },
      blocks: [{ kind: "para", id: "summary", text: "The records, checklist and observation show that {{student}} is doing as well as {{their}} classmates in the areas looked at. [[The main findings in a few lines]]. No additional services are recommended at this time. [[Suggestions for the classroom, if any]]." }],
      examples: ["The records, checklist and observation show that [STUDENT] is doing as well as her classmates in the areas looked at. Every item on the checklist was typical for grade and she was on task for most of the observation. No additional services are recommended at this time. Her teacher can keep the morning check-in that is already working."],
      notesHint: "The findings that show the student is doing as well as classmates.",
    },
    {
      id: "next-steps", title: "Next Steps", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "next-steps", text: "The team will meet to review this report with {{student}}'s family and decide on [[eligibility, services, or supports]]. [[Recommendations for the team to consider]]. Please contact [[your name or role]] with any questions about this report." }],
      examples: ["The team will meet to review this report with [STUDENT]'s family and decide on supports for organization and attention. The team may want to consider a daily planner check and a seat near the teacher."],
      notesHint: "What the team will decide and your recommendations.",
    },
    {
      id: "impact", title: "Impact of Disability Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "impact", text: "{{student}}'s [[disability or area of difficulty]] affects {{their}} ability to [[what is hard at school]]. Without support, {{they}} [[what would happen in the general education setting]]." }],
      examples: ["[STUDENT]'s difficulty with attention and organization affects his ability to start work on time, keep track of assignments and finish tests in the time given. Without support, he would keep missing assignments and falling behind in every subject."],
      notesHint: "How the difficulty affects learning and participation.",
    },
    {
      id: "service", title: "Service Delivery Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "service", text: "{{student}} will receive [[minutes and frequency::minutes]] of [[the service]] [[where::location]] to address [[areas of need::skillAreas]]. Accommodations will include [[accommodations::accommodations]]." }],
      examples: ["[STUDENT] will receive 30 minutes weekly of organizational support inside the classroom to address organization and attention. Accommodations will include a daily planner check, chunked assignments and a seat near the teacher."],
      notesHint: "Minutes, frequency, location, areas and accommodations.",
    },
    {
      id: "goal", title: "Goal", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "goal", text: "By [[month::month]] [[year::year]], {{student}} will [[the skill, the condition, and the level of support]] in [[data points::dataDates]] data collections, as measured by [[how progress is measured]]." },
        { kind: "subheading", id: "h-objectives", text: "Objectives" },
        { kind: "numbered", id: "objective1", text: "[[objective]]" },
        { kind: "numbered", id: "objective2", text: "[[objective]]" },
        { kind: "numbered", id: "objective3", text: "[[objective]]" },
      ],
      examples: ["By May of next school year, [STUDENT] will write each assignment in his planner and bring the needed materials to class on 4 out of 5 days, as measured by a teacher checklist. Objectives: he will write assignments with a reminder; he will write them without a reminder; he will bring the materials for every class."],
      notesHint: "The target skill, the level of support, and three steps toward it.",
    },
    {
      id: "ending", title: "Ending", place: "after", when: { reportType: "annual", concerns: false },
      blocks: [{ kind: "para", id: "ending", text: "{{student}} has met {{their}} goals and no longer needs [[the service]] to make progress in the general education curriculum. [[Any suggestions for the classroom going forward]]. With the team's agreement, the service will end. Please contact [[your name or role]] with any questions about this report." }],
      examples: ["[STUDENT] has met her goals and no longer needs organizational support to make progress in the general education curriculum. Her teacher can keep the planner check as a whole-class routine. With the team's agreement, the service will end."],
      notesHint: "Which goals were met and any suggestions for the classroom.",
    },
  ];
}

export function otherPack(): TemplatePack {
  const base = blankPack("K-12");
  return {
    version: 1,
    titles: { evaluation: "Evaluation Report", annual: "Annual Review" },
    assessments: [background(), teacherChecklist(), observation()],
    sections: aroundSections(),
    lists: {
      ...base.lists,
      completedBy: { options: ["classroom teacher", "general education teacher", "special education teacher", "school counselor", "classroom aide", "parent"] },
      skillAreas: { multi: true, options: ["reading", "writing", "math", "attention", "organization", "behavior", "social skills", "communication", "independence", "self-regulation"] },
      concernAreas: { multi: true, options: ["keeping up with class work", "following directions", "finishing work on time", "staying focused", "getting along with peers", "handling frustration", "organizing materials", "moving around the school safely"] },
      supports: { multi: true, options: ["a check-in routine", "a behavior plan", "small group instruction", "a peer buddy", "a visual schedule", "a planner check", "assistive technology"] },
      accommodations: { multi: true, options: ["extended time", "directions repeated", "chunked assignments", "a seat near the teacher", "scheduled breaks", "a visual schedule", "a daily planner check", "a copy of class notes", "reduced distractions"] },
    },
  };
}
