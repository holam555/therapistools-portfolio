import type { GridDef } from "../grids";
import { blankPack, type PackAssessment, type PackBlock, type PackSection, type TemplatePack } from "../pack";

/**
 * A ready-made school psychology report template. Generic school wording
 * with blanks for everything the writer knows; the examples are fictional and
 * only ever shown to an AI prompt as style samples.
 */

const SCORE = "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::scoreDescriptor]].";
const COGNITIVE = "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::cognitiveDescriptor]].";
const scoreLine = (id: string, label: string, text = SCORE): PackBlock => ({ kind: "para", id, label, text });

function behaviorGrid(): GridDef {
  return {
    id: "behavior", title: "Choose a level for each scale", layout: "byLevel", blank: "[[scales at this level, or none]]", none: "None", allClear: "within the average range on every scale",
    levels: [
      { value: "average", label: "Average range", sentence: "{items}" },
      { value: "elevated", label: "Elevated", sentence: "{items}", concern: true },
      { value: "very", label: "Very elevated", sentence: "{items}", concern: true },
    ],
    groups: [
      { id: "externalizing", label: "Externalizing", rows: [{ id: "hyperactivity", label: "Hyperactivity" }, { id: "aggression", label: "Aggression" }, { id: "conduct", label: "Conduct Problems" }] },
      { id: "internalizing", label: "Internalizing", rows: [{ id: "anxiety", label: "Anxiety" }, { id: "depression", label: "Depression" }, { id: "somatization", label: "Somatization" }, { id: "withdrawal", label: "Withdrawal" }] },
      { id: "school", label: "School problems", rows: [{ id: "attention", label: "Attention Problems" }, { id: "learning", label: "Learning Problems" }, { id: "atypicality", label: "Atypicality" }] },
      { id: "adaptive", label: "Adaptive scales", rows: [{ id: "adaptability", label: "Adaptability" }, { id: "social", label: "Social Skills" }, { id: "study", label: "Study Skills" }, { id: "communication", label: "Functional Communication" }] },
    ],
  };
}

function records(): PackAssessment {
  return {
    id: "records", label: "Records review and background",
    sections: [
      {
        id: "records", title: "Reason for Referral and Background",
        blocks: [
          { kind: "para", id: "referral", label: "Reason for referral", text: "{{student}} was referred for [[reason::referralReasons]] by [[who referred the student]]. The team asked [[the questions this evaluation should answer]]." },
          { kind: "para", id: "school", label: "Educational history", text: "{{They}} is in grade [[grade]] in [[placement: general education, with support, or a special program]]. Attendance has been [[regular, or the pattern of absences]]. Prior interventions include [[what was tried, for how long, and the result]]. Grades and benchmark scores show [[the pattern across subjects]]." },
          { kind: "para", id: "health", label: "Developmental and health history", text: "Family and records report [[developmental milestones, hearing and vision screening results, health conditions or medications, with nothing identifying]]." },
          { kind: "para", id: "language", label: "Language and cultural background", text: "The language spoken at home is [[language]], and {{their}} English proficiency is [[level, if applicable]]. [[Anything about background that the interpretation of scores should take into account]]." },
        ],
        examples: ["[STUDENT] was referred for academic concerns and attention and focus by his classroom teacher. The team asked whether a learning disability explains his slow progress in reading. He is in grade 3 in general education with reading intervention. Attendance has been regular. Prior interventions include a small-group phonics program for two semesters, with gains in letter sounds but not in reading fluency."],
        notesHint: "Why the student was referred, school history, interventions, health and language background, with nothing identifying.",
      },
    ],
  };
}

