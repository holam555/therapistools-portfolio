import type { GridDef } from "../grids";
import { blankPack, type PackAssessment, type PackSection, type TemplatePack } from "../pack";

/**
 * A ready-made physical therapy report template. Generic school wording with
 * blanks for everything the writer knows; the examples are fictional and only
 * ever shown to an AI prompt as style samples.
 */

const SCORE = "Standard score: [[score]]. Percentile: [[percentile]]. [[descriptor::scoreDescriptor]].";

function mobilityGrid(): GridDef {
  return {
    id: "mobility", title: "Rate each school task", layout: "byGroup", blank: "[[ratings for this group]]",
    levels: [
      { value: "independent", label: "Independent", sentence: "{Items} {was} done independently and safely." },
      { value: "supervision", label: "Supervision", sentence: "Supervision or extra time was needed for {items}." },
      { value: "help", label: "Physical help", sentence: "Physical help from an adult was needed for {items}." },
      { value: "unable", label: "Not yet possible", sentence: "{Items} {was} not possible at this time." },
    ],
    groups: [
      { id: "building", label: "Moving through the building", rows: [{ id: "hallway", label: "walking in the hallway with the class" }, { id: "stairs", label: "stairs", plural: true }, { id: "doors", label: "opening and passing through doors" }, { id: "bus", label: "bus steps", plural: true }] },
      { id: "classroom", label: "In the classroom", rows: [{ id: "sitting", label: "sitting at a desk or table" }, { id: "floor", label: "getting down to and up from the floor" }, { id: "carrying", label: "carrying materials" }, { id: "lining", label: "lining up and waiting" }] },
      { id: "play", label: "Recess and physical education", rows: [{ id: "playground", label: "climbing on playground equipment" }, { id: "running", label: "running games" }, { id: "pe", label: "physical education activities" }] },
    ],
  };
}

function teacherChecklist(): PackAssessment {
  return {
    id: "checklist", label: "Teacher mobility checklist", grid: mobilityGrid(),
    sections: [
      {
        id: "checklist", title: "Teacher Mobility Checklist",
        blocks: [
          { kind: "para", id: "intro", text: "{{student}}'s [[who completed it::completedBy]] completed a checklist of how {{they}} moves around the school and takes part in physical activities. Each task was rated as independent, needing supervision, needing physical help, or not yet possible." },
          { kind: "grid", id: "grid-mobility", grid: "mobility" },
          { kind: "para", id: "comments", text: "The teacher added that {{they}} [[comments written on the checklist]]." },
        ],
        examples: [
          "[STUDENT]'s classroom teacher completed a checklist of how he moves around the school and takes part in physical activities. Walking in the hallway with the class and sitting at a desk were done independently and safely. Supervision or extra time was needed for stairs and bus steps. The teacher added that he is the last to arrive after every transition and holds the rail with both hands on the stairs.",
          "[STUDENT]'s physical education teacher completed a checklist of how she moves around the school and takes part in physical activities. Climbing on playground equipment and running games needed supervision or extra time. The teacher added that she joins every activity but tires after a few minutes of running and sits out the rest of the game.",
        ],
        notesHint: "Who filled in the checklist, the ratings, and any comments they wrote.",
      },
    ],
  };
}

function grossMotorScreen(): PackAssessment {
  const section = (id: string, grades: PackSection["when"], items: { id: string; label: string; text: string }[], examples: string[]): PackSection => ({
    id, title: "Gross Motor Screen", when: grades,
    blocks: [
      { kind: "para", id: "intro", text: "An informal gross motor screen was completed to look at how {{student}} moves during the kinds of activities expected at {{their}} grade." },
      ...items.map((i) => ({ kind: "bullet" as const, id: i.id, label: i.label, text: i.text })),
    ],
    examples,
    notesHint: "What you saw for each item, with any measurements.",
  });
  return {
    id: "screen", label: "Gross motor screen",
    sections: [
      section("screen-k1", { grades: ["k1"] }, [
        { id: "walk", label: "Walking and running", text: "{{They}} walks with [[gait pattern]] and runs [[with or without arm swing, speed compared with peers]]." },
        { id: "jump", label: "Jumping", text: "{{They}} jumps forward [[distance]] with [[two feet together or one foot leading]] and [[can or cannot]] jump down from a step." },
        { id: "stairs", label: "Stairs", text: "{{They}} goes up stairs [[alternating or step-to]] and comes down [[alternating or step-to]], [[with or without the rail]]." },
        { id: "balance", label: "Balance", text: "{{They}} stands on one foot for [[seconds]] seconds on the right and [[seconds]] seconds on the left, and walks along a line [[heel to toe or stepping off]]." },
        { id: "ball", label: "Ball skills", text: "{{They}} catches a playground ball [[with arms and body, or with hands only]] and kicks a ball [[with a step and swing, or standing still]]." },
      ], ["An informal gross motor screen was completed to look at how [STUDENT] moves during the kinds of activities expected at his grade. He walks with a wide base and runs without arm swing, staying behind his peers. He jumps forward about one foot with two feet together but will not jump down from a step. He goes up stairs step-to with the rail and comes down the same way. He stands on one foot for two seconds on each side."]),
      section("screen-g25", { grades: ["g25"] }, [
        { id: "run", label: "Running and agility", text: "{{They}} runs [[speed and form]] and changes direction [[smoothly or with loss of balance]]." },
        { id: "hop", label: "Hopping and skipping", text: "{{They}} hops on one foot [[number]] times on each side and [[can or cannot]] skip." },
        { id: "stairs", label: "Stairs", text: "{{They}} goes up and down stairs [[alternating or step-to]], [[with or without the rail]], carrying [[a backpack or nothing]]." },
        { id: "balance", label: "Balance", text: "{{They}} stands on one foot for [[seconds]] seconds with eyes open and [[seconds]] seconds with eyes closed, and walks along a balance beam or line [[how]]." },
        { id: "strength", label: "Strength and endurance", text: "{{They}} completes [[number]] sit-ups and [[number]] push-ups and [[keeps pace with peers or needs rest]] during a timed walk or run." },
        { id: "ball", label: "Ball skills", text: "{{They}} throws a ball [[overhand with a step, or without]], catches [[a tennis ball with hands only, or a larger ball]], and dribbles [[number]] times." },
      ], ["An informal gross motor screen was completed to look at how [STUDENT] moves during the kinds of activities expected at her grade. She runs with a short stride and changes direction with a loss of balance. She hops five times on the right and twice on the left and cannot yet skip. She goes up and down stairs alternating with the rail. She stands on one foot for six seconds with eyes open and two seconds with eyes closed."]),
      section("screen-older", { grades: ["g68", "g912"] }, [
        { id: "transitions", label: "Transitions between classes", text: "{{They}} moves between classes [[with the crowd, ahead of it, or after it]] in [[time]] and [[does or does not]] need extra time." },
        { id: "stairs", label: "Stairs", text: "{{They}} goes up and down a full flight of stairs [[alternating or step-to]], [[with or without the rail]], with a backpack weighing [[weight]]." },
        { id: "walk", label: "Walking endurance", text: "In a [[six-minute or timed]] walk {{they}} covered [[distance]] and [[rested or did not rest]]." },
        { id: "balance", label: "Balance", text: "{{They}} stands on one foot for [[seconds]] seconds, walks heel to toe [[number]] steps, and [[recovers or does not recover]] from a nudge." },
        { id: "strength", label: "Strength", text: "{{They}} rises from a chair without hands [[number]] times in 30 seconds and [[can or cannot]] get up from the floor without support." },
        { id: "pe", label: "Physical education", text: "In physical education {{they}} [[which activities the student joins, modifies or sits out]]." },
      ], ["An informal gross motor screen was completed to look at how [STUDENT] moves during the kinds of activities expected at his grade. He moves between classes after the crowd and arrives about two minutes late when the route includes stairs. He goes up a full flight of stairs alternating with the rail and comes down step-to. In a six-minute walk he covered a shorter distance than expected for his age and rested once."]),
    ],
  };
}