function cognitive(): PackAssessment {
  return {
    id: "cognitive", label: "Cognitive assessment",
    sections: [
      {
        id: "cognitive", title: "Cognitive Assessment",
        blocks: [
          { kind: "para", id: "intro", text: "The [[test name]] was given to {{student}} to measure {{their}} thinking and reasoning abilities. Standard scores have a mean of 100 and a standard deviation of 15; scores from 90 to 109 are in the average range." },
          scoreLine("fsiq", "Full scale", COGNITIVE),
          scoreLine("verbal", "Verbal comprehension", COGNITIVE),
          scoreLine("visual", "Visual spatial", COGNITIVE),
          scoreLine("fluid", "Fluid reasoning", COGNITIVE),
          scoreLine("memory", "Working memory", COGNITIVE),
          scoreLine("speed", "Processing speed", COGNITIVE),
          { kind: "para", id: "pattern", text: "{{Their}} overall ability falls in the [[descriptor::cognitiveDescriptor]] range. [[Strengths and weaknesses among the index scores, and whether the full scale score is a fair summary]]. During testing {{they}} [[effort, attention and anything that affected the scores]]." },
        ],
        examples: ["[STUDENT]'s overall ability falls in the average range. Her verbal comprehension and fluid reasoning scores were in the high average range, while her working memory and processing speed were in the low average range, so the full scale score should be read with that gap in mind. During testing she worked carefully and asked for directions to be repeated on the timed tasks."],
        notesHint: "The test name, each index score, the pattern among them, and testing behavior.",
      },
    ],
  };
}

function achievement(): PackAssessment {
  const section = (id: string, grades: PackSection["when"], lines: PackBlock[], examples: string[]): PackSection => ({
    id, title: "Academic Achievement", when: grades,
    blocks: [
      { kind: "para", id: "intro", text: "The [[test name]] was given to {{student}} to measure {{their}} academic skills compared with peers of the same grade. Standard scores have a mean of 100 and a standard deviation of 15." },
      ...lines,
      { kind: "para", id: "pattern", text: "{{Their}} scores are [[consistent with, above, or below]] what the cognitive scores would predict. The lowest area is [[area and what the errors looked like]]." },
    ],
    examples,
    notesHint: "The test name, each score, and how the achievement scores compare with the cognitive scores.",
  });
  return {
    id: "achievement", label: "Academic achievement",
    sections: [
      section("achievement-k1", { grades: ["k1"] }, [
        scoreLine("letters", "Letter and word recognition"),
        scoreLine("phonological", "Phonological processing"),
        scoreLine("mathconcepts", "Math concepts and numeration"),
        scoreLine("writing", "Written expression"),
      ], ["The academic test was given to [STUDENT] to measure his academic skills compared with peers of the same grade. His letter and word recognition score was in the low range, and phonological processing was in the below average range. His scores are below what the cognitive scores would predict. The lowest area is phonological processing: he could not blend sounds into a word even with a model."]),
      section("achievement-g25", { grades: ["g25"] }, [
        scoreLine("basicreading", "Basic reading"),
        scoreLine("fluency", "Reading fluency"),
        scoreLine("comprehension", "Reading comprehension"),
        scoreLine("calculation", "Math calculation"),
        scoreLine("problems", "Math problem solving"),
        scoreLine("writing", "Written expression"),
        scoreLine("spelling", "Spelling"),
      ], ["The academic test was given to [STUDENT] to measure her academic skills compared with peers of the same grade. Basic reading and reading fluency were in the low range while reading comprehension was in the average range when passages were read to her. Math calculation and math problem solving were in the average range. Her scores are below what the cognitive scores would predict in reading only."]),
      section("achievement-older", { grades: ["g68", "g912"] }, [
        scoreLine("decoding", "Word reading and decoding"),
        scoreLine("fluency", "Reading fluency"),
        scoreLine("comprehension", "Reading comprehension"),
        scoreLine("calculation", "Math calculation"),
        scoreLine("reasoning", "Math reasoning"),
        scoreLine("essay", "Essay composition"),
        scoreLine("academicfluency", "Academic fluency"),
      ], ["The academic test was given to [STUDENT] to measure his academic skills compared with peers of the same grade. Word reading and reading comprehension were in the average range. Math calculation was in the below average range and math reasoning in the low range. His scores are below what the cognitive scores would predict in math. The lowest area is math reasoning: he set up multi-step problems correctly but made computation errors with fractions and decimals."]),
    ],
  };
}