function standardized(): PackAssessment {
  return {
    id: "standardized", label: "Standardized motor assessment",
    sections: [
      {
        id: "standardized", title: "Standardized Motor Assessment",
        blocks: [
          { kind: "para", id: "intro", text: "The [[test name]] was given to {{student}} to compare {{their}} gross motor skills with those of peers of the same age. Standard scores have a mean of 100 and a standard deviation of 15; scores from 85 to 115 are in the average range." },
          { kind: "para", id: "composite", label: "Gross motor composite", text: SCORE },
          { kind: "para", id: "balance", label: "Balance", text: SCORE },
          { kind: "para", id: "agility", label: "Running speed and agility", text: SCORE },
          { kind: "para", id: "strength", label: "Strength", text: SCORE },
          { kind: "para", id: "coordination", label: "Bilateral coordination", text: SCORE },
          { kind: "para", id: "notes", text: "During testing {{they}} [[effort, understanding of directions, and anything that affected the scores]]." },
        ],
        examples: ["The standardized motor assessment was given to [STUDENT] to compare her gross motor skills with those of peers of the same age. Her gross motor composite fell in the below average range. Balance was her lowest area, and running speed and agility were in the average range. During testing she followed every direction and asked to repeat the items she found hard."],
        notesHint: "The test name, each score, and anything about testing behavior.",
      },
    ],
  };
}

function observation(): PackAssessment {
  return {
    id: "observation", label: "Posture, strength and balance observation",
    sections: [
      {
        id: "observation", title: "Posture, Strength and Balance",
        blocks: [
          { kind: "para", id: "posture", label: "Posture", text: "In standing and sitting, {{student}} shows [[alignment: typical, rounded shoulders, forward head, leaning to one side]]. {{Their}} seated posture at a desk is [[upright, slumped, or shifting]]." },
          { kind: "para", id: "strength", label: "Strength and tone", text: "Muscle tone is [[typical, low or high]]. Strength in the [[legs, trunk, arms]] is [[typical, or where it is reduced]], seen when {{they}} [[task that showed it]]." },
          { kind: "para", id: "rom", label: "Range of motion", text: "Joint range of motion is [[within normal limits, or where it is limited and by how much]]." },
          { kind: "para", id: "balance", label: "Balance and coordination", text: "{{They}} keeps {{their}} balance [[when standing still, when moving, or loses it when]], and {{their}} movements are [[smooth and planned, or where coordination breaks down]]." },
          { kind: "para", id: "endurance", label: "Endurance", text: "{{They}} [[keeps pace with peers, or tires after]] and [[recovers quickly or slowly]]." },
        ],
        examples: ["In standing and sitting, [STUDENT] shows rounded shoulders and a forward head. His seated posture at a desk is slumped, with his chin resting on his hand within a few minutes. Muscle tone is low. Strength in the trunk is reduced, seen when he could not hold a plank for more than five seconds. Joint range of motion is within normal limits. He keeps his balance when standing still but loses it when turning quickly."],
        notesHint: "What you saw and measured for posture, tone, strength, range of motion, balance and endurance.",
      },
    ],
  };
}

function schoolAccess(): PackAssessment {
  return {
    id: "access", label: "School mobility and access",
    sections: [
      {
        id: "access", title: "School Mobility and Access",
        blocks: [
          { kind: "para", id: "mobility", text: "{{student}} [[how the student gets around::mobility]] in the school building and uses [[equipment::equipment]]. {{They}} travels [[distance]] between {{their}} farthest classes and needs [[time]] to do it. Uneven ground, ramps and crowded hallways are [[managed, or where they are a problem]]." },
          { kind: "para", id: "transfers", text: "{{They}} gets in and out of [[the bus, a chair, the restroom]] [[independently or with help]]. Emergency evacuation: [[the plan in place and whether the student can follow it]]." },
        ],
        examples: ["[STUDENT] walks with a walker in the school building and uses ankle-foot orthoses. She travels the length of one hallway between her farthest classes and needs about five minutes to do it. Ramps are managed; crowded hallways are a problem because peers bump the walker. She gets in and out of the bus with the lift and an adult nearby. Emergency evacuation: she leaves with her class using the ground-floor exit."],
        notesHint: "How the student gets around the building, equipment, distances, transfers and the evacuation plan.",
      },
    ],
  };
}