function ratingScale(): PackAssessment {
  return {
    id: "rating", label: "Behavior and social-emotional rating scale", grid: behaviorGrid(),
    sections: [
      {
        id: "rating", title: "Behavior and Social-Emotional Rating Scale",
        blocks: [
          { kind: "para", id: "intro", text: "The [[scale name]] was completed by {{student}}'s [[who rated the student::raters]] to describe {{their}} behavior and emotional functioning at school and at home. Scores in the elevated and very elevated ranges point to areas that may need support; adaptive scales work the other way, with lower scores showing a need." },
          { kind: "grid", id: "grid-behavior", grid: "behavior" },
          { kind: "para", id: "agreement", text: "The raters [[agreed, or differed on which scales]]. [[What the elevated scales look like day to day, from the raters' comments]]." },
        ],
        examples: ["The behavior rating scale was completed by [STUDENT]'s classroom teacher and parent to describe his behavior and emotional functioning at school and at home. Attention Problems and Hyperactivity were very elevated for the teacher and elevated for the parent; every other scale was in the average range. The raters agreed on the main areas. Both describe him as leaving his seat often and starting tasks before the directions are finished."],
        notesHint: "The scale, who completed it, the level of each scale, and what the raters' comments described.",
      },
    ],
  };
}

function observation(): PackAssessment {
  return {
    id: "observation", label: "Classroom observation",
    sections: [
      {
        id: "observation", title: "Classroom Observation",
        blocks: [
          { kind: "para", id: "setting", text: "{{student}} was observed in [[class or setting]] for [[number]] minutes during [[the activity]]. {{They}} was on task for [[on-task percent::percent]]% of the intervals observed, compared with [[peer percent::percent]]% for a peer chosen by the teacher." },
          { kind: "para", id: "behavior", text: "Off-task behavior included [[what the student did instead]]. {{They}} responded to [[teacher directions and redirection]] by [[how]]. With peers {{they}} [[how the student interacted]]." },
        ],
        examples: ["[STUDENT] was observed in her math class for 30 minutes during independent practice. She was on task for 70% of the intervals observed, compared with 90% for a peer chosen by the teacher. Off-task behavior included looking around the room and sharpening her pencil twice. She responded to a quiet reminder by returning to work within a few seconds. With peers she was friendly and joined the group when invited."],
        notesHint: "Where and when you observed, on-task data for the student and a peer, and what you saw.",
      },
    ],
  };
}

function adaptive(): PackAssessment {
  return {
    id: "adaptive", label: "Adaptive skills",
    sections: [
      {
        id: "adaptive", title: "Adaptive Skills",
        blocks: [
          { kind: "para", id: "intro", text: "The [[scale name]] was completed by {{student}}'s [[who rated the student::raters]] to describe the everyday skills {{they}} uses at school and at home." },
          scoreLine("composite", "Adaptive composite"),
          scoreLine("communication", "Communication"),
          scoreLine("dailyliving", "Daily living skills"),
          scoreLine("socialization", "Socialization"),
          { kind: "para", id: "pattern", text: "{{Their}} adaptive skills are [[in line with peers, or where they are behind]], shown by [[examples from the raters]]." },
        ],
        examples: ["The adaptive scale was completed by [STUDENT]'s parent and special education teacher to describe the everyday skills he uses at school and at home. His adaptive composite was in the below average range. His adaptive skills are behind peers in daily living, shown by needing reminders to pack his bag and to manage his lunch money."],
        notesHint: "The scale, who completed it, the scores, and examples from the raters.",
      },
    ],
  };
}

function aroundSections(): PackSection[] {
  return [
    {
      id: "present-levels", title: "Present Levels of Performance", place: "before", when: { reportType: "annual" },
      blocks: [
        { kind: "para", id: "reported-by", label: "School Psychology", text: "Reported by [[your name and credentials]]" },
        { kind: "subheading", id: "h-progress", text: "Progress on current goals" },
        { kind: "para", id: "progress", text: "[[Each current goal, the latest data, and whether it was met]]" },
        { kind: "subheading", id: "h-present", text: "Present levels" },
        { kind: "para", id: "present", text: "{{student}} currently receives [[minutes and frequency::minutes]] of [[service::psychServices]] [[where::location]]. {{They}} now [[what the student can do in each area of need, with data]]." },
      ],
      examples: ["[STUDENT] currently receives 30 minutes weekly of counseling outside the classroom. She now uses a calming strategy before asking for a break in 3 out of 4 observed situations and has had no office referrals this quarter."],
      notesHint: "The goals from the current IEP, the data on each, and what the student can do now.",
    },
    {
      id: "eligibility", title: "Eligibility Summary", place: "after", when: { reportType: "evaluation", concerns: true },
      blocks: [
        { kind: "para", id: "summary", text: "The results of this evaluation are consistent with [[disability category::disability]]. [[How the cognitive, achievement, rating scale and observation data meet each part of the criteria]]. The disability affects {{student}}'s education by [[what is hard at school]], and {{they}} needs specially designed instruction in [[areas of need::skillAreas]]. Eligibility is decided by the IEP team; this report is one source of information for that decision." },
        { kind: "para", id: "strengths", text: "Strengths include [[what the student does well]]." },
      ],
      examples: ["The results of this evaluation are consistent with Specific Learning Disability in basic reading and reading fluency. [STUDENT]'s cognitive ability is in the average range, his reading scores are in the low range after two semesters of intervention, and the pattern is seen in the classroom observation and work samples. The disability affects his education by limiting his access to grade-level text, and he needs specially designed instruction in reading decoding and fluency. Strengths include his listening comprehension and his math skills."],
      notesHint: "The category, how the data meet the criteria, the areas of need and strengths.",
    },
    {
      id: "summary-none", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: false },
      blocks: [{ kind: "para", id: "summary", text: "The results of this evaluation do not indicate a disability that needs special education at this time. {{student}}'s [[the main findings in a few lines]]. Suggestions for the classroom include [[accommodations::accommodations]], and progress should be reviewed in [[when]]." }],
      examples: ["The results of this evaluation do not indicate a disability that needs special education at this time. [STUDENT]'s cognitive and achievement scores are in the average range, and the rating scales were in the average range for both raters. Suggestions for the classroom include preferential seating and chunked assignments, and progress should be reviewed at the end of the semester."],
      notesHint: "The findings that show no disability, and suggestions for the classroom.",
    },
    {
      id: "next-steps", title: "Next Steps", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "next-steps", text: "The IEP team will meet to review this report with {{student}}'s family, decide on eligibility and services, and write goals in [[areas of need::skillAreas]]. [[Recommendations for the team to consider: further assessment, a behavior plan, counseling, accommodations]]. Please contact the school psychologist with any questions about this report." }],
      examples: ["The IEP team will meet to review this report with [STUDENT]'s family, decide on eligibility and services, and write goals in reading decoding and fluency. The team may want to consider a structured literacy program and text-to-speech for content classes."],
      notesHint: "What the team will decide and your recommendations.",
    },
    {
      id: "impact", title: "Impact of Disability Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "impact", text: "{{student}}'s [[disability or area of difficulty]] affects {{their}} ability to [[what is hard at school: reading grade-level text, staying on task, managing emotions, working with peers]]. Without support, {{they}} [[what would happen in the general education setting]]." }],
      examples: ["[STUDENT]'s difficulty with attention and self-regulation affects his ability to finish independent work, follow multi-step directions and stay in his seat during lessons. Without support, he would fall further behind in work completion and continue to have conflicts with peers during unstructured time."],
      notesHint: "How the disability affects learning and participation.",
    },
    {
      id: "service", title: "Service Delivery Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "service", text: "{{student}} will receive [[minutes and frequency::minutes]] of [[service::psychServices]] [[where::location]] to address [[areas of need::skillAreas]]. Accommodations will include [[accommodations::accommodations]]." }],
      examples: ["[STUDENT] will receive 30 minutes weekly of counseling outside the classroom to address self-regulation and social skills. Accommodations will include scheduled breaks, check-ins with a trusted adult and preferential seating."],
      notesHint: "Minutes, frequency, location and areas.",
    },
    {
      id: "goal", title: "Social-Emotional or Behavior Goal", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "goal", text: "By [[month::month]] [[year::year]], {{student}} will [[the skill, the condition, and the level of support]] in [[data points::dataDates]] data collections, as measured by [[how progress is measured]]." },
        { kind: "subheading", id: "h-objectives", text: "Objectives" },
        { kind: "numbered", id: "objective1", text: "[[objective]]" },
        { kind: "numbered", id: "objective2", text: "[[objective]]" },
        { kind: "numbered", id: "objective3", text: "[[objective]]" },
      ],
      examples: ["By May of next school year, [STUDENT] will use a taught calming strategy and ask for a break instead of leaving the room when frustrated in 4 out of 5 observed situations, as measured by teacher and counselor data. Objectives: she will name three calming strategies; she will use one with an adult prompt; she will use one on her own."],
      notesHint: "The goal area, the target skill, the level of support, and three steps toward it.",
    },
    {
      id: "ending", title: "Ending", place: "after", when: { reportType: "annual", concerns: false },
      blocks: [{ kind: "para", id: "ending", text: "{{student}} has met {{their}} goals, and the data show that {{they}} no longer needs [[the service]] to make progress in the general education curriculum. [[Any suggestions for the classroom going forward]]. With the team's agreement, the service will end. Please contact the school psychologist with any questions about this report." }],
      examples: ["[STUDENT] has met his goals, and the data show that he no longer needs counseling to make progress in the general education curriculum. His teacher can keep the morning check-in as a classroom routine. With the team's agreement, the service will end."],
      notesHint: "Which goals were met and any suggestions for the classroom.",
    },
  ];
}