function aroundSections(): PackSection[] {
  return [
    {
      id: "present-levels", title: "Present Levels of Performance", place: "before", when: { reportType: "annual" },
      blocks: [
        { kind: "para", id: "reported-by", label: "Physical Therapy", text: "Reported by [[your name and credentials]]" },
        { kind: "subheading", id: "h-progress", text: "Progress on current goals" },
        { kind: "para", id: "progress", text: "[[Each current goal, the latest data, and whether it was met]]" },
        { kind: "subheading", id: "h-present", text: "Present levels" },
        { kind: "para", id: "present", text: "{{student}} currently receives [[minutes and frequency::minutes]] of physical therapy [[where::location]]. {{They}} now [[what the student can do in each area of need, with data]]." },
      ],
      examples: ["[STUDENT] currently receives 30 minutes weekly of physical therapy both inside and outside the classroom. He now climbs a full flight of stairs alternating with one hand on the rail in 3 out of 4 trials and arrives at class with his peers after transitions."],
      notesHint: "The goals from the current IEP, the data on each, and what the student can do now.",
    },
    {
      id: "summary-concerns", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: true },
      blocks: [
        { kind: "para", id: "summary", text: "Taken together, the checklist, screen, testing and observation show that {{student}} has difficulty with [[areas of need::skillAreas]]. [[The main findings in a few lines]]. These difficulties affect {{their}} ability to [[move safely through the school, keep up with peers, take part in physical education and recess]]." },
        { kind: "para", id: "strengths", text: "Strengths include [[what the student does well]]." },
      ],
      examples: ["Taken together, the checklist, screen, testing and observation show that [STUDENT] has difficulty with balance, strength and endurance, and stair navigation. His gross motor composite is below average, he needs supervision on the stairs, and he tires before the end of physical education. These difficulties affect his ability to move safely through the school and keep up with peers. Strengths include his willingness to try every task and his good understanding of directions."],
      notesHint: "The main findings and what they mean for the student at school.",
    },
    {
      id: "summary-none", title: "Summary", place: "after", when: { reportType: "evaluation", concerns: false },
      blocks: [{ kind: "para", id: "summary", text: "The results of this evaluation show that {{student}}'s gross motor skills and mobility are within the expected range for {{their}} age and grade, and {{they}} moves through the school safely. [[The main findings in a few lines]]. Physical therapy is not recommended at this time. [[Suggestions for physical education or the classroom, if any]]." }],
      examples: ["The results of this evaluation show that [STUDENT]'s gross motor skills and mobility are within the expected range for her age and grade, and she moves through the school safely. Every item on the teacher checklist was independent, and her standardized scores were in the average range. Physical therapy is not recommended at this time."],
      notesHint: "The findings that show skills are within the expected range.",
    },
    {
      id: "next-steps", title: "Next Steps", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "next-steps", text: "The results indicate that {{student}} needs physical therapy as a related service to benefit from {{their}} special education program under [[disability category::disability]]. The IEP team will review this report and decide on services and goals together." },
        { kind: "para", id: "closing", text: "Physical therapy in the school setting is a related service: it supports the student's access to the school building, the curriculum and school activities. Please contact the physical therapist with any questions about this report." },
      ],
      examples: ["The results indicate that [STUDENT] needs physical therapy as a related service to benefit from his special education program under Orthopedic Impairment. The IEP team will review this report and decide on services and goals together."],
      notesHint: "The eligibility category and why physical therapy is needed.",
    },
    {
      id: "impact", title: "Impact of Disability Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "impact", text: "{{student}}'s [[motor difficulties]] affect {{their}} ability to [[what is hard at school: moving between classes, stairs, sitting for lessons, physical education, recess]]. Without support, {{they}} [[what would happen in the general education setting]]." }],
      examples: ["[STUDENT]'s reduced strength and balance affect her ability to move between classes on time, use the stairs safely and take part in physical education for the full period. Without support, she would miss instruction at the start of each class and be at risk of falls in crowded hallways."],
      notesHint: "How the motor difficulties affect access and participation at school.",
    },
    {
      id: "service", title: "Service Delivery Statement", place: "after", when: { concerns: true },
      blocks: [{ kind: "para", id: "service", text: "{{student}} will receive [[minutes and frequency::minutes]] of physical therapy [[where::location]] to address [[areas of need::skillAreas]]. Services will include [[direct therapy, training for staff, equipment checks, or consultation with the physical education teacher]]. Accommodations will include [[accommodations::accommodations]]." }],
      examples: ["[STUDENT] will receive 30 minutes weekly of physical therapy both inside and outside the classroom to address stair navigation and strength and endurance. Services will include direct therapy and a check of his seating each quarter. Accommodations will include extra time to move between classes and use of the elevator on days with a heavy backpack."],
      notesHint: "Minutes, frequency, location, areas, and how services will be delivered.",
    },
    {
      id: "goal", title: "Gross Motor Goal", place: "after", when: { concerns: true },
      blocks: [
        { kind: "para", id: "goal", text: "By [[month::month]] [[year::year]], {{student}} will [[the skill, the condition, and the level of support]] in [[data points::dataDates]] data collections, as measured by [[how progress is measured]]." },
        { kind: "subheading", id: "h-objectives", text: "Objectives" },
        { kind: "numbered", id: "objective1", text: "[[objective]]" },
        { kind: "numbered", id: "objective2", text: "[[objective]]" },
        { kind: "numbered", id: "objective3", text: "[[objective]]" },
      ],
      examples: ["By May of next school year, [STUDENT] will go up and down a full flight of stairs alternating feet with one hand on the rail and no adult help in 4 out of 5 data collections, as measured by physical therapist observation. Objectives: he will go up the stairs alternating with the rail; he will come down the stairs alternating with the rail; he will do both while carrying his backpack."],
      notesHint: "The goal area, the target skill, the level of support, and three steps toward it.",
    },
    {
      id: "ending", title: "Ending", place: "after", when: { reportType: "annual", concerns: false },
      blocks: [
        { kind: "para", id: "ending", text: "{{student}} has met {{their}} gross motor goals and moves through the school safely and with {{their}} peers. Physical therapy is no longer needed for {{them}} to benefit from {{their}} special education program. [[Any suggestions for staff going forward]]. With the team's agreement, physical therapy will end." },
        { kind: "para", id: "closing", text: "Physical therapy in the school setting is a related service: it supports the student's access to the school building, the curriculum and school activities. Please contact the physical therapist with any questions about this report." },
      ],
      examples: ["[STUDENT] has met her gross motor goals and moves through the school safely and with her peers. Physical therapy is no longer needed for her to benefit from her special education program. Staff can continue to remind her to use the rail on the bus steps. With the team's agreement, physical therapy will end."],
      notesHint: "Which goals were met and any suggestions for staff.",
    },
  ];
}