export function psychPack(): TemplatePack {
  const base = blankPack("School psychology");
  return {
    version: 1,
    titles: { evaluation: "Psychoeducational Evaluation Report", annual: "School Psychology Annual Review" },
    assessments: [records(), cognitive(), achievement(), ratingScale(), observation(), adaptive()],
    sections: aroundSections(),
    lists: {
      ...base.lists,
      skillAreas: { multi: true, options: ["reading", "written expression", "mathematics", "attention and executive function", "social-emotional functioning", "behavior", "adaptive skills", "processing speed", "working memory", "social skills", "self-regulation"] },
      cognitiveDescriptor: { options: ["Extremely Low", "Very Low", "Low Average", "Average", "High Average", "Very High", "Extremely High"] },
      scoreDescriptor: { options: ["Very Low", "Low", "Below Average", "Low Average", "Average", "High Average", "Above Average", "High", "Very High"] },
      readingSkills: { multi: true, options: ["phonological awareness", "decoding", "sight word reading", "reading fluency", "reading comprehension", "vocabulary"] },
      referralReasons: { multi: true, options: ["academic concerns", "attention and focus", "behavior", "social-emotional concerns", "a possible learning disability", "a three-year re-evaluation", "a change in placement"] },
      raters: { multi: true, options: ["classroom teacher", "special education teacher", "parent", "the student (self-report)", "school counselor"] },
      psychServices: { options: ["counseling", "social skills instruction", "behavior support", "consultation with the teacher", "check-in and check-out"] },
      concernAreas: { multi: true, options: ["work completion", "attention during lessons", "following multi-step directions", "frustration tolerance", "peer conflict", "anxiety about school work", "withdrawal from peers", "impulsive behavior", "organization"] },
      supports: { multi: true, options: ["a behavior plan", "counseling", "social skills instruction", "a check-in and check-out routine", "a visual schedule", "a structured literacy program", "a math intervention"] },
      accommodations: { multi: true, options: ["extended time", "scheduled breaks", "small group testing", "directions read aloud", "reduced distractions", "check-ins with a trusted adult", "chunked assignments", "a visual schedule", "preferential seating", "text-to-speech"] },
    },
  };
}