export function ptPack(): TemplatePack {
  const base = blankPack("Physical therapy");
  return {
    version: 1,
    titles: { evaluation: "Physical Therapy Evaluation Report", annual: "Physical Therapy Annual Review" },
    assessments: [teacherChecklist(), grossMotorScreen(), standardized(), observation(), schoolAccess()],
    sections: aroundSections(),
    lists: {
      ...base.lists,
      completedBy: { options: ["classroom teacher", "general education teacher", "special education teacher", "physical education teacher", "classroom aide"] },
      skillAreas: { multi: true, options: ["gross motor skills", "balance", "strength and endurance", "motor planning", "mobility in the school building", "stair navigation", "physical education and recess participation", "posture and positioning", "transfers", "use of mobility equipment"] },
      mobility: { options: ["walks independently", "walks independently but more slowly than peers", "walks with supervision", "walks with a walker", "walks with crutches or canes", "uses a manual wheelchair", "uses a power wheelchair", "uses a wheelchair for long distances only"] },
      equipment: { multi: true, options: ["ankle-foot orthoses", "a walker", "a manual wheelchair", "a power wheelchair", "a gait trainer", "a stander", "adapted seating", "no equipment"] },
      scoreDescriptor: { options: ["Very Low", "Low", "Below Average", "Low Average", "Average", "High Average", "Above Average", "High", "Very High"] },
      concernAreas: { multi: true, options: ["keeping up with peers in the hallway", "stairs", "getting on and off the floor", "sitting posture at a desk", "playground equipment", "running and jumping in physical education", "falls or near falls", "carrying materials", "bus steps"] },
      supports: { multi: true, options: ["adapted physical education", "a mobility device", "orthotics", "adapted seating", "a modified transition schedule", "staff training on transfers", "a second set of books"] },
      accommodations: { multi: true, options: ["extra time to move between classes", "use of the elevator", "a seat near the door", "adapted physical education", "a peer helper for carrying materials", "rest breaks", "adapted seating", "a handrail reminder", "a second set of books"] },
    },
  };
}
